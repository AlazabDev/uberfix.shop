import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonClient, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "list_services",
  title: "List services",
  description: "قائمة خدمات الصيانة المتاحة في UberFix (اسم، فئة، سعر تقريبي).",
  inputSchema: { limit: z.number().int().min(1).max(200).optional().describe("عدد النتائج (افتراضي 100).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const { data, error } = await anonClient()
      .from("services")
      .select("id, code, name, category, description, base_price, currency, is_active")
      .eq("is_active", true)
      .limit(limit ?? 100);
    if (error) return errorResult(error.message);
    return textResult({ count: data?.length ?? 0, services: data ?? [] });
  },
});