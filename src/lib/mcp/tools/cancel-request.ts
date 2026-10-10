import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callApi, guarded, textResult } from "../supabase";
import { resolveVisibleRequest } from "./request-access";

export default defineTool({
  name: "cancel_request",
  title: "Cancel request",
  description:
    "إلغاء طلب صيانة بطلب صريح من المستخدم مع ذكر السبب. قانونية الإلغاء تحكمها دورة العمل وصلاحية دور المستخدم.",
  inputSchema: {
    request_id: z.string().uuid().optional(),
    request_number: z.string().trim().min(3).optional(),
    reason: z.string().trim().min(3).max(500).describe("سبب الإلغاء."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ reason, ...ref }, ctx) =>
    guarded(async () => {
      const req = await resolveVisibleRequest(ctx, ref, "id, client_phone");
      const data = await callApi(ctx, {
        action: "cancel_request",
        payload: { request_id: req.id, reason, client_phone: req.client_phone },
        metadata: { source: "mcp" },
      });
      return textResult(data);
    }),
});
