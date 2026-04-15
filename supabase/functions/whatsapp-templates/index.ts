// WhatsApp Templates Management Edge Function
// Handles: List, Create, Submit to Meta, Sync from Meta, Update, Delete

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const WHATSAPP_BUSINESS_ACCOUNT_ID = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID")!;

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: { header_handle?: string[]; body_text?: string[][] };
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  quality_score?: { score: string };
  rejected_reason?: string;
  components: TemplateComponent[];
}

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

// Build Meta API components from our format
function buildMetaComponents(template: any): TemplateComponent[] {
  const components: TemplateComponent[] = [];

  // Header
  if (template.header_type && template.header_type !== "none") {
    const header: TemplateComponent = {
      type: "HEADER",
      format: template.header_type.toUpperCase() as "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT",
    };
    if (template.header_type === "text" && template.header_content) {
      header.text = template.header_content;
    }
    components.push(header);
  }

  // Body (required)
  components.push({
    type: "BODY",
    text: template.body_text,
  });

  // Footer
  if (template.footer_text) {
    components.push({
      type: "FOOTER",
      text: template.footer_text,
    });
  }

  // Buttons
  if (template.buttons && template.buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: template.buttons.map((btn: any) => ({
        type: btn.type?.toUpperCase() || "QUICK_REPLY",
        text: btn.text,
        ...(btn.url && { url: btn.url }),
        ...(btn.phone_number && { phone_number: btn.phone_number }),
      })),
    });
  }

  return components;
}

// Create Service Role Supabase client (bypasses RLS)
function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Create authenticated Supabase client for user verification
function createAuthClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

// Log template event
async function logEvent(
  supabase: any,
  templateId: string,
  tenantId: string,
  actorId: string | null,
  eventType: string,
  eventSource: string,
  metadata: any = {},
  correlationId?: string
) {
  await supabase.from("wa_template_events").insert({
    template_id: templateId,
    tenant_id: tenantId,
    actor_id: actorId,
    event_type: eventType,
    event_source: eventSource,
    metadata,
    correlation_id: correlationId,
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use auth client only for user verification
  const authClient = createAuthClient(authHeader);
  
  // Get current user
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use service client for all database operations (bypasses RLS)
  const supabase = createServiceClient();

  // Get user's tenant/company using service client
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
  }

  // Allow users without company_id - use their user.id as tenant_id
  // This supports owner/admin users who may not have a company assigned
  const tenantId = profile?.company_id || user.id;
  const userRole = profile?.role || "customer";
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const correlationId = crypto.randomUUID();

  console.log(`[${correlationId}] Action: ${action}, User: ${user.id}, Tenant: ${tenantId}, Role: ${userRole}`);

  try {
    switch (action) {
      // =====================================================
      // LIST TEMPLATES
      // =====================================================
      case "list": {
        const status = url.searchParams.get("status");
        const category = url.searchParams.get("category");
        const language = url.searchParams.get("language");
        const search = url.searchParams.get("search");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const sortBy = url.searchParams.get("sortBy") || "updated_at";
        const sortOrder = url.searchParams.get("sortOrder") || "desc";

        let query = supabase
          .from("wa_templates")
          .select("*", { count: "exact" })
          .eq("tenant_id", tenantId)
          .neq("status", "deleted");

        if (status) query = query.eq("status", status);
        if (category) query = query.eq("category", category);
        if (language) query = query.eq("language", language);
        if (search) query = query.ilike("name", `%${search}%`);

        query = query.order(sortBy, { ascending: sortOrder === "asc" });
        query = query.range((page - 1) * limit, page * limit - 1);

        const { data: templates, count, error } = await query;

        if (error) throw error;

        // Get stats - calculate inline instead of using RPC to avoid potential missing function errors
        const { data: allTemplates } = await supabase
          .from("wa_templates")
          .select("status, quality")
          .eq("tenant_id", tenantId)
          .neq("status", "deleted");

        const stats = {
          total: allTemplates?.length || 0,
          draft: 0,
          submitted: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          paused: 0,
          disabled: 0,
          quality_high: 0,
          quality_medium: 0,
          quality_low: 0,
        };

        allTemplates?.forEach((t) => {
          if (t.status && t.status in stats) {
            (stats as any)[t.status]++;
          }
          if (t.quality === "high") stats.quality_high++;
          if (t.quality === "medium") stats.quality_medium++;
          if (t.quality === "low") stats.quality_low++;
        });

        return new Response(
          JSON.stringify({
            templates,
            total: count,
            page,
            limit,
            stats,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // =====================================================
      // GET SINGLE TEMPLATE
      // =====================================================
      case "get": {
        const templateId = url.searchParams.get("id");
        if (!templateId) {
          return new Response(JSON.stringify({ error: "Template ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: template, error } = await supabase
          .from("wa_templates")
          .select("*")
          .eq("id", templateId)
          .eq("tenant_id", tenantId)
          .single();

        if (error || !template) {
          return new Response(JSON.stringify({ error: "Template not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get events history
        const { data: events } = await supabase
          .from("wa_template_events")
          .select("*")
          .eq("template_id", templateId)
          .order("created_at", { ascending: false })
          .limit(50);

        return new Response(
          JSON.stringify({ template, events: events || [] }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // =====================================================
      // CREATE TEMPLATE (Draft)
      // =====================================================
      case "create": {
        if (!["admin", "manager", "owner"].includes(userRole)) {
          return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { name, category, language, header_type, header_content, body_text, footer_text, buttons } = body;

        // Validation
        if (!name || !body_text) {
          return new Response(JSON.stringify({ error: "Name and body_text are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate template name (Meta requirements)
        const nameRegex = /^[a-z][a-z0-9_]*$/;
        if (!nameRegex.test(name)) {
          return new Response(
            JSON.stringify({
              error: "Template name must be lowercase, start with a letter, and contain only letters, numbers, and underscores",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Validate placeholders are sequential
        const placeholders = body_text.match(/\{\{(\d+)\}\}/g) || [];
        const numbers = placeholders.map((p: string) => parseInt(p.replace(/[{}]/g, ""))).sort((a: number, b: number) => a - b);
        for (let i = 0; i < numbers.length; i++) {
          if (numbers[i] !== i + 1) {
            return new Response(
              JSON.stringify({ error: "Placeholders must be sequential starting from {{1}}" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }

        const components = buildMetaComponents({
          header_type,
          header_content,
          body_text,
          footer_text,
          buttons,
        });

        const { data: template, error } = await supabase
          .from("wa_templates")
          .insert({
            tenant_id: tenantId,
            created_by: user.id,
            name,
            category: category || "utility",
            language: language || "ar",
            header_type: header_type || "none",
            header_content,
            body_text,
            footer_text,
            buttons: buttons || [],
            components,
            status: "draft",
          })
          .select()
          .single();

        if (error) {
          console.error(`[${correlationId}] Create error:`, error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await logEvent(supabase, template.id, tenantId, user.id, "created", "user", { name }, correlationId);

        return new Response(JSON.stringify({ template }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // =====================================================
      // UPDATE TEMPLATE
      // =====================================================
      case "update": {
        if (!["admin", "manager", "owner"].includes(userRole)) {
          return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
          return new Response(JSON.stringify({ error: "Template ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if template exists and is editable
        const { data: existing } = await supabase
          .from("wa_templates")
          .select("*")
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .single();

        if (!existing) {
          return new Response(JSON.stringify({ error: "Template not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (existing.is_locked) {
          return new Response(JSON.stringify({ error: "Template is locked and cannot be edited" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Rebuild components if content changed
        let components = existing.components;
        if (updates.body_text || updates.header_type || updates.footer_text || updates.buttons) {
          components = buildMetaComponents({
            header_type: updates.header_type ?? existing.header_type,
            header_content: updates.header_content ?? existing.header_content,
            body_text: updates.body_text ?? existing.body_text,
            footer_text: updates.footer_text ?? existing.footer_text,
            buttons: updates.buttons ?? existing.buttons,
          });
        }

        const { data: template, error } = await supabase
          .from("wa_templates")
          .update({
            ...updates,
            components,
            version: existing.version + 1,
          })
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .select()
          .single();

        if (error) throw error;

        await logEvent(supabase, id, tenantId, user.id, "updated", "user", { changes: Object.keys(updates) }, correlationId);

        return new Response(JSON.stringify({ template }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // =====================================================
      // SUBMIT TO META FOR APPROVAL
      // =====================================================
      case "submit": {
        if (!["admin", "manager", "owner"].includes(userRole)) {
          return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
          return new Response(JSON.stringify({ error: "Template ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: template } = await supabase
          .from("wa_templates")
          .select("*")
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .single();

        if (!template) {
          return new Response(JSON.stringify({ error: "Template not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Only draft or rejected templates can be submitted
        if (!["draft", "rejected"].includes(template.status)) {
          return new Response(
            JSON.stringify({ error: `Cannot submit template with status: ${template.status}` }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Mark as submitted immediately (async job pattern)
        await supabase
          .from("wa_templates")
          .update({ status: "submitted", submitted_at: new Date().toISOString() })
          .eq("id", id);

        await logEvent(supabase, id, tenantId, user.id, "submitted", "user", { correlation_id: correlationId }, correlationId);

        // Submit to Meta API
        try {
          const metaPayload = {
            name: template.name,
            language: template.language,
            category: template.category.toUpperCase(),
            components: template.components,
          };

          console.log(`[${correlationId}] Submitting to Meta:`, JSON.stringify(metaPayload));

          const metaResponse = await fetch(
            `${META_GRAPH_URL}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(metaPayload),
            }
          );

          const metaResult = await metaResponse.json();
          console.log(`[${correlationId}] Meta response:`, JSON.stringify(metaResult));

          if (!metaResponse.ok) {
            // Revert to draft on failure
            await supabase
              .from("wa_templates")
              .update({
                status: "draft",
                rejection_reason: metaResult.error?.message || "Submission failed",
              })
              .eq("id", id);

            await logEvent(
              supabase,
              id,
              tenantId,
              user.id,
              "submit_failed",
              "meta_api",
              { error: metaResult.error },
              correlationId
            );

            return new Response(
              JSON.stringify({
                error: "Meta API submission failed",
                details: metaResult.error,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          // Update with Meta template ID and set to pending
          await supabase
            .from("wa_templates")
            .update({
              meta_template_id: metaResult.id,
              meta_template_name: template.name,
              status: "pending",
              rejection_reason: null,
            })
            .eq("id", id);

          await logEvent(
            supabase,
            id,
            tenantId,
            user.id,
            "meta_accepted",
            "meta_api",
            { meta_template_id: metaResult.id },
            correlationId
          );

          return new Response(
            JSON.stringify({
              success: true,
              meta_template_id: metaResult.id,
              message: "Template submitted for Meta approval",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } catch (metaError) {
          console.error(`[${correlationId}] Meta API error:`, metaError);

          await supabase
            .from("wa_templates")
            .update({
              status: "draft",
              rejection_reason: "Network error during submission",
            })
            .eq("id", id);

          await logEvent(
            supabase,
            id,
            tenantId,
            user.id,
            "submit_error",
            "system",
            { error: String(metaError) },
            correlationId
          );

          return new Response(
            JSON.stringify({ error: "Failed to connect to Meta API", retry: true }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // =====================================================
      // SYNC FROM META (Pull latest status)
      // =====================================================
      case "sync": {
        console.log(`[${correlationId}] Starting sync from Meta for tenant: ${tenantId}`);

        const metaResponse = await fetch(
          `${META_GRAPH_URL}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?limit=100`,
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            },
          }
        );

        if (!metaResponse.ok) {
          const error = await metaResponse.json();
          console.error(`[${correlationId}] Meta sync error:`, error);
          return new Response(
            JSON.stringify({ error: "Failed to fetch templates from Meta", details: error }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const { data: metaTemplates } = await metaResponse.json();
        let synced = 0;
        let created = 0;
        let updated = 0;

        for (const mt of metaTemplates as MetaTemplate[]) {
          const status = mapMetaStatus(mt.status);
          const quality = mapMetaQuality(mt.quality_score?.score);

          // Check if template exists locally
          const { data: existing } = await supabase
            .from("wa_templates")
            .select("id, status, quality")
            .eq("tenant_id", tenantId)
            .eq("meta_template_id", mt.id)
            .single();

          if (existing) {
            // Update if status or quality changed
            if (existing.status !== status || existing.quality !== quality) {
              await supabase
                .from("wa_templates")
                .update({
                  status,
                  quality,
                  rejection_reason: mt.rejected_reason || null,
                  ...(status === "approved" && { approved_at: new Date().toISOString() }),
                  ...(status === "rejected" && { rejected_at: new Date().toISOString() }),
                })
                .eq("id", existing.id);

              await logEvent(
                supabase,
                existing.id,
                tenantId,
                null,
                "synced",
                "meta_sync",
                { old_status: existing.status, new_status: status, quality },
                correlationId
              );
              updated++;
            }
          } else {
            // Create new template from Meta
            const bodyComponent = mt.components.find((c) => c.type === "BODY");
            const headerComponent = mt.components.find((c) => c.type === "HEADER");
            const footerComponent = mt.components.find((c) => c.type === "FOOTER");
            const buttonsComponent = mt.components.find((c) => c.type === "BUTTONS");

            const { data: newTemplate } = await supabase
              .from("wa_templates")
              .insert({
                tenant_id: tenantId,
                meta_template_id: mt.id,
                meta_template_name: mt.name,
                name: mt.name,
                category: mt.category?.toLowerCase() || "utility",
                language: mt.language || "ar",
                status,
                quality,
                rejection_reason: mt.rejected_reason,
                header_type: headerComponent?.format?.toLowerCase() || "none",
                header_content: headerComponent?.text,
                body_text: bodyComponent?.text || "",
                footer_text: footerComponent?.text,
                buttons: buttonsComponent?.buttons || [],
                components: mt.components,
                is_locked: ["approved", "pending"].includes(status),
                ...(status === "approved" && { approved_at: new Date().toISOString() }),
              })
              .select()
              .single();

            if (newTemplate) {
              await logEvent(
                supabase,
                newTemplate.id,
                tenantId,
                null,
                "imported",
                "meta_sync",
                { meta_name: mt.name },
                correlationId
              );
              created++;
            }
          }
          synced++;
        }

        return new Response(
          JSON.stringify({
            success: true,
            synced,
            created,
            updated,
            message: `Synced ${synced} templates (${created} new, ${updated} updated)`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // =====================================================
      // DELETE TEMPLATE
      // =====================================================
      case "delete": {
        if (!["admin", "owner"].includes(userRole)) {
          return new Response(JSON.stringify({ error: "Only admins can delete templates" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
          return new Response(JSON.stringify({ error: "Template ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: template } = await supabase
          .from("wa_templates")
          .select("*")
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .single();

        if (!template) {
          return new Response(JSON.stringify({ error: "Template not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // If template exists in Meta, delete from Meta first
        if (template.meta_template_id && template.meta_template_name) {
          try {
            await fetch(
              `${META_GRAPH_URL}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?name=${template.meta_template_name}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                },
              }
            );
          } catch (e) {
            console.error(`[${correlationId}] Failed to delete from Meta:`, e);
          }
        }

        // Soft delete
        await supabase
          .from("wa_templates")
          .update({ status: "deleted" })
          .eq("id", id);

        await logEvent(supabase, id, tenantId, user.id, "deleted", "user", {}, correlationId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // =====================================================
      // GET STATS
      // =====================================================
      case "stats": {
        const { data: templates } = await supabase
          .from("wa_templates")
          .select("status, quality")
          .eq("tenant_id", tenantId)
          .neq("status", "deleted");

        const stats = {
          total: templates?.length || 0,
          draft: 0,
          submitted: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          paused: 0,
          disabled: 0,
          quality_high: 0,
          quality_medium: 0,
          quality_low: 0,
        };

        templates?.forEach((t) => {
          if (t.status in stats) {
            (stats as any)[t.status]++;
          }
          if (t.quality === "high") stats.quality_high++;
          if (t.quality === "medium") stats.quality_medium++;
          if (t.quality === "low") stats.quality_low++;
        });

        return new Response(JSON.stringify({ stats }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // =====================================================
      // SEND TEST MESSAGE using approved template
      // =====================================================
      case "send-test": {
        if (!["admin", "manager", "owner"].includes(userRole)) {
          return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { id, phone, parameters } = body;

        if (!id || !phone) {
          return new Response(JSON.stringify({ error: "Template ID and phone number are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate phone format
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
        if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
          return new Response(JSON.stringify({ error: "Invalid phone number format" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: template } = await supabase
          .from("wa_templates")
          .select("*")
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .single();

        if (!template) {
          return new Response(JSON.stringify({ error: "Template not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (template.status !== "approved") {
          return new Response(JSON.stringify({ error: "Only approved templates can be sent" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        if (!PHONE_NUMBER_ID) {
          return new Response(JSON.stringify({ error: "WHATSAPP_PHONE_NUMBER_ID not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Build template message payload
        const templatePayload: any = {
          messaging_product: "whatsapp",
          to: cleanPhone.startsWith("+") ? cleanPhone.slice(1) : cleanPhone,
          type: "template",
          template: {
            name: template.meta_template_name || template.name,
            language: { code: template.language },
          },
        };

        // Add components with parameters if provided
        const componentParams: any[] = [];

        // Header parameters - only add non-empty ones
        if (parameters?.header && parameters.header.length > 0) {
          const validHeaderParams = parameters.header.filter((p: string) => p && p.trim() !== '');
          if (validHeaderParams.length > 0) {
            componentParams.push({
              type: "header",
              parameters: validHeaderParams.map((p: string) => ({ type: "text", text: p.trim() })),
            });
          }
        }

        // Body parameters - only add non-empty ones
        if (parameters?.body && parameters.body.length > 0) {
          const validBodyParams = parameters.body.filter((p: string) => p && p.trim() !== '');
          if (validBodyParams.length > 0) {
            componentParams.push({
              type: "body",
              parameters: validBodyParams.map((p: string) => ({ type: "text", text: p.trim() })),
            });
          }
        }

        if (componentParams.length > 0) {
          templatePayload.template.components = componentParams;
        }

        console.log(`[${correlationId}] Sending test to ${cleanPhone}:`, JSON.stringify(templatePayload));

        try {
          const sendResponse = await fetch(
            `${META_GRAPH_URL}/${PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(templatePayload),
            }
          );

          const sendResult = await sendResponse.json();
          console.log(`[${correlationId}] Send result:`, JSON.stringify(sendResult));

          if (!sendResponse.ok) {
            return new Response(
              JSON.stringify({ error: "Failed to send test message", details: sendResult.error }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          await logEvent(supabase, id, tenantId, user.id, "test_sent", "user", { phone: cleanPhone, message_id: sendResult.messages?.[0]?.id }, correlationId);

          return new Response(
            JSON.stringify({ success: true, message_id: sendResult.messages?.[0]?.id }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } catch (sendError) {
          console.error(`[${correlationId}] Send error:`, sendError);
          return new Response(
            JSON.stringify({ error: "Network error sending message" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // =====================================================
      // CHECK CONFIG - Verify if secrets are configured
      // =====================================================
      case "check-config": {
        const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
        const wabaId = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");
        const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

        return new Response(
          JSON.stringify({
            accessToken: !!accessToken && accessToken.length > 10,
            wabaId: !!wabaId && /^\d+$/.test(wabaId),
            phoneNumberId: !!phoneNumberId && phoneNumberId.length > 5,
            verifyToken: !!verifyToken && verifyToken.length > 5,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // =====================================================
      // UPDATE CONFIG - Note: Secrets can only be updated via Supabase dashboard
      // =====================================================
      case "update-config": {
        // This action informs the user that secrets must be updated through Supabase
        // We cannot programmatically update environment secrets from edge functions
        return new Response(
          JSON.stringify({
            error: "Secrets must be updated through Supabase dashboard or Lovable secrets manager",
            instructions: [
              "1. Go to Supabase Dashboard > Edge Functions > Secrets",
              "2. Update the following secrets:",
              "   - WHATSAPP_ACCESS_TOKEN",
              "   - WHATSAPP_BUSINESS_ACCOUNT_ID", 
              "   - WHATSAPP_PHONE_NUMBER_ID",
              "   - WHATSAPP_VERIFY_TOKEN",
              "Or use Lovable's secrets manager to add/update these values."
            ]
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
