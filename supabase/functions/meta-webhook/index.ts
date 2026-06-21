import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || Deno.env.get("INSTAGRAM_VERIFY_TOKEN") || Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
const APP_SECRET = Deno.env.get("META_APP_SECRET") || Deno.env.get("FACEBOOK_APP_SECRET") || "";
const ALLOW_UNSIGNED = Deno.env.get("META_WEBHOOK_ALLOW_UNSIGNED") === "true";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
};

async function validSignature(req: Request, raw: string) {
  if (!APP_SECRET) return ALLOW_UNSIGNED;
  const got = req.headers.get("x-hub-signature-256") || "";
  if (!got.startsWith("sha256=")) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
  const expected = "sha256=" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return safeEqual(got, expected);
}

function product(objectType: string, field = "") {
  if (objectType === "whatsapp_business_account") return "whatsapp";
  if (objectType === "instagram") return "instagram";
  if (objectType === "page" && field === "leadgen") return "facebook_leads";
  if (objectType === "page") return "facebook_page";
  if (objectType === "business") return "meta_business";
  return objectType || "meta";
}

function eventType(objectType: string, field: string, value: Record<string, unknown>) {
  if (objectType === "whatsapp_business_account") {
    if (Array.isArray(value.messages) && value.messages.length) return "whatsapp_message";
    if (Array.isArray(value.statuses) && value.statuses.length) return "whatsapp_status";
  }
  if (objectType === "instagram") {
    if (field.includes("message") || Array.isArray(value.messages)) return "instagram_message";
    if (field.includes("comment") || value.comment_id) return "instagram_comment";
  }
  if (objectType === "page") {
    if (field === "leadgen") return "facebook_lead";
    if (field.includes("message")) return "facebook_page_message";
    if (field.includes("feed") || field.includes("comments")) return "facebook_page_engagement";
  }
  return field || objectType || "meta_event";
}

function ids(value: Record<string, unknown>) {
  const messages = Array.isArray(value.messages) ? value.messages as Array<Record<string, unknown>> : [];
  const statuses = Array.isArray(value.statuses) ? value.statuses as Array<Record<string, unknown>> : [];
  return {
    message_ids: messages.map((m) => m.id).filter(Boolean),
    status_ids: statuses.map((s) => s.id).filter(Boolean),
    leadgen_id: value.leadgen_id || value.lead_id || null,
    comment_id: value.comment_id || null,
    media_id: value.media_id || value.post_id || null,
  };
}

function makeRows(payload: any, signatureValid: boolean, req: Request) {
  const objectType = payload.object || "unknown";
  const rows: Array<Record<string, unknown>> = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const field = change.field || "unknown";
      const value = change.value || {};
      const extracted = ids(value);
      const primary = extracted.message_ids[0] || extracted.status_ids[0] || extracted.leadgen_id || extracted.comment_id || extracted.media_id || value.id || entry.time || crypto.randomUUID();
      rows.push({
        provider: "meta",
        product: product(objectType, field),
        object_type: objectType,
        field_name: field,
        entry_id: entry.id || null,
        event_type: eventType(objectType, field, value),
        event_id: ["meta", objectType, entry.id || "entry", field, String(primary)].join(":"),
        source_id: entry.id || null,
        signature_valid: signatureValid,
        headers: { signature_present: Boolean(req.headers.get("x-hub-signature-256")) },
        payload,
        normalized: { entry_id: entry.id || null, field, value, ids: extracted },
        received_at: new Date().toISOString(),
      });
    }
  }
  if (!rows.length) {
    rows.push({ provider: "meta", product: product(objectType), object_type: objectType, event_type: objectType, event_id: `meta:${objectType}:${crypto.randomUUID()}`, signature_valid: signatureValid, payload, normalized: {}, received_at: new Date().toISOString() });
  }
  return rows;
}

async function persist(rows: Array<Record<string, unknown>>) {
  if (!SUPABASE_URL || !SERVICE_KEY) return { ok: false, reason: "missing_supabase_service_credentials" };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/meta_webhook_events?on_conflict=event_id`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  return { ok: res.ok, status: res.status, details: res.ok ? undefined : await res.text() };
}

serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && challenge && VERIFY_TOKEN && token === VERIFY_TOKEN) return new Response(challenge, { headers: { ...cors, "Content-Type": "text/plain" } });
    return json({ ok: false, error: "Verification failed" }, 403);
  }
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const raw = await req.text();
  const sig = await validSignature(req, raw);
  if (!sig) return json({ ok: false, error: "Invalid Meta signature" }, 401);
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const rows = makeRows(payload, sig, req);
  const saved = await persist(rows);
  return json({ received: true, webhook: "meta-webhook", object: payload.object || null, events: rows.length, persisted: saved });
});
