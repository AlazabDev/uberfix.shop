import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonClient, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "list_branches",
  title: "List branches",
  description: "قائمة فروع UberFix العامة (اسم، مدينة، هاتف، إحداثيات).",
  inputSchema: { city: z.string().trim().min(1).optional().describe("تصفية بالمدينة.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city }) => {
    let q = anonClient()
      .from("branches")
      .select("id, code, name, city, address, phone, latitude, longitude, is_active")
      .eq("is_active", true)
      .limit(200);
    if (city) q = q.ilike("city", `%${city}%`);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return textResult({ count: data?.length ?? 0, branches: data ?? [] });
  },
});