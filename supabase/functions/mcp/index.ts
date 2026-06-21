/**
 * 🌐 UberFix MCP Server (Model Context Protocol)
 *
 * Streamable-HTTP MCP server exposing maintenance-gateway + bot-gateway
 * actions as MCP tools. Acts as a unified execution manual for maintenance
 * requests for any MCP client (Claude Desktop, Cursor, Rasa, n8n MCP, etc.).
 *
 * Public URL (Supabase):  https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp
 * Custom Domain (nginx):  https://uberfix.alazab.com/mcp
 *
 * Auth: forward `x-api-key: <BOT_API_KEY>` header — same keys used by bot-gateway.
 */

import { Hono } from 'npm:hono@4.6.14';
import { McpServer, StreamableHttpTransport } from 'npm:mcp-lite@0.10.0';
import { z } from 'npm:zod@4.4.3';
import { AsyncLocalStorage } from 'node:async_hooks';

const GATEWAY_BASE = 'https://zrrffsjbfkphridqyais.supabase.co/functions/v1';
const MAINTENANCE_GATEWAY_URL = `${GATEWAY_BASE}/maintenance-gateway`;
const BOT_GATEWAY_URL = `${GATEWAY_BASE}/bot-gateway`;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, mcp-session-id, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
  'Access-Control-Expose-Headers': 'mcp-session-id',
};

// ─── Per-request context (carries x-api-key into tool handlers) ──────
type ReqCtx = { apiKey: string };
const reqStorage = new AsyncLocalStorage<ReqCtx>();
const currentApiKey = (): string => reqStorage.getStore()?.apiKey ?? '';

// ─── Gateway helper ──────────────────────────────────────────────────
async function callGateway(url: string, apiKey: string, body: unknown) {
  if (!apiKey) {
    return { error: 'Missing x-api-key header (provide BOT_API_KEY)' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { status: res.status, raw: text }; }
}

const asText = (payload: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
});

// ─── MCP server ──────────────────────────────────────────────────────
const mcp = new McpServer({
  name: 'uberfix-maintenance-mcp',
  version: '1.0.0',
  schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
});

// 1) create_maintenance_request
mcp.tool('create_maintenance_request', {
  description:
    'إنشاء طلب صيانة جديد عبر بوابة UberFix الموحّدة. يُعيد request_id ورقم تتبع UF/MR/YYMMDD/SEQ ورابط التتبع.',
  inputSchema: z.object({
    client_name: z.string().describe('اسم العميل'),
    client_phone: z.string().describe('هاتف العميل (مصري، صيغة دولية مفضّلة)'),
    service_type: z.string().describe('نوع الخدمة: electrical | plumbing | ac | general'),
    description: z.string().describe('وصف المشكلة'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    location: z.string().optional(),
    channel: z.string().default('api').optional(),
  }),
  handler: async (args) => {
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, currentApiKey(), {
      channel: args.channel ?? 'api',
      ...args,
    });
    return asText(r);
  },
});

// 2) transition_request_stage
mcp.tool('transition_request_stage', {
  description:
    'نقل طلب صيانة بين المراحل الـ16 (assigned, scheduled, in_progress, inspection, waiting_parts, on_hold, completed, billed, paid, handover_to_admin, closed, cancelled).',
  inputSchema: z.object({
    request_id: z.string().optional(),
    request_number: z.string().optional(),
    to_stage: z.string(),
    reason: z.string().optional(),
    client_name: z.string().default('mcp').optional(),
  }),
  handler: async (args) => {
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, currentApiKey(), {
      channel: 'api',
      action: 'transition_stage',
      client_name: args.client_name ?? 'mcp',
      ...args,
    });
    return asText(r);
  },
});

// 3) get_request_status
mcp.tool('get_request_status', {
  description: 'الاستعلام عن حالة طلب صيانة عبر request_id أو request_number.',
  inputSchema: z.object({
    request_id: z.string().optional(),
    request_number: z.string().optional(),
  }),
  handler: async (args) => {
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, currentApiKey(), {
      channel: 'api',
      action: 'get_status',
      client_name: 'mcp',
      ...args,
    });
    return asText(r);
  },
});

// 4) cancel_request
mcp.tool('cancel_request', {
  description: 'إلغاء طلب صيانة قائم مع ذكر السبب.',
  inputSchema: z.object({
    request_id: z.string().optional(),
    request_number: z.string().optional(),
    reason: z.string(),
  }),
  handler: async (args) => {
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, currentApiKey(), {
      channel: 'api',
      action: 'cancel',
      client_name: 'mcp',
      ...args,
    });
    return asText(r);
  },
});

// 5) add_request_note
mcp.tool('add_request_note', {
  description: 'إضافة ملاحظة (note) على طلب صيانة قائم.',
  inputSchema: z.object({
    request_id: z.string().optional(),
    request_number: z.string().optional(),
    note: z.string(),
  }),
  handler: async (args) => {
    const r = await callGateway(MAINTENANCE_GATEWAY_URL, currentApiKey(), {
      channel: 'api',
      action: 'add_note',
      client_name: 'mcp',
      ...args,
    });
    return asText(r);
  },
});

// ─── Bot-gateway catalog / lookup tools ──────────────────────────────
const botTool = (
  name: string,
  description: string,
  inputSchema: z.ZodTypeAny,
  action: string,
) => {
  mcp.tool(name, {
    description,
    inputSchema,
    handler: async (args) => {
      const r = await callGateway(BOT_GATEWAY_URL, currentApiKey(), {
        action,
        payload: args,
        metadata: { source: 'mcp' },
      });
      return asText(r);
    },
  });
};

botTool('list_services', 'قائمة الخدمات المتاحة في الكتالوج.', z.object({}), 'list_services');
botTool('list_technicians', 'قائمة الفنيين المتاحين (يمكن التصفية بالتخصص).',
  z.object({ specialization: z.string().optional(), limit: z.number().optional() }),
  'list_technicians');
botTool('list_categories', 'تصنيفات الصيانة.', z.object({}), 'list_categories');
botTool('get_branches', 'كل الفروع.', z.object({}), 'get_branches');
botTool('find_nearest_branch', 'أقرب فرع جغرافياً.',
  z.object({ lat: z.number(), lng: z.number() }), 'find_nearest_branch');
botTool('get_quote', 'طلب عرض سعر.',
  z.object({
    service_type: z.string(), description: z.string(), location: z.string().optional(),
    client_name: z.string(), client_phone: z.string(),
  }), 'get_quote');
botTool('check_status_quick', 'استعلام سريع برقم الطلب أو الهاتف.',
  z.object({
    search_term: z.string(),
    search_type: z.enum(['request_number', 'phone', 'request_id']).optional(),
  }), 'check_status');

// server_info — no upstream call
mcp.tool('server_info', {
  description: 'معلومات عن خادم MCP والبوابات المتاحة.',
  inputSchema: z.object({}),
  handler: async () => asText({
    name: 'uberfix-maintenance-mcp',
    version: '1.0.0',
    public_url: 'https://uberfix.alazab.com/mcp',
    direct_url: `${GATEWAY_BASE}/mcp`,
    auth: 'x-api-key header (BOT_API_KEY)',
    upstream: {
      maintenance_gateway: MAINTENANCE_GATEWAY_URL,
      bot_gateway: BOT_GATEWAY_URL,
    },
    docs: 'https://uberfix.alazab.com/api-documentation',
  }),
});

// ─── HTTP transport ──────────────────────────────────────────────────
const transport = new StreamableHttpTransport();
const mcpHandler = transport.bind(mcp);

const app = new Hono();

app.options('/*', () => new Response('ok', { headers: corsHeaders }));

app.get('/', (c) =>
  c.json({
    name: 'uberfix-maintenance-mcp',
    version: '1.0.0',
    note: 'POST MCP JSON-RPC payloads to this URL. Include `x-api-key` header.',
    public_url: 'https://uberfix.alazab.com/mcp',
    docs: 'https://uberfix.alazab.com/api-documentation',
  }, 200, corsHeaders),
);

app.all('/*', async (c) => {
  const apiKey =
    c.req.header('x-api-key') ||
    c.req.header('X-API-Key') ||
    Deno.env.get('UF_DEFAULT_BOT_API_KEY') ||
    '';

  const res = await reqStorage.run({ apiKey }, () => mcpHandler(c.req.raw));
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

Deno.serve(app.fetch);