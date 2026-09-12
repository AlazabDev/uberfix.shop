/**
 * UberFix REST API — الباب الرسمي للتطبيقات والتكاملات والاختبارات.
 *
 *   POST /functions/v1/api          طلبات الصيانة {channel,...} أو {action,payload}
 *   GET  /functions/v1/api          وصف الباب
 *   GET  /functions/v1/api/health   فحص الحياة
 *   POST /functions/v1/api/ai/*     مسارات الذكاء الاصطناعي
 *
 * وكلاء الذكاء الاصطناعي يستخدمون /functions/v1/mcp بدلاً من هذا الباب.
 * منطق الأعمال يعيش في _shared/core ويشترك فيه البابان.
 */
import { Hono } from 'npm:hono@4.6.14';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { handleMaintenance } from '../_shared/core/maintenance.ts';
import { handleBot } from '../_shared/core/bot.ts';
import {
  handleAiHealth,
  handleAiAgent,
  handleAiChat,
  handleAiStream,
  handleAiClassify,
  handleAiSummarize,
} from '../_shared/core/ai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const INTERNAL_BASE = `${SUPABASE_URL}/functions/v1`;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ReqCtx {
  apiKey: string;
  authHeader: string;
  requestId: string;
}

const reqStorage = new AsyncLocalStorage<ReqCtx>();
const ctx = (): ReqCtx => reqStorage.getStore() ?? { apiKey: '', authHeader: '', requestId: '' };

function jsonError(status: number, error: string, messageAr: string): Response {
  return new Response(JSON.stringify({ error, message_ar: messageAr }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function responseToResult(res: Response): Promise<{ status: number; body: any }> {
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: { raw: text } };
  }
}

/**
 * قناة internal خاصة بلوحة التحكم.
 * يتم تثبيت الشركة والفرع من هوية المستخدم والعقار، ولا نثق في قيم العميل.
 */
async function enforceInternalRequestAuth(body: Record<string, unknown>): Promise<Response | null> {
  if (body.channel !== 'internal') return null;

  const authHeader = ctx().authHeader;
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonError(401, 'Authentication required', 'يجب تسجيل الدخول لإنشاء طلب داخلي');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return jsonError(401, 'Authentication required', 'جلسة المستخدم غير صالحة');
  }

  // ارفض مفتاح anon/service المُرسَل كـ Bearer: قناة internal تتطلب جلسة مستخدم حقيقية.
  try {
    const claims = JSON.parse(atob(token.split('.')[1] ?? ''));
    if (claims?.role !== 'authenticated' || !claims?.sub) {
      return jsonError(401, 'User session required', 'يجب تسجيل الدخول بجلسة مستخدم لإنشاء طلب داخلي');
    }
  } catch {
    return jsonError(401, 'Invalid session token', 'جلسة المستخدم غير صالحة');
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) {
    return jsonError(401, 'Invalid or expired session', 'جلسة المستخدم غير صالحة أو منتهية');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, company_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile?.company_id) {
    return jsonError(403, 'User company is not configured', 'لم يتم ربط المستخدم بشركة صالحة');
  }

  body.company_id = profile.company_id;
  delete body.branch_id;
  delete body.assigned_technician_id;

  const propertyId = typeof body.property_id === 'string' ? body.property_id.trim() : '';
  if (propertyId) {
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, company_id, branch_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError || !property) {
      return jsonError(404, 'Property not found', 'العقار المحدد غير موجود');
    }

    if (property.company_id !== profile.company_id) {
      return jsonError(403, 'Property belongs to another company', 'لا تملك صلاحية إنشاء طلب لهذا العقار');
    }

    body.branch_id = property.branch_id;
  }

  const existingMetadata =
    body.source_metadata &&
    typeof body.source_metadata === 'object' &&
    !Array.isArray(body.source_metadata)
      ? body.source_metadata as Record<string, unknown>
      : {};

  body.source_id = user.id;
  body.source_metadata = {
    ...existingMetadata,
    internal_user_id: user.id,
    internal_user_email: user.email ?? null,
    internal_role: profile.role ?? null,
    authenticated_at: new Date().toISOString(),
  };

  return null;
}

/** نقطة العبور الوحيدة إلى محركات الأعمال. */
async function invokeEngine(
  engine: 'maintenance' | 'bot',
  body: unknown,
): Promise<{ status: number; body: any }> {
  if (engine === 'maintenance' && body && typeof body === 'object' && !Array.isArray(body)) {
    const authError = await enforceInternalRequestAuth(body as Record<string, unknown>);
    if (authError) return responseToResult(authError);
  }

  const { apiKey, authHeader } = ctx();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  if (authHeader) headers.Authorization = authHeader;

  const req = new Request(`${INTERNAL_BASE}/api`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const res = engine === 'maintenance' ? await handleMaintenance(req) : await handleBot(req);
  return responseToResult(res);
}

const app = new Hono().basePath('/api');

app.options('/*', () => new Response('ok', { headers: corsHeaders }));
app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }, 200, corsHeaders));
app.get('/', (c) => c.json({
  name: 'uberfix-rest-api',
  version: '3.0.0',
  description: 'باب REST الرسمي لنظام UberFix — للتطبيقات والتكاملات والاختبارات.',
  endpoints: {
    'POST /': 'الصيانة {channel,...} أو الكتالوج والاستعلامات {action,payload}',
    'GET /health': 'فحص الحياة',
    'POST /ai/{agent,chat,stream,classify,summarize}': 'مسارات الذكاء الاصطناعي',
  },
  mcp_server: `${INTERNAL_BASE}/mcp`,
  auth: ['x-api-key', 'Authorization: Bearer <JWT>'],
  docs: 'https://uberfix.alazab.com/api-documentation',
}, 200, corsHeaders));

const handleRestRequest = async (c: any) => {
  const parsed = await c.req.json().catch(() => ({}));
  const body: Record<string, unknown> =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};

  // عميل MCP أرسل JSON-RPC إلى باب REST بالخطأ — وجّهه إلى خادم MCP.
  if (typeof body.jsonrpc === 'string') {
    return c.json({
      error: 'Wrong endpoint for MCP',
      message_ar: 'رسائل MCP تُرسل إلى /functions/v1/mcp وليس إلى باب REST.',
      mcp_server: `${INTERNAL_BASE}/mcp`,
    }, 400, corsHeaders);
  }

  const isMaintenance = typeof body.channel === 'string';
  const result = await invokeEngine(isMaintenance ? 'maintenance' : 'bot', body);
  return c.json(result.body, result.status as 200, corsHeaders);
};

app.post('/', handleRestRequest);
app.post('/rest', handleRestRequest);

app.get('/ai/health', (c) => handleAiHealth(c.req.raw));
app.post('/ai/agent', (c) => handleAiAgent(c.req.raw));
app.post('/ai/chat', (c) => handleAiChat(c.req.raw));
app.post('/ai/stream', (c) => handleAiStream(c.req.raw));
app.post('/ai/classify', (c) => handleAiClassify(c.req.raw));
app.post('/ai/summarize', (c) => handleAiSummarize(c.req.raw));

Deno.serve((req) => {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || '';
  const authHeader = req.headers.get('Authorization') || '';
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  return reqStorage.run({ apiKey, authHeader, requestId }, () => app.fetch(req));
});
