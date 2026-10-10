import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, guarded, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "تصنيفات الصيانة المفعّلة.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (_args, ctx) =>
    guarded(async () => {
      const { data, error } = await supabaseForUser(ctx)
        .from("maintenance_categories")
        .select("id, name, name_ar, slug")
        .eq("is_active", true)
        .order("name");
      if (error) return errorResult(error.message);
      return textResult({ count: data?.length ?? 0, categories: data ?? [] });
    }),
});
