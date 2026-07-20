import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, textResult } from "../supabase";

export default defineTool({
  name: "create_maintenance_request",
  title: "Create maintenance request",
  description: "إنشاء طلب صيانة عام عبر بوابة UberFix. يعيد رقم طلب لتتبعه لاحقاً.",
  inputSchema: {
    client_name: z.string().trim().min(2),
    client_phone: z.string().trim().min(6).describe("هاتف مصري بصيغة دولية مفضلاً."),
    service_type: z.string().trim().min(2).describe("نوع الخدمة (كهرباء، سباكة، تكييف...)."),
    description: z.string().trim().min(5),
    location: z.string().trim().min(2).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (args) => {
    const env = (globalThis as any)?.process?.env ?? {};
    const base = env.SUPABASE_URL ?? "";
    const anon = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";
    if (!base || !anon) return errorResult("Supabase env missing.");
    try {
      const res = await fetch(`${base}/functions/v1/maintenance-gateway`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ channel: "mcp-public", ...args }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return errorResult(`gateway ${res.status}: ${JSON.stringify(body)}`);
      return textResult(body);
    } catch (e: any) {
      return errorResult(e?.message ?? String(e));
    }
  },
});