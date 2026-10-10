import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, guarded, REQUEST_FIELDS, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "check_request_status",
  title: "Check request status",
  description:
    "حالة طلبات الصيانة التي يملك المستخدم صلاحية رؤيتها: برقم الطلب، أو أحدث الطلبات إن لم يُرسل رقم.",
  inputSchema: {
    request_number: z.string().trim().min(3).optional().describe("رقم الطلب مثل UF/MR/YYMMDD/SEQ."),
    limit: z.number().int().min(1).max(50).optional().describe("عدد الطلبات (افتراضي 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ request_number, limit }, ctx) =>
    guarded(async () => {
      let q = supabaseForUser(ctx)
        .from("maintenance_requests")
        .select(REQUEST_FIELDS)
        .order("created_at", { ascending: false })
        .limit(limit ?? 10);
      if (request_number) q = q.eq("request_number", request_number);
      const { data, error } = await q;
      if (error) return errorResult(error.message);
      if (request_number && !data?.length) return errorResult("الطلب غير موجود أو ليس لديك صلاحية عليه.");
      return textResult({ count: data?.length ?? 0, requests: data ?? [] });
    }),
});
