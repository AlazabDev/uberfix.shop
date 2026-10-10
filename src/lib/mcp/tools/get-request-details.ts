import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { guarded, REQUEST_FIELDS, textResult } from "../supabase";
import { resolveVisibleRequest } from "./request-access";

export default defineTool({
  name: "get_request_details",
  title: "Get request details",
  description: "تفاصيل طلب صيانة واحد يملك المستخدم صلاحية رؤيته.",
  inputSchema: {
    request_id: z.string().uuid().optional(),
    request_number: z.string().trim().min(3).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (ref, ctx) =>
    guarded(async () => {
      const data = await resolveVisibleRequest(
        ctx,
        ref,
        `${REQUEST_FIELDS}, description, client_name, estimated_cost, actual_cost, sla_complete_due, customer_notes`,
      );
      return textResult({ request: data });
    }),
});
