import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonClient, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "track_maintenance_request",
  title: "Track maintenance request",
  description: "تتبع حالة طلب صيانة عبر رقم الطلب العام (بدون معلومات شخصية).",
  inputSchema: {
    request_number: z.string().trim().min(3).describe("رقم الطلب مثل UF/MR/YYMMDD/SEQ."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ request_number }) => {
    const { data, error } = await anonClient().rpc("public_track_request", { p_request_number: request_number });
    if (error) return errorResult(error.message);
    if (!data) return errorResult("لم يتم العثور على الطلب.");
    return textResult(data);
  },
});