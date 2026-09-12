/**
 * Bridges the 13 MCP tools to Azure-OpenAI tool schema, and executes them
 * by dispatching to the in-process engine handlers (no extra HTTP hop).
 */
import { handleMaintenance } from '../engine/maintenance.ts';
import { handleBot } from '../engine/bot.ts';

type ToolDef = {
  type: 'function';
  function: { name: string; description: string; parameters: any };
};

const o = (props: Record<string, any>, required: string[] = []) => ({
  type: 'object', properties: props, required, additionalProperties: false,
});
const s = (description?: string) => ({ type: 'string', ...(description ? { description } : {}) });
const n = () => ({ type: 'number' });

export const TOOLS: ToolDef[] = [
  { type: 'function', function: { name: 'create_maintenance_request',
    description: 'إنشاء طلب صيانة جديد.',
    parameters: o({
      client_name: s(), client_phone: s(), service_type: s(), description: s(),
      priority: { type: 'string', enum: ['low','medium','high','urgent'] },
      location: s(), channel: s(),
    }, ['client_name','client_phone','service_type','description']) } },
  { type: 'function', function: { name: 'transition_request_stage',
    description: 'نقل الطلب لمرحلة جديدة.',
    parameters: o({ request_id: s(), request_number: s(), to_stage: s(), reason: s() }, ['to_stage']) } },
  { type: 'function', function: { name: 'get_request_status',
    description: 'استعلام حالة طلب.',
    parameters: o({ request_id: s(), request_number: s() }) } },
  { type: 'function', function: { name: 'cancel_request',
    description: 'إلغاء طلب.',
    parameters: o({ request_id: s(), request_number: s(), reason: s() }, ['reason']) } },
  { type: 'function', function: { name: 'add_request_note',
    description: 'إضافة ملاحظة.',
    parameters: o({ request_id: s(), request_number: s(), note: s() }, ['note']) } },
  { type: 'function', function: { name: 'list_services', description: 'قائمة الخدمات.', parameters: o({}) } },
  { type: 'function', function: { name: 'list_categories', description: 'تصنيفات الصيانة.', parameters: o({}) } },
  { type: 'function', function: { name: 'list_technicians', description: 'الفنيون.',
    parameters: o({ specialization: s(), limit: n() }) } },
  { type: 'function', function: { name: 'get_branches', description: 'الفروع.', parameters: o({}) } },
  { type: 'function', function: { name: 'find_nearest_branch', description: 'أقرب فرع.',
    parameters: o({ lat: n(), lng: n() }, ['lat','lng']) } },
  { type: 'function', function: { name: 'get_quote', description: 'عرض سعر.',
    parameters: o({ service_type: s(), description: s(), location: s(), client_name: s(), client_phone: s() },
      ['service_type','description','client_name','client_phone']) } },
  { type: 'function', function: { name: 'check_status_quick', description: 'استعلام سريع.',
    parameters: o({ search_term: s(), search_type: { type:'string', enum:['request_number','phone','request_id'] } },
      ['search_term']) } },
];

/** Execute one tool call by routing to the right engine. */
export async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: { apiKey?: string; authHeader?: string } = {},
): Promise<any> {
  const baseHeaders: Record<string,string> = { 'Content-Type': 'application/json' };
  if (ctx.apiKey) baseHeaders['x-api-key'] = ctx.apiKey;
  if (ctx.authHeader) baseHeaders['Authorization'] = ctx.authHeader;

  const maintenanceMap: Record<string, string> = {
    create_maintenance_request: 'create',
    transition_request_stage:   'transition_stage',
    get_request_status:         'get_status',
    cancel_request:             'cancel',
    add_request_note:           'add_note',
  };

  let body: any;
  let handler: (req: Request) => Promise<Response>;

  if (name in maintenanceMap) {
    body = { channel: args.channel ?? 'ai-agent', action: maintenanceMap[name], client_name: args.client_name ?? 'ai-agent', ...args };
    handler = handleMaintenance;
  } else {
    const action = name === 'check_status_quick' ? 'check_status' : name;
    body = { action, payload: args, metadata: { source: 'ai-agent' } };
    handler = handleBot;
  }

  const req = new Request('https://internal/gateway', { method: 'POST', headers: baseHeaders, body: JSON.stringify(body) });
  const res = await handler(req);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}