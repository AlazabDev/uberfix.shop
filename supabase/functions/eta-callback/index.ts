// ETA notification callback — receives document status updates ("الرد") from the
// Egyptian Tax Authority at the URL registered in the taxpayer portal (رابط الاتصال).
// Protected by the shared ETA_CALLBACK_TOKEN passed as ?token= in the registered URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ETA document status -> internal invoices.eta_status
const STATUS_MAP: Record<string, string> = {
  valid: "valid",
  invalid: "invalid",
  rejected: "rejected",
  cancelled: "cancelled",
  submitted: "submitted",
};

function extractValidationError(doc: Record<string, unknown>): string | null {
  const vr = doc?.validationResults as Record<string, unknown> | undefined;
  if (vr && Array.isArray(vr.validationSteps)) {
    const errs = (vr.validationSteps as Array<Record<string, unknown>>).flatMap((s) =>
      Array.isArray(s?.errors) ? (s.errors as unknown[]) : []
    );
    if (errs.length > 0) return JSON.stringify(errs).slice(0, 4000);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // Health check (system_check bypass pattern)
  if (req.method === "GET" || url.searchParams.get("system_check")) {
    return json({ ok: true, service: "eta-callback" });
  }

  // Shared-secret auth: the token travels inside the URL registered in the ETA portal
  const expected = Deno.env.get("ETA_CALLBACK_TOKEN") ?? "";
  if (!expected) return json({ error: "ETA_CALLBACK_TOKEN is not configured" }, 503);
  const provided = url.searchParams.get("token") ?? req.headers.get("x-eta-token") ?? "";
  if (!provided || provided !== expected) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json().catch(() => null);
    let docs: Array<Record<string, unknown>> = [];
    if (Array.isArray(payload?.documents)) docs = payload.documents;
    else if (payload && typeof payload === "object" && (payload.uuid || payload.internalId)) {
      docs = [payload as Record<string, unknown>];
    }
    if (docs.length === 0) return json({ error: "No documents in notification payload" }, 400);

    const results: Array<Record<string, unknown>> = [];

    for (const doc of docs) {
      const uuid = String(doc?.uuid || "");
      const internalId = String(doc?.internalId || "");
      const longId = doc?.longId ? String(doc.longId) : null;
      const rawStatus = String(doc?.status || "").toLowerCase();
      const mapped = STATUS_MAP[rawStatus] || rawStatus || "unknown";

      if (!uuid && !internalId) {
        results.push({ updated: false, reason: "no identifiers" });
        continue;
      }

      // Locate the invoice by ETA UUID first, then by our internal ID
      let invoiceId: string | undefined;
      if (uuid) {
        const { data } = await admin.from("invoices").select("id").eq("eta_uuid", uuid).limit(1).maybeSingle();
        invoiceId = data?.id;
      }
      if (!invoiceId && internalId) {
        const { data } = await admin.from("invoices").select("id").eq("eta_internal_id", internalId).limit(1).maybeSingle();
        invoiceId = data?.id;
      }
      if (!invoiceId) {
        results.push({ uuid, internalId, updated: false, reason: "invoice not found" });
        continue;
      }

      let errorMessage = extractValidationError(doc);
      if (!errorMessage && (mapped === "rejected" || mapped === "invalid")) {
        errorMessage = JSON.stringify(doc).slice(0, 4000);
      }

      await admin
        .from("invoices")
        .update({
          eta_status: mapped,
          ...(longId ? { eta_long_id: longId } : {}),
          eta_error: errorMessage,
        })
        .eq("id", invoiceId);

      await admin.from("eta_submissions").insert({
        invoice_id: invoiceId,
        action: "notification",
        status: mapped,
        document_uuid: uuid || null,
        long_id: longId,
        response_payload: doc,
        error_message: errorMessage,
      });

      results.push({ uuid, internalId, updated: true, status: mapped });
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("eta-callback error:", message);
    return json({ error: message }, 500);
  }
});