import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERIFY_TOKEN =
  Deno.env.get("INSTAGRAM_VERIFY_TOKEN") ||
  Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ||
  Deno.env.get("WHATSAPP_VERIFY_TOKEN") ||
  "";

const META_APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET") || Deno.env.get("META_APP_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const verifyMetaSignature = async (req: Request, rawBody: string): Promise<boolean> => {
  if (!META_APP_SECRET) {
    // Keep production flexible while the app is being connected; configure META_APP_SECRET before public launch.
    console.warn("META_APP_SECRET / FACEBOOK_APP_SECRET not configured; accepting Instagram webhook without signature verification");
    return true;
  }

  const signature = req.headers.get("x-hub-signature-256") || "";
  if (!signature.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  return timingSafeEqual(signature, expected);
};

const persistEvent = async (payload: unknown) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/meta_webhook_events`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        provider: "meta",
        product: "instagram",
        payload,
        received_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Do not fail Meta delivery because logging table is missing or unavailable.
    console.warn("Failed to persist Instagram webhook event:", error);
  }
};

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && challenge && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    return jsonResponse({ error: "Verification failed" }, 403);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const rawBody = await req.text();
  const signatureOk = await verifyMetaSignature(req, rawBody);
  if (!signatureOk) {
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  await persistEvent(payload);

  // Meta expects a fast 200 response. Business processing should happen asynchronously later.
  return jsonResponse({ received: true, product: "instagram" }, 200);
});
