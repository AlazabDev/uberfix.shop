/**
 * UF.Bot in-app tools — let the agent reach any part of UberFix.
 *
 * Every database call runs with the *caller's own* Supabase session, so the
 * database's RLS decides what each role may see/change (admins/owner reach
 * everything; technicians & customers only their own rows — Egyptian PDPL 151/2020).
 * The service-role key is never used here.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;
const SELECT_RE = /^[a-zA-Z0-9_,*.()!:\s-]{1,600}$/;
const OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in'] as const;
type Op = typeof OPS[number];
type Filter = { column: string; op: Op; value: unknown };

export type ClientAction = { type: 'navigate'; path: string; reason?: string };

export interface ToolCtx {
  db: SupabaseClient;
  userId: string | null;
  roles: string[];
  actions: ClientAction[];
}

const str = (d?: string) => ({ type: 'string', ...(d ? { description: d } : {}) });
const filtersSchema = {
  type: 'array',
  description: 'شروط التصفية (AND).',
  items: {
    type: 'object',
    properties: {
      column: str(), op: { type: 'string', enum: [...OPS] },
      value: { description: 'القيمة؛ مصفوفة مع in، و null مع is.' },
    },
    required: ['column', 'op', 'value'], additionalProperties: false,
  },
};

/** Responses-API function tool definitions sent to the Foundry agent. */
export const APP_TOOLS = [
  { type: 'function', name: 'get_my_context', description: 'هوية المستخدم الحالي وأدواره.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { type: 'function', name: 'query_records',
    description: 'قراءة سجلات من أي جدول أو view في النظام (طلبات، فواتير، فنيون، عقارات، عقود، مخزون، إشعارات، v_*_dashboard...).',
    parameters: { type: 'object', additionalProperties: false, required: ['table'], properties: {
      table: str('اسم الجدول أو الـ view'), select: str('الأعمدة، الافتراضي *'), filters: filtersSchema,
      order_by: str(), ascending: { type: 'boolean' }, limit: { type: 'integer', minimum: 1, maximum: 200 },
    } } },
  { type: 'function', name: 'count_records', description: 'عدّ السجلات في جدول مع شروط اختيارية.',
    parameters: { type: 'object', additionalProperties: false, required: ['table'], properties: { table: str(), filters: filtersSchema } } },
  { type: 'function', name: 'create_record', description: 'إضافة سجل جديد لأي جدول.',
    parameters: { type: 'object', additionalProperties: false, required: ['table', 'values'], properties: { table: str(), values: { type: 'object' } } } },
  { type: 'function', name: 'update_records', description: 'تعديل سجلات مطابقة للشروط (الشروط إلزامية).',
    parameters: { type: 'object', additionalProperties: false, required: ['table', 'filters', 'values'], properties: { table: str(), filters: filtersSchema, values: { type: 'object' } } } },
  { type: 'function', name: 'delete_records', description: 'حذف سجلات مطابقة للشروط (الشروط إلزامية).',
    parameters: { type: 'object', additionalProperties: false, required: ['table', 'filters'], properties: { table: str(), filters: filtersSchema } } },
  { type: 'function', name: 'call_function',
    description: 'تشغيل دالة من دوال قاعدة البيانات، مثل fn_transition_request_stage لنقل مرحلة طلب، get_table_row_counts للإحصاءات.',
    parameters: { type: 'object', additionalProperties: false, required: ['name'], properties: { name: str(), args: { type: 'object' } } } },
  { type: 'function', name: 'navigate_to',
    description: 'فتح أي صفحة في التطبيق للمستخدم، مثل /requests/<id> أو /invoices أو /reports/sla أو /properties.',
    parameters: { type: 'object', additionalProperties: false, required: ['path'], properties: { path: str('مسار يبدأ بـ /'), reason: str() } } },
];

export const APP_TOOL_NAMES = new Set(APP_TOOLS.map((t) => t.name));

export async function buildToolCtx(authHeader: string | null): Promise<ToolCtx> {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isUser = !!bearer && bearer !== anon;
  const db = createClient(url, anon, {
    global: { headers: isUser ? { Authorization: `Bearer ${bearer}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userId: string | null = null;
  let roles: string[] = [];
  if (isUser) {
    const { data } = await db.auth.getUser(bearer);
    userId = data.user?.id ?? null;
    if (userId) {
      const { data: r } = await db.from('user_roles').select('role').eq('user_id', userId);
      roles = (r ?? []).map((x: { role: string }) => x.role);
    }
  }
  return { db, userId, roles, actions: [] };
}

function applyFilters(q: any, filters: unknown) {
  if (!Array.isArray(filters)) return q;
  for (const f of filters.slice(0, 20) as Filter[]) {
    if (!f || !IDENT.test(String(f.column)) || !OPS.includes(f.op)) throw new Error(`شرط غير صالح: ${JSON.stringify(f)}`);
    q = f.op === 'in' ? q.in(f.column, Array.isArray(f.value) ? f.value : [f.value]) : q[f.op](f.column, f.value);
  }
  return q;
}

const table = (t: unknown) => {
  const s = String(t ?? '');
  if (!IDENT.test(s)) throw new Error('اسم جدول غير صالح');
  return s;
};
const ok = (data: unknown) => ({ ok: true, data });
const fail = (e: { message?: string } | null) => ({ ok: false, error: e?.message ?? 'خطأ غير معروف' });

export async function runAppTool(name: string, args: Record<string, any>, ctx: ToolCtx): Promise<unknown> {
  const writeNeedsUser = ['create_record', 'update_records', 'delete_records', 'call_function'];
  if (writeNeedsUser.includes(name) && !ctx.userId) return { ok: false, error: 'يجب تسجيل الدخول لتنفيذ هذا الإجراء.' };

  switch (name) {
    case 'get_my_context':
      return ok({ signed_in: !!ctx.userId, user_id: ctx.userId, roles: ctx.roles });
    case 'query_records': {
      const sel = args.select ? String(args.select) : '*';
      if (!SELECT_RE.test(sel)) return fail({ message: 'select غير صالح' });
      let q: any = ctx.db.from(table(args.table)).select(sel);
      q = applyFilters(q, args.filters);
      if (args.order_by && IDENT.test(String(args.order_by))) q = q.order(args.order_by, { ascending: !!args.ascending });
      const { data, error } = await q.limit(Math.min(Math.max(Number(args.limit) || 50, 1), 200));
      return error ? fail(error) : ok(data);
    }
    case 'count_records': {
      let q: any = ctx.db.from(table(args.table)).select('*', { count: 'exact', head: true });
      q = applyFilters(q, args.filters);
      const { count, error } = await q;
      return error ? fail(error) : ok({ count });
    }
    case 'create_record': {
      const { data, error } = await ctx.db.from(table(args.table)).insert(args.values ?? {}).select().limit(5);
      return error ? fail(error) : ok(data);
    }
    case 'update_records': {
      if (!Array.isArray(args.filters) || !args.filters.length) return fail({ message: 'الشروط إلزامية للتعديل' });
      const q = applyFilters(ctx.db.from(table(args.table)).update(args.values ?? {}), args.filters);
      const { data, error } = await q.select().limit(50);
      return error ? fail(error) : ok({ updated: data?.length ?? 0, rows: data });
    }
    case 'delete_records': {
      if (!Array.isArray(args.filters) || !args.filters.length) return fail({ message: 'الشروط إلزامية للحذف' });
      const q = applyFilters(ctx.db.from(table(args.table)).delete(), args.filters);
      const { data, error } = await q.select('id');
      return error ? fail(error) : ok({ deleted: data?.length ?? 0 });
    }
    case 'call_function': {
      const fn = String(args.name ?? '');
      if (!IDENT.test(fn)) return fail({ message: 'اسم دالة غير صالح' });
      const { data, error } = await ctx.db.rpc(fn, args.args ?? {});
      return error ? fail(error) : ok(data);
    }
    case 'navigate_to': {
      const path = String(args.path ?? '');
      if (!/^\/[A-Za-z0-9\-._~/?=&%#:]*$/.test(path) || path.startsWith('//')) return fail({ message: 'مسار غير صالح' });
      ctx.actions.push({ type: 'navigate', path, reason: args.reason });
      return ok({ opened: path });
    }
    default:
      return fail({ message: `أداة غير معروفة: ${name}` });
  }
}
