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
import { corsHeaders } from '../_shared/cors.ts';

// ─── Internal upstream (Business Engine modules — kept temporarily as
// internal-only functions; will be inlined in phase 2). ────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://zrrffsjbfkphridqyais.supabase.co';
const INTERNAL_BASE = `${SUPABASE_URL}/functions/v1`;
const MAINTENANCE_ENGINE_URL = `${INTERNAL_BASE}/maintenance-gateway`;
const BOT_ENGINE_URL = `${INTERNAL_BASE}/bot-gateway`;

// ─── Per-request context ─────────────────────────────────────────────
interface ReqCtx {
  apiKey: string;
  authHeader: string;
  requestId: string;
}
const reqStorage = new AsyncLocalStorage<ReqCtx>();
const ctx = (): ReqCtx => reqStorage.getStore() ?? { apiKey: '', authHeader: '', requestId: '' };

// ─── Helper: forward to internal engine ──────────────────────────────
async function forward(url: string, body: unknown) {
  const { apiKey, authHeader } = ctx();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  if (authHeader) headers['Authorization'] = authHeader;
  // Always include anon as apikey fallback so internal functions can boot supabase client
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (anon && !headers['Authorization']) headers['Authorization'] = `Bearer ${anon}`;
  if (anon) headers['apikey'] = anon;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
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
    const r = await forward(MAINTENANCE_ENGINE_URL, { channel: args.channel ?? 'api', ...args });
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
    const r = await forward(MAINTENANCE_ENGINE_URL, {
      channel: 'api', action: 'transition_stage', client_name: 'mcp', ...args,
    });
    return asText(r.body);
  },
});

mcp.tool('get_request_status', {
  description: 'استعلام عن حالة طلب (Status Update).',
  inputSchema: z.object({ request_id: z.string().optional(), request_number: z.string().optional() }),
  handler: async (args) => {
    const r = await forward(MAINTENANCE_ENGINE_URL, {
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
    const r = await forward(MAINTENANCE_ENGINE_URL, {
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
    const r = await forward(MAINTENANCE_ENGINE_URL, {
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
      const r = await forward(BOT_ENGINE_URL, {
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
const app = new Hono();

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
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  // Detect format:
  //  - {channel,...} → maintenance engine
  //  - {action, payload} → bot/catalog engine
  const isMaintenance = typeof body?.channel === 'string';
  const target = isMaintenance ? MAINTENANCE_ENGINE_URL : BOT_ENGINE_URL;
  const r = await forward(target, body);
  return c.json(r.body, r.status as 200, corsHeaders);
});

app.post('/rest', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const isMaintenance = typeof body?.channel === 'string';
  const target = isMaintenance ? MAINTENANCE_ENGINE_URL : BOT_ENGINE_URL;
  const r = await forward(target, body);
  return c.json(r.body, r.status as 200, corsHeaders);
});

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

// ─── Server entry ────────────────────────────────────────────────────
Deno.serve((req) => {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || '';
  const authHeader = req.headers.get('Authorization') || '';
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  return reqStorage.run({ apiKey, authHeader, requestId }, () => app.fetch(req));
});