/**
 * 🌐 UberFix MCP Server (Model Context Protocol)
 *
 * نقطة دخول MCP موحّدة لكل عمليات بوابة الصيانة (maintenance-gateway)
 * وبوابة البوتات (bot-gateway) — تُستخدم كدليل تنفيذ موحّد لأي عميل
 * MCP (Claude Desktop / Cursor / Rasa / IDEs / Custom Agents) للتعامل
 * مع طلبات الصيانة.
 *
 * Public URL (بعد نشر Edge Function):
 *   https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp
 *
 * Custom Domain (مع reverse proxy في nginx):
 *   https://uberfix.alazab.com/mcp
 *
 * Authentication:
 *   - عبر header: `x-api-key: <BOT_API_KEY>`  (نفس مفاتيح bot-gateway)
 *   - أو تمريرها داخل metadata.api_key لكل أداة (للاختبار فقط)
 *
 * Transport: Streamable HTTP (MCP spec) — متوافق مع Claude Desktop و Cursor.
 */

import { Hono } from 'npm:hono@4.6.14';
import { McpServer, StreamableHttpTransport } from 'npm:mcp-lite@0.10.0';

const GATEWAY_BASE = 'https://zrrffsjbfkphridqyais.supabase.co/functions/v1';
const MAINTENANCE_GATEWAY_URL = `${GATEWAY_BASE}/maintenance-gateway`;
const BOT_GATEWAY_URL = `${GATEWAY_BASE}/bot-gateway`;

// ─── CORS ────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, mcp-session-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
  'Access-Control-Expose-Headers': 'mcp-session-id',
};

// ─── Helpers ─────────────────────────────────────────────────────────
function getApiKey(req: Request, fallback?: string): string {
  return (
    req.headers.get('x-api-key') ||
    req.headers.get('X-API-Key') ||
    fallback ||
    Deno.env.get('UF_DEFAULT_BOT_API_KEY') ||
    ''
  );
}

async function callGateway(url: string, apiKey: string, body: unknown) {
  if (!apiKey) {
    return { ok: false, status: 401, json: { error: 'Missing x-api-key header' } };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

function mcpResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

// ─── MCP Server ──────────────────────────────────────────────────────
const mcp = new McpServer({
  name: 'uberfix-maintenance-mcp',
  version: '1.0.0',
});

// We attach the current Request via async-local hack: mcp-lite exposes request
// context inside handler args (ctx). We'll read x-api-key from ctx.request.

// 1) create_request
mcp.tool({
  name: 'create_maintenance_request',
  description:
    'إنشاء طلب صيانة جديد عبر بوابة UberFix الموحّدة. يُعيد request_id ورقم تتبع UF/MR/YYMMDD/SEQ ورابط التتبع.',
  inputSchema: {
    type: 'object',
    properties: {
      client_name: { type: 'string', description: 'اسم العميل' },
      client_phone: { type: 'string', description: 'هاتف العميل (مصري +20)' },
      service_type: { type: 'string', description: 'نوع الخدمة: electrical|plumbing|ac|general...' },
      description: { type: 'string', description: 'وصف المشكلة' },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      location: { type: 'string' },
      channel: { type: 'string', default: 'api' },
      api_key: { type: 'string', description: 'اختياري - x-api-key (يُفضّل استخدام Header)' },
    },
    required: ['client_name', 'client_phone', 'service_type', 'description'],
  },
  handler: async (args: any, ctx: any) => {
    const apiKey = getApiKey(ctx?.request as Request, args.api_key);
    const { api_key: _omit, ...body } = args;
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, apiKey, {
      channel: body.channel ?? 'api',
      ...body,
    });
    return mcpResult(r.json);
  },
});

// 2) transition_stage
mcp.tool({
  name: 'transition_request_stage',
  description: 'نقل طلب صيانة من مرحلة إلى أخرى (assigned, in_progress, completed, billed, paid, handover_to_admin, closed...)',
  inputSchema: {
    type: 'object',
    properties: {
      request_id: { type: 'string' },
      request_number: { type: 'string' },
      to_stage: { type: 'string' },
      reason: { type: 'string' },
      client_name: { type: 'string', default: 'mcp' },
      api_key: { type: 'string' },
    },
    required: ['to_stage'],
  },
  handler: async (args: any, ctx: any) => {
    const apiKey = getApiKey(ctx?.request as Request, args.api_key);
    const { api_key: _o, ...rest } = args;
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, apiKey, {
      channel: 'api',
      action: 'transition_stage',
      client_name: rest.client_name ?? 'mcp',
      ...rest,
    });
    return mcpResult(r.json);
  },
});

// 3) get_status
mcp.tool({
  name: 'get_request_status',
  description: 'الاستعلام عن حالة طلب صيانة عبر request_id أو request_number.',
  inputSchema: {
    type: 'object',
    properties: {
      request_id: { type: 'string' },
      request_number: { type: 'string' },
      api_key: { type: 'string' },
    },
  },
  handler: async (args: any, ctx: any) => {
    const apiKey = getApiKey(ctx?.request as Request, args.api_key);
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, apiKey, {
      channel: 'api',
      action: 'get_status',
      client_name: 'mcp',
      request_id: args.request_id,
      request_number: args.request_number,
    });
    return mcpResult(r.json);
  },
});

// 4) cancel_request
mcp.tool({
  name: 'cancel_request',
  description: 'إلغاء طلب صيانة مع سبب.',
  inputSchema: {
    type: 'object',
    properties: {
      request_id: { type: 'string' },
      request_number: { type: 'string' },
      reason: { type: 'string' },
      api_key: { type: 'string' },
    },
    required: ['reason'],
  },
  handler: async (args: any, ctx: any) => {
    const apiKey = getApiKey(ctx?.request as Request, args.api_key);
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, apiKey, {
      channel: 'api',
      action: 'cancel',
      client_name: 'mcp',
      request_id: args.request_id,
      request_number: args.request_number,
      reason: args.reason,
    });
    return mcpResult(r.json);
  },
});

// 5) add_note
mcp.tool({
  name: 'add_request_note',
  description: 'إضافة ملاحظة على طلب صيانة قائم.',
  inputSchema: {
    type: 'object',
    properties: {
      request_id: { type: 'string' },
      request_number: { type: 'string' },
      note: { type: 'string' },
      api_key: { type: 'string' },
    },
    required: ['note'],
  },
  handler: async (args: any, ctx: any) => {
    const apiKey = getApiKey(ctx?.request as Request, args.api_key);
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, apiKey, {
      channel: 'api',
      action: 'add_note',
      client_name: 'mcp',
      request_id: args.request_id,
      request_number: args.request_number,
      note: args.note,
    });
    return mcpResult(r.json);
  },
});

// ─── Bot-Gateway tools (read-only catalog/lookup) ────────────────────
function botTool(name: string, description: string, schema: any, action: string) {
  mcp.tool({
    name,
    description,
    inputSchema: schema,
    handler: async (args: any, ctx: any) => {
      const apiKey = getApiKey(ctx?.request as Request, args.api_key);
      const { api_key: _o, ...payload } = args;
      const r = await callGateway(BOT_GATEWAY_URL, apiKey, {
        action,
        payload,
        metadata: { source: 'mcp' },
      });
      return mcpResult(r.json);
    },
  });
}

botTool('list_services', 'قائمة الخدمات المتاحة في الكتالوج.', {
  type: 'object',
  properties: { api_key: { type: 'string' } },
}, 'list_services');

botTool('list_technicians', 'قائمة الفنيين المتاحين (يمكن التصفية بالتخصص).', {
  type: 'object',
  properties: {
    specialization: { type: 'string' },
    limit: { type: 'number', default: 10 },
    api_key: { type: 'string' },
  },
}, 'list_technicians');

botTool('list_categories', 'تصنيفات الصيانة.', {
  type: 'object',
  properties: { api_key: { type: 'string' } },
}, 'list_categories');

botTool('get_branches', 'كل الفروع.', {
  type: 'object',
  properties: { api_key: { type: 'string' } },
}, 'get_branches');

botTool('find_nearest_branch', 'أقرب فرع جغرافياً.', {
  type: 'object',
  properties: {
    lat: { type: 'number' },
    lng: { type: 'number' },
    api_key: { type: 'string' },
  },
  required: ['lat', 'lng'],
}, 'find_nearest_branch');

botTool('get_quote', 'طلب عرض سعر.', {
  type: 'object',
  properties: {
    service_type: { type: 'string' },
    description: { type: 'string' },
    location: { type: 'string' },
    client_name: { type: 'string' },
    client_phone: { type: 'string' },
    api_key: { type: 'string' },
  },
  required: ['service_type', 'description', 'client_name', 'client_phone'],
}, 'get_quote');

botTool('check_status_quick', 'استعلام سريع برقم الطلب أو الهاتف.', {
  type: 'object',
  properties: {
    search_term: { type: 'string' },
    search_type: { type: 'string', enum: ['request_number', 'phone', 'request_id'] },
    api_key: { type: 'string' },
  },
  required: ['search_term'],
}, 'check_status');

// ─── Server-info resource ────────────────────────────────────────────
mcp.tool({
  name: 'server_info',
  description: 'معلومات عن خادم MCP والبوابات المتاحة.',
  inputSchema: { type: 'object', properties: {} },
  handler: async () => mcpResult({
    name: 'uberfix-maintenance-mcp',
    version: '1.0.0',
    public_url: 'https://uberfix.alazab.com/mcp',
    direct_url: `${GATEWAY_BASE}/mcp`,
    auth: 'x-api-key header (BOT_API_KEY)',
    upstream: {
      maintenance_gateway: MAINTENANCE_GATEWAY_URL,
      bot_gateway: BOT_GATEWAY_URL,
    },
    tools: [
      'create_maintenance_request', 'transition_request_stage', 'get_request_status',
      'cancel_request', 'add_request_note', 'list_services', 'list_technicians',
      'list_categories', 'get_branches', 'find_nearest_branch', 'get_quote',
      'check_status_quick',
    ],
    docs: 'https://uberfix.alazab.com/api-documentation',
  }),
});

// ─── HTTP Transport (Hono) ───────────────────────────────────────────
const app = new Hono();
const transport = new StreamableHttpTransport();

app.options('/*', (c) => new Response('ok', { headers: corsHeaders }));

app.get('/', (c) =>
  c.json({
    name: 'uberfix-maintenance-mcp',
    version: '1.0.0',
    endpoint: 'POST this URL with MCP JSON-RPC payloads',
    public_url: 'https://uberfix.alazab.com/mcp',
    docs: 'https://uberfix.alazab.com/api-documentation',
  }, 200, corsHeaders),
);

app.all('/*', async (c) => {
  try {
    const res = await transport.handleRequest(c.req.raw, mcp);
    // Merge CORS headers into response
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

Deno.serve(app.fetch);