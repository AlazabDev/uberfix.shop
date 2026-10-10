import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callApi, guarded, textResult } from "../supabase";
import { SERVICE_TYPES } from "./create-request";

/**
 * طلب عرض سعر = إنشاء طلب فعلي (ليس قراءة). يمر عبر نفس قناة internal
 * فيُسجَّل في شركة المستخدم وليس في أول شركة بالنظام.
 */
export default defineTool({
  name: "get_quote",
  title: "Request a quote",
  description:
    "تسجيل طلب عرض سعر رسمي (يُنشئ طلبًا فعليًا في شركة المستخدم ويتواصل الفريق خلال 24 ساعة). اطلب موافقة المستخدم أولًا.",
  inputSchema: {
    service_type: z.enum(SERVICE_TYPES),
    description: z.string().trim().min(5),
    location: z.string().trim().min(2).optional(),
    area_sqm: z.number().positive().optional().describe("المساحة م²."),
    client_phone: z.string().trim().min(6).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ service_type, description, location, area_sqm, client_phone }, ctx) =>
    guarded(async () => {
      const data = await callApi(ctx, {
        channel: "internal",
        title: `طلب عرض سعر - ${service_type}`,
        description: `${description}${area_sqm ? `\nالمساحة: ${area_sqm} م²` : ""}`,
        service_type,
        location,
        client_phone,
        client_name: ctx.getUserEmail() ?? "UberFix user",
        client_email: ctx.getUserEmail() ?? undefined,
        priority: "medium",
        metadata: { source: "mcp", kind: "quote", oauth_client_id: ctx.getClientId() ?? null },
      });
      return textResult(data);
    }),
});
