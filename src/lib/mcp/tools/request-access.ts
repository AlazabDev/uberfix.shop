import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser, ToolFailure } from "../supabase";

/** يحل الطلب عبر RLS بهوية المستخدم؛ إن لم يظهر فلا صلاحية له عليه. */
export async function resolveVisibleRequest(
  ctx: ToolContext,
  ref: { request_id?: string; request_number?: string },
  fields: string,
) {
  if (!ref.request_id && !ref.request_number) throw new ToolFailure("request_id أو request_number مطلوب.");
  let q = supabaseForUser(ctx).from("maintenance_requests").select(fields).limit(1);
  q = ref.request_id ? q.eq("id", ref.request_id) : q.eq("request_number", ref.request_number!);
  const { data, error } = await q.maybeSingle();
  if (error) throw new ToolFailure(error.message);
  if (!data) throw new ToolFailure("الطلب غير موجود أو ليس لديك صلاحية عليه.");
  return data as unknown as Record<string, unknown>;
}
