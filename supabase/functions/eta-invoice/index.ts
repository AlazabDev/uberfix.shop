// Egyptian Tax Authority (ETA) e-invoicing integration
// Actions: test_connection | submit | status
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildInvoiceDocument, EtaSettings } from "./document.ts";
import { serializeDocument } from "./serialize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENDPOINTS = {
  preprod: {
    id: "https://id.preprod.eta.gov.eg/connect/token",
    api: "https://api.preprod.invoicing.eta.gov.eg/api/v1",
  },
  production: {
    id: "https://id.eta.gov.eg/connect/token",
    api: "https://api.invoicing.eta.gov.eg/api/v1",
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function creds(env: string) {
  if (env === "production") {
    return {
      clientId: Deno.env.get("ETA_CLIENT_ID_PROD") ?? "",
      clientSecret: Deno.env.get("ETA_CLIENT_SECRET_PROD") ?? "",
    };
  }
  return {
    clientId: Deno.env.get("ETA_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("ETA_CLIENT_SECRET") ?? "",
  };
}

async function getToken(env: string): Promise<string> {
  const { clientId, clientSecret } = creds(env);
  if (!clientId || !clientSecret) {
    throw new Error(`ETA credentials are not configured for environment "${env}"`);
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "InvoicingAPI",
  });
  const res = await fetch(ENDPOINTS[env === "production" ? "production" : "preprod"].id, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ETA token request failed [${res.status}]: ${text}`);
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error("ETA token response did not contain access_token");
  return data.access_token as string;
}

/**
 * Requests a CMS (PKCS#7) signature from the customer's local signing service.
 * The service must expose POST { serialized } -> { signature } and is protected
 * by the shared ETA_SIGNING_SERVICE_TOKEN secret.
 */
async function signDocument(serviceUrl: string, serialized: string): Promise<string> {
  const token = Deno.env.get("ETA_SIGNING_SERVICE_TOKEN") ?? "";
  const res = await fetch(serviceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ serialized }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Local signing service failed [${res.status}]: ${text}`);
  let signature = "";
  try {
    const parsed = JSON.parse(text);
    signature = parsed.signature || parsed.value || parsed.cms || "";
  } catch {
    signature = text.trim();
  }
  if (!signature) throw new Error("Local signing service returned an empty signature");
  return signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ---- Auth: staff only ----
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = new Set(["admin", "owner", "manager", "finance", "accounting"]);
    const isAllowed = (roles || []).some((r: { role: string }) => allowed.has(r.role));
    if (!isAllowed) return json({ error: "Forbidden: staff role required" }, 403);

    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || "submit");

    // ---- Settings ----
    const { data: settingsRow, error: settingsErr } = await admin
      .from("eta_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (settingsErr || !settingsRow) {
      return json({ error: "ETA settings are not configured" }, 400);
    }
    const settings = settingsRow as unknown as EtaSettings & { id: string; is_enabled: boolean };
    const environment = String(payload.environment || settings.environment || "preprod");

    if (action === "test_connection") {
      const token = await getToken(environment);
      return json({ ok: true, environment, token_length: token.length });
    }

    if (action === "status") {
      const uuid = String(payload.document_uuid || "");
      if (!uuid) return json({ error: "document_uuid is required" }, 400);
      const token = await getToken(environment);
      const base = ENDPOINTS[environment === "production" ? "production" : "preprod"].api;
      const res = await fetch(`${base}/documents/${uuid}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) return json({ error: "ETA status request failed", status: res.status, details: text }, res.status);
      return json(JSON.parse(text));
    }

    if (action !== "submit") return json({ error: `Unknown action "${action}"` }, 400);

    // ---- Submit ----
    if (!settings.is_enabled) {
      return json({ error: "ETA integration is disabled in settings" }, 400);
    }
    if (!settings.taxpayer_tin || !settings.activity_code) {
      return json({ error: "Taxpayer TIN and activity code must be set in ETA settings" }, 400);
    }

    const invoiceId = String(payload.invoice_id || "");
    if (!invoiceId) return json({ error: "invoice_id is required" }, 400);

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invErr || !invoice) return json({ error: "Invoice not found" }, 404);
    if (invoice.eta_uuid) {
      return json({ error: "Invoice already submitted to ETA", eta_uuid: invoice.eta_uuid }, 409);
    }

    const { data: items } = await admin
      .from("invoice_items")
      .select("service_name, description, quantity, unit_price, total_price")
      .eq("invoice_id", invoiceId);

    const { document, internalId } = buildInvoiceDocument(
      invoice as never,
      (items || []) as never,
      settings,
    );

    // ---- Signature ----
    if (settings.signing_enabled) {
      if (!settings.signing_service_url) {
        return json({ error: "Signing is enabled but signing_service_url is empty" }, 400);
      }
      const { signatures: _drop, ...unsigned } = document as Record<string, unknown>;
      const serialized = serializeDocument(unsigned as never);
      const signature = await signDocument(settings.signing_service_url, serialized);
      (document as Record<string, unknown>).signatures = [
        { signatureType: "I", value: signature },
      ];
    }

    const token = await getToken(environment);
    const base = ENDPOINTS[environment === "production" ? "production" : "preprod"].api;
    const res = await fetch(`${base}/documentsubmissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents: [document] }),
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    const accepted = (parsed.acceptedDocuments as Array<Record<string, string>> | undefined) || [];
    const rejected = (parsed.rejectedDocuments as Array<Record<string, unknown>> | undefined) || [];
    const success = res.ok && accepted.length > 0;
    const errorMessage = success
      ? null
      : (rejected.length > 0 ? JSON.stringify(rejected) : `ETA submission failed [${res.status}]: ${text}`);

    await admin.from("eta_submissions").insert({
      invoice_id: invoiceId,
      action: "submit",
      environment,
      status: success ? "accepted" : "rejected",
      http_status: res.status,
      submission_uuid: (parsed.submissionUUID as string) ?? null,
      document_uuid: accepted[0]?.uuid ?? null,
      long_id: accepted[0]?.longId ?? null,
      request_payload: { documents: [document] },
      response_payload: parsed,
      error_message: errorMessage,
      created_by: user.id,
    });

    await admin
      .from("invoices")
      .update({
        eta_status: success ? "submitted" : "failed",
        eta_uuid: accepted[0]?.uuid ?? null,
        eta_long_id: accepted[0]?.longId ?? null,
        eta_submission_uuid: (parsed.submissionUUID as string) ?? null,
        eta_internal_id: internalId,
        eta_submitted_at: success ? new Date().toISOString() : null,
        eta_environment: environment,
        eta_error: errorMessage,
      })
      .eq("id", invoiceId);

    if (!success) {
      return json({ error: "ETA rejected the invoice", status: res.status, details: parsed }, 422);
    }

    return json({
      ok: true,
      environment,
      submission_uuid: parsed.submissionUUID ?? null,
      eta_uuid: accepted[0]?.uuid ?? null,
      long_id: accepted[0]?.longId ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("eta-invoice error:", message);
    return json({ error: message }, 500);
  }
});