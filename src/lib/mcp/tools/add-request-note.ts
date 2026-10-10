import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callApi, guarded, textResult } from "../supabase";
import { resolveVisibleRequest } from "./request-access";

export default defineTool({
  name: "add_request_note",
  title: "Add request note",
  description: "إضافة ملاحظة إلى طلب صيانة يملك المستخدم صلاحية الوصول إليه.",
  inputSchema: {
    request_id: z.string().uuid().optional(),
    request_number: z.string().trim().min(3).optional(),
    note: z.string().trim().min(2).max(2000).describe("نص الملاحظة."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ note, ...ref }, ctx) =>
    guarded(async () => {
      const req = await resolveVisibleRequest(ctx, ref, "id, client_phone");
      const data = await callApi(ctx, {
        action: "add_note",
        payload: { request_id: req.id, note, client_phone: req.client_phone },
        metadata: { source: "mcp" },
      });
      return textResult(data);
    }),
});
