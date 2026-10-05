/**
 * Operational MCP (Streamable HTTP, JSON responses) for authenticated agents
 * such as the Azure AI Foundry agent. Auth: `x-api-key` header (api_consumers),
 * never a tool argument. Every tool delegates to the official bot engine so
 * RLS, ownership checks, workflow rules and audit stay in one place.
 */
import { handleBot } from '../_shared/core/bot.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type, mcp-session-id, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

type Prop = Record<string, unknown>;
const s = (description: string, extra: Prop = {}) => ({ type: 'string', description, ...extra });
const n = (description: string) => ({ type: 'number', description });

const SERVICE_TYPES = ['plumbing', 'electrical', 'ac', 'painting', 'carpentry', 'cleaning', 'general', 'appliance', 'pest_control', 'landscaping'];

const TOOLS: { name: string; action: string; description: string; readOnly: boolean; schema: Prop }[] = [
  {
    name: 'create_maintenance_request', action: 'create_request', readOnly: false,
    description: 'تسجيل طلب صيانة جديد بعد جمع الاسم والهاتف والعنوان ووصف المشكلة. يعيد رقم الطلب.',
    schema: {
      type: 'object',
      properties: {
        client_name: s('اسم العميل'), client_phone: s('هاتف العميل'), client_email: s('البريد (اختياري)'),
        location: s('العنوان الكامل'), service_type: s('نوع الخدمة', { enum: SERVICE_TYPES }),
        title: s('عنوان مختصر'), description: s('وصف المشكلة'),
        priority: s('الأولوية', { enum: ['low', 'medium', 'high'] }),
        latitude: n('خط العرض (اختياري)'), longitude: n('خط الطول (اختياري)'),
      },
      required: ['client_name', 'client_phone', 'location', 'title', 'description'],
    },
  },
  {
    name: 'check_request_status', action: 'check_status', readOnly: true,
    description: 'الاستعلام عن حالة طلب برقم الطلب أو رقم هاتف العميل.',
    schema: { type: 'object', properties: { search_term: s('رقم الطلب أو الهاتف'), search_type: s('نوع البحث', { enum: ['request_number', 'phone'] }) }, required: ['search_term'] },
  },
  {
    name: 'get_request_details', action: 'get_request_details', readOnly: true,
    description: 'تفاصيل طلب محدد (يتطلب هاتف العميل للتحقق من الملكية).',
    schema: { type: 'object', properties: { request_number: s('رقم الطلب'), request_id: s('معرّف الطلب'), client_phone: s('هاتف العميل') } },
  },
  {
    name: 'add_request_note', action: 'add_note', readOnly: false,
    description: 'إضافة ملاحظة من العميل إلى طلب قائم.',
    schema: { type: 'object', properties: { request_id: s('معرّف الطلب'), note: s('نص الملاحظة'), client_phone: s('هاتف العميل') }, required: ['request_id', 'note', 'client_phone'] },
  },
  {
    name: 'cancel_request', action: 'cancel_request', readOnly: false,
    description: 'إلغاء طلب بطلب صريح من العميل مع ذكر السبب.',
    schema: { type: 'object', properties: { request_id: s('معرّف الطلب'), client_phone: s('هاتف العميل'), reason: s('سبب الإلغاء') }, required: ['request_id', 'client_phone', 'reason'] },
  },
  {
    name: 'get_quote', action: 'get_quote', readOnly: true,
    description: 'تقدير مبدئي للتكلفة حسب نوع الخدمة والمساحة.',
    schema: { type: 'object', properties: { service_type: s('نوع الخدمة', { enum: SERVICE_TYPES }), description: s('الوصف'), location: s('الموقع'), area_sqm: n('المساحة م²') }, required: ['service_type'] },
  },
  { name: 'list_services', action: 'list_services', readOnly: true, description: 'قائمة الخدمات المتاحة.', schema: { type: 'object', properties: {} } },
  { name: 'list_categories', action: 'list_categories', readOnly: true, description: 'تصنيفات الصيانة.', schema: { type: 'object', properties: {} } },
  { name: 'list_branches', action: 'get_branches', readOnly: true, description: 'قائمة الفروع.', schema: { type: 'object', properties: {} } },
  {
    name: 'find_nearest_branch', action: 'find_nearest_branch', readOnly: true,
    description: 'أقرب فرع لإحداثيات أو مدينة.',
    schema: { type: 'object', properties: { latitude: n('خط العرض'), longitude: n('خط الطول'), city: s('المدينة') } },
  },
];

const rpc = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function callTool(apiKey: string, name: string, args: Prop) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { content: [{ type: 'text', text: `أداة غير معروفة: ${name}` }], isError: true };
  const { channel: _c, api_key: _k, ...payload } = args ?? {};
  const res = await handleBot(new Request('http://internal/mcp-ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ action: tool.action, payload, metadata: { source: 'mcp-ops' } }),
  }));
  const text = await res.text();
  return { content: [{ type: 'text', text }], isError: !res.ok };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method === 'GET') return json({ name: 'uberfix-ops', transport: 'streamable-http', auth: 'x-api-key' });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = req.headers.get('x-api-key')?.trim();
  if (!apiKey) return json(rpcErr(null, -32001, 'x-api-key header required'), 401);

  let msg: any;
  try { msg = await req.json(); } catch { return json(rpcErr(null, -32700, 'Parse error'), 400); }
  const batch = Array.isArray(msg) ? msg : [msg];
  const out: unknown[] = [];

  for (const m of batch) {
    const { id, method, params } = m ?? {};
    if (id === undefined || id === null) continue; // notification
    try {
      switch (method) {
        case 'initialize':
          out.push(rpc(id, {
            protocolVersion: params?.protocolVersion ?? '2025-06-18',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'uberfix-ops', title: 'UberFix Operations', version: '1.0.0' },
            instructions: 'أدوات تشغيل UberFix: سجّل الطلب بعد جمع البيانات الإلزامية، واستعلم بالرقم أو الهاتف. لا تخترع أرقام طلبات.',
          }));
          break;
        case 'ping': out.push(rpc(id, {})); break;
        case 'tools/list':
          out.push(rpc(id, { tools: TOOLS.map((t) => ({
            name: t.name, description: t.description, inputSchema: t.schema,
            annotations: { readOnlyHint: t.readOnly, destructiveHint: t.name === 'cancel_request' },
          })) }));
          break;
        case 'tools/call':
          out.push(rpc(id, await callTool(apiKey, params?.name, params?.arguments ?? {})));
          break;
        default: out.push(rpcErr(id, -32601, `Method not found: ${method}`));
      }
    } catch (e) {
      console.error('mcp-ops error', e);
      out.push(rpcErr(id, -32603, 'Internal error'));
    }
  }

  if (!out.length) return new Response(null, { status: 202, headers: cors });
  return json(Array.isArray(msg) ? out : out[0]);
});
