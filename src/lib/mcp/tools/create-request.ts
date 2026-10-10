import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callApi, guarded, textResult } from "../supabase";

export const SERVICE_TYPES = [
  "plumbing", "electrical", "ac", "painting", "carpentry", "cleaning",
  "general", "appliance", "pest_control", "landscaping",
] as const;

export default defineTool({
  name: "create_maintenance_request",
  title: "Create maintenance request",
  description:
    "تسجيل طلب صيانة باسم المستخدم المسجّل. الشركة تُحدَّد من حسابه، والفرع من العقار إن أُرسل property_id. يعيد رقم الطلب.",
  inputSchema: {
    title: z.string().trim().min(3).describe("عنوان مختصر للمشكلة."),
    description: z.string().trim().min(5).describe("وصف المشكلة."),
    service_type: z.enum(SERVICE_TYPES).optional().describe("نوع الخدمة."),
    priority: z.enum(["low", "medium", "high"]).optional(),
    location: z.string().trim().min(2).optional().describe("العنوان."),
    client_name: z.string().trim().min(2).optional().describe("اسم العميل (افتراضي: صاحب الحساب)."),
    client_phone: z.string().trim().min(6).optional().describe("هاتف التواصل."),
    property_id: z.string().uuid().optional().describe("عقار يملكه المستخدم داخل شركته."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: (args, ctx) =>
    guarded(async () => {
      const data = await callApi(ctx, {
        channel: "internal",
        ...args,
        client_name: args.client_name ?? ctx.getUserEmail() ?? "UberFix user",
        client_email: ctx.getUserEmail() ?? undefined,
        metadata: { source: "mcp", oauth_client_id: ctx.getClientId() ?? null },
      });
      return textResult(data);
    }),
});
