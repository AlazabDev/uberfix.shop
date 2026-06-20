import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const envStatus = () => ({
  graph_token: Boolean(Deno.env.get("META_ACCESS_TOKEN") || Deno.env.get("FACEBOOK_ACCESS_TOKEN")),
  instagram_account_id: Boolean(Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")),
  page_id: Boolean(Deno.env.get("FACEBOOK_PAGE_ID")),
  catalog_id: Boolean(Deno.env.get("META_CATALOG_ID")),
  whatsapp_phone_number_id: Boolean(Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")),
  whatsapp_token: Boolean(Deno.env.get("WHATSAPP_ACCESS_TOKEN")),
});

const modeFor = (needed: string[]) => {
  const status = envStatus() as Record<string, boolean>;
  return needed.every((key) => status[key]) ? "live_ready" : "needs_secrets";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const action = body.action || "status";
  const checked_at = new Date().toISOString();

  const requirements: Record<string, string[]> = {
    instagram_profile: ["graph_token", "instagram_account_id"],
    instagram_messages_status: ["graph_token", "instagram_account_id"],
    instagram_comments_status: ["graph_token", "instagram_account_id"],
    instagram_content_publish_check: ["graph_token", "instagram_account_id"],
    instagram_insights_check: ["graph_token", "instagram_account_id"],
    catalog_management_check: ["graph_token", "catalog_id"],
    pages_messaging_check: ["graph_token", "page_id"],
    whatsapp_messaging_check: ["whatsapp_phone_number_id", "whatsapp_token"],
    human_agent_check: ["graph_token"],
  };

  if (!requirements[action]) {
    return json({ ok: false, action, checked_at, message: "Unknown review action" }, 400);
  }

  const mode = modeFor(requirements[action]);
  return json({
    ok: mode === "live_ready",
    action,
    mode,
    checked_at,
    configured: envStatus(),
    message: mode === "live_ready" ? "Required secrets are present for this review check." : "One or more required secrets are missing.",
  });
});
