/**
 * 🌐 UberFix UNIFIED API GATEWAY
 *
 * نقطة الدخول الوحيدة لكل النظام (Mobile App, Web Dashboard, AzSTT, Bots, External APIs).
 * مبنية وفق معمارية: Clients → Unified Gateway → MCP Core → Business Engine → DB.
 *
 * Endpoints (نفس الـ Function، توجيه داخلي بالمسار):
 *   POST   /                      → REST (يقبل تنسيق {action,payload} أو {channel,action,...})
 *   POST   /rest                  → نفس /
 *   POST   /mcp                   → MCP Streamable HTTP (initialize, tools/list, tools/call)
 *   GET    /                      → ميتاداتا الخادم
 *   GET    /health                → فحص الحياة
 *
 * المصادقة:
 *   - x-api-key : للبوتات والتكاملات الخارجية (mapped to api_consumers)
 *   - Authorization: Bearer <JWT> : للموبايل والويب (Supabase Auth)
 *
 * كل طلب يُسجَّل في api_gateway_logs.
 */

import { Hono } from 'npm:hono@4.6.14';
import { McpServer, StreamableHttpTransport } from 'npm:mcp-lite@0.10.0';
import { z } from 'npm:zod@4.4.3';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { handleMaintenance } from './engine/maintenance.ts';
import { handleBot } from './engine/bot.ts';
import {
  handleAiHealth, handleAiAgent, handleAiChat, handleAiStream,
  handleAiClassify, handleAiSummarize,
} from './engine/ai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://zrrffsjbfkphridqyais.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const INTERNAL_BASE = `${SUPABASE_URL}/functions/v1`;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Per-request context ─────────────────────────────────────────────
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

/**
 * قناة internal هي قناة لوحة التحكم وليست قناة عامة.
 * نتحقق هنا من JWT قبل أن يصل الطلب إلى محرك الصيانة الذي يعمل بصلاحية service role.
 * كما نثبت الشركة والفرع من هوية المستخدم والعقار، ولا نثق في company_id/branch_id القادمة من العميل.
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

// ─── Helper: invoke an in-process engine handler ─────────────────────
async function invokeEngine(
  engine: 'maintenance' | 'bot',
  body: unknown,
): Promise<{ status: number; body: any }> {
  const { apiKey, authHeader } = ctx();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  if (authHeader) headers['Authorization'] = authHeader;

  const req = new Request(`${INTERNAL_BASE}/gateway`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const res = engine === 'maintenance' ? await handleMaintenance(req) : await handleBot(req);
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; }
  catch { return { status: res.status, body: { raw: text } }; }
}

const asText = (payload: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
});

// ─── MCP CORE: Tool Handler + Context Manager + Resource Registry ────
const mcp = new McpServer({
  name: 'uberfix-unified-gateway',
  version: '2.0.0',
  schemaAdapter: (s) => z.toJSONSchema(s as z.ZodType),
});

// — Business Engine: Maintenance Lifecycle —
mcp.tool('create_maintenance_request', {
  description: 'إنشاء طلب صيانة جديد (Ticket Creation).',
  inputSchema: z.object({
    client_name: z.string(),
    client_phone: z.string(),
    service_type: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    location: z.string().optional(),
    channel: z.string().default('api').optional(),
  }),
  handler: async (args) => {
    const r = await invokeEngine('maintenance', { channel: args.channel ?? 'api', ...args });
    return asText(r.body);
  },
});

mcp.tool('transition_request_stage', {
  description: 'نقل طلب صيانة بين المراحل (Dispatch / Status Update).',
  inputSchema: z.object({
    request_id: z.string().optional(),
    request_number: z.string().optional(),
    to_stage: z.string(),
    reason: z.string().optional(),
  }),
  handler: async (args) => {
    const r = await invokeEngine('maintenance', {
      channel: 'api', action: 'transition_stage', client_name: 'mcp', ...args,
    });
    return asText(r.body);
  },
});

mcp.tool('get_request_status', {
  description: 'استعلام عن حالة طلب (Status Update).',
  inputSchema: z.object({ request_id: z.string().optional(), request_number: z.string().optional() }),
  handler: async (args) => {
    const r = await invokeEngine('maintenance', {
      channel: 'api', action: 'get_status', client_name: 'mcp', ...args,
    });
    return asText(r.body);
  },
});

mcp.tool('cancel_request', {
  description: 'إلغاء طلب صيانة.',
  inputSchema: z.object({
    request_id: z.string().optional(),
    request_number: z.string().optional(),
    reason: z.string(),
  }),
  handler: async (args) => {
    const r = await invokeEngine('maintenance', {
      channel: 'api', action: 'cancel', client_name: 'mcp', ...args,
    });
    return asText(r.body);
  },
});

mcp.tool('add_request_note', {
  description: 'إضافة ملاحظة على طلب.',
  inputSchema: z.object({
    request_id: z.string().optional(),
    request_number: z.string().optional(),
    note: z.string(),
  }),
  handler: async (args) => {
    const r = await invokeEngine('maintenance', {
      channel: 'api', action: 'add_note', client_name: 'mcp', ...args,
    });
    return asText(r.body);
  },
});

// — Resource Registry: Catalog / Branches / Technicians —
const botTool = (name: string, desc: string, schema: z.ZodTypeAny, action: string) => {
  mcp.tool(name, {
    description: desc,
    inputSchema: schema,
    handler: async (args) => {
      const r = await invokeEngine('bot', {
        action, payload: args, metadata: { source: 'mcp-core' },
      });
      return asText(r.body);
    },
  });
};

botTool('list_services', 'كتالوج الخدمات (Resource Registry).', z.object({}), 'list_services');
botTool('list_categories', 'تصنيفات الصيانة.', z.object({}), 'list_categories');
botTool('list_technicians', 'الفنيين المتاحين.',
  z.object({ specialization: z.string().optional(), limit: z.number().optional() }), 'list_technicians');
botTool('get_branches', 'كل الفروع.', z.object({}), 'get_branches');
botTool('find_nearest_branch', 'أقرب فرع جغرافياً.',
  z.object({ lat: z.number(), lng: z.number() }), 'find_nearest_branch');
botTool('get_quote', 'طلب عرض سعر.',
  z.object({
    service_type: z.string(), description: z.string(), location: z.string().optional(),
    client_name: z.string(), client_phone: z.string(),
  }), 'get_quote');
botTool('check_status_quick', 'استعلام سريع.',
  z.object({
    search_term: z.string(),
    search_type: z.enum(['request_number', 'phone', 'request_id']).optional(),
  }), 'check_status');

// — Server Info —
mcp.tool('server_info', {
  description: 'معلومات البوابة الموحّدة.',
  inputSchema: z.object({}),
  handler: async () => asText({
    name: 'uberfix-unified-gateway',
    version: '2.0.0',
    architecture: 'Unified Gateway → MCP Core → Business Engine → DB',
    endpoints: {
      rest: `${INTERNAL_BASE}/gateway`,
      mcp: `${INTERNAL_BASE}/gateway/mcp`,
    },
    auth: ['x-api-key', 'Authorization: Bearer <JWT>'],
  }),
});

// ─── HTTP transport ──────────────────────────────────────────────────
const transport = new StreamableHttpTransport();
const mcpHandler = transport.bind(mcp);

// ─── App ─────────────────────────────────────────────────────────────
// Supabase invokes us at the path `/gateway/...`, so mount routes under that prefix.
const app = new Hono().basePath('/gateway');

app.options('/*', () => new Response('ok', { headers: corsHeaders }));

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }, 200, corsHeaders));

app.get('/', (c) => c.json({
  name: 'uberfix-unified-gateway',
  version: '2.0.0',
  description: 'البوابة الموحّدة لنظام UberFix — نقطة الدخول الوحيدة لكل القنوات.',
  endpoints: {
    'POST /': 'REST — يقبل {action,payload} أو {channel,action,...}',
    'POST /mcp': 'MCP Streamable HTTP (initialize, tools/list, tools/call)',
    'GET /health': 'فحص الحياة',
  },
  auth: ['x-api-key', 'Authorization: Bearer <JWT>'],
  docs: 'https://uberfix.alazab.com/api-documentation',
}, 200, corsHeaders));

// ─── REST router ─────────────────────────────────────────────────────
const handleRestRequest = async (c: any) => {
  const parsed = await c.req.json().catch(() => ({}));
  const body: Record<string, unknown> =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};

  const authError = await enforceInternalRequestAuth(body);
  if (authError) return authError;

  const isMaintenance = typeof body.channel === 'string';
  const r = await invokeEngine(isMaintenance ? 'maintenance' : 'bot', body);
  return c.json(r.body, r.status as 200, corsHeaders);
};

app.post('/', handleRestRequest);
app.post('/rest', handleRestRequest);

// ─── MCP router ──────────────────────────────────────────────────────
app.all('/mcp', async (c) => {
  const res = await mcpHandler(c.req.raw);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});
app.all('/mcp/*', async (c) => {
  const res = await mcpHandler(c.req.raw);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

// ─── AI Layer (Azure OpenAI) ─────────────────────────────────────────
app.get('/ai/health',      (c) => handleAiHealth(c.req.raw));
app.post('/ai/agent',      (c) => handleAiAgent(c.req.raw));
app.post('/ai/chat',       (c) => handleAiChat(c.req.raw));
app.post('/ai/stream',     (c) => handleAiStream(c.req.raw));
app.post('/ai/classify',   (c) => handleAiClassify(c.req.raw));
app.post('/ai/summarize',  (c) => handleAiSummarize(c.req.raw));

// ─── Server entry ────────────────────────────────────────────────────
Deno.serve((req) => {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || '';
  const authHeader = req.headers.get('Authorization') || '';
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  return reqStorage.run({ apiKey, authHeader, requestId }, () => app.fetch(req));
});
