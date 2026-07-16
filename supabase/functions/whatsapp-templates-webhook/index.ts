// WhatsApp Templates Webhook Handler
// Receives status updates from Meta for template approval/rejection/quality changes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// crypto is available globally in Deno

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FACEBOOK_APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET")!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN")!;

// Map Meta status to our enum
function mapMetaStatus(metaStatus: string): string {
  const statusMap: Record<string, string> = {
    APPROVED: "approved",
    PENDING: "pending",
    REJECTED: "rejected",
    PAUSED: "paused",
    DISABLED: "disabled",
    DELETED: "deleted",
    IN_APPEAL: "pending",
    PENDING_DELETION: "disabled",
    FLAGGED: "paused",
    REINSTATED: "approved",
  };
  return statusMap[metaStatus?.toUpperCase()] || "pending";
}

// Map Meta quality to our enum
function mapMetaQuality(score: string | undefined): string {
  if (!score) return "unknown";
  const qualityMap: Record<string, string> = {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
    GREEN: "high",
    YELLOW: "medium",
    RED: "low",
  };
  return qualityMap[score.toUpperCase()] || "unknown";
}

// Verify Meta signature
async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  
  const expectedSignature = signature.replace("sha256=", "");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(FACEBOOK_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  
  return expectedSignature === computedSignature;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Handle Meta webhook verification (GET request)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("[Webhook] Verification request:", { mode, token, challenge });

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("[Webhook] Verification successful");
      return new Response(challenge, { status: 200 });
    }

    console.log("[Webhook] Verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  // Handle webhook events (POST request)
  if (req.method === "POST") {
    const body = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // Fail closed: reject if signing secret is missing or signature invalid
    if (!FACEBOOK_APP_SECRET) {
      console.error("[Webhook] FACEBOOK_APP_SECRET not configured — refusing request");
      return new Response("Misconfigured", { status: 500 });
    }
    if (!(await verifySignature(body, signature))) {
      console.error("[Webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.error("[Webhook] Invalid JSON:", e);
      return new Response("Invalid JSON", { status: 400 });
    }

    console.log("[Webhook] Received payload:", JSON.stringify(payload));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const correlationId = crypto.randomUUID();

    try {
      // Process each entry
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const { field, value } = change;

          console.log(`[${correlationId}] Processing field: ${field}`);

          // Handle template status updates
          if (field === "message_template_status_update") {
            const { message_template_id, message_template_name, event, reason } = value;
            const newStatus = mapMetaStatus(event);

            console.log(`[${correlationId}] Template status update:`, {
              id: message_template_id,
              name: message_template_name,
              event,
              newStatus,
              reason,
            });

            // Find template by Meta ID or name
            const { data: template } = await supabase
              .from("wa_templates")
              .select("id, tenant_id, status")
              .or(`meta_template_id.eq.${message_template_id},meta_template_name.eq.${message_template_name}`)
              .single();

            if (template) {
              await supabase
                .from("wa_templates")
                .update({
                  status: newStatus,
                  rejection_reason: reason || null,
                  ...(newStatus === "approved" && { approved_at: new Date().toISOString() }),
                  ...(newStatus === "rejected" && { rejected_at: new Date().toISOString() }),
                  is_locked: ["approved", "pending"].includes(newStatus),
                })
                .eq("id", template.id);

              // Log event
              await supabase.from("wa_template_events").insert({
                template_id: template.id,
                tenant_id: template.tenant_id,
                event_type: "status_update",
                event_source: "meta_webhook",
                old_status: template.status,
                new_status: newStatus,
                metadata: { reason, meta_event: event },
                correlation_id: correlationId,
              });

              console.log(`[${correlationId}] Updated template ${template.id} to ${newStatus}`);
            } else {
              console.log(`[${correlationId}] Template not found: ${message_template_id}`);
            }
          }

          // Handle template quality updates
          if (field === "message_template_quality_update") {
            const { message_template_id, message_template_name, new_quality_score, reason } = value;
            const newQuality = mapMetaQuality(new_quality_score);

            console.log(`[${correlationId}] Template quality update:`, {
              id: message_template_id,
              name: message_template_name,
              newQuality,
              reason,
            });

            const { data: template } = await supabase
              .from("wa_templates")
              .select("id, tenant_id, quality")
              .or(`meta_template_id.eq.${message_template_id},meta_template_name.eq.${message_template_name}`)
              .single();

            if (template) {
              await supabase
                .from("wa_templates")
                .update({
                  quality: newQuality,
                  quality_reason: reason || null,
                })
                .eq("id", template.id);

              await supabase.from("wa_template_events").insert({
                template_id: template.id,
                tenant_id: template.tenant_id,
                event_type: "quality_update",
                event_source: "meta_webhook",
                old_quality: template.quality,
                new_quality: newQuality,
                metadata: { reason, new_quality_score },
                correlation_id: correlationId,
              });

              console.log(`[${correlationId}] Updated template ${template.id} quality to ${newQuality}`);
            }
          }

          // Handle template category updates
          if (field === "template_category_update") {
            const { message_template_id, message_template_name, previous_category, new_category } = value;

            console.log(`[${correlationId}] Template category update:`, {
              id: message_template_id,
              name: message_template_name,
              previous_category,
              new_category,
            });

            const { data: template } = await supabase
              .from("wa_templates")
              .select("id, tenant_id, category")
              .or(`meta_template_id.eq.${message_template_id},meta_template_name.eq.${message_template_name}`)
              .single();

            if (template) {
              await supabase
                .from("wa_templates")
                .update({
                  category: new_category?.toLowerCase() || template.category,
                })
                .eq("id", template.id);

              await supabase.from("wa_template_events").insert({
                template_id: template.id,
                tenant_id: template.tenant_id,
                event_type: "category_update",
                event_source: "meta_webhook",
                metadata: { previous_category, new_category },
                correlation_id: correlationId,
              });

              console.log(`[${correlationId}] Updated template ${template.id} category to ${new_category}`);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`[${correlationId}] Webhook processing error:`, error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
