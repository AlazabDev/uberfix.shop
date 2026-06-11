import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

// Verify Facebook webhook signature using HMAC-SHA256
async function verifySignature(payload: string, signature: string, appSecret: string): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) {
    console.error('Missing or invalid signature format');
    return false;
  }

  try {
    const expectedSig = signature.replace('sha256=', '');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const computedSig = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (expectedSig.length !== computedSig.length) return false;
    let result = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      result |= expectedSig.charCodeAt(i) ^ computedSig.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Fetch lead data from Facebook Graph API
async function fetchLeadData(leadgenId: string, accessToken: string): Promise<any> {
  const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`;
  
  console.log(`Fetching lead data for ID: ${leadgenId}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Facebook API error:', error);
    throw new Error(`Failed to fetch lead: ${error}`);
  }
  
  const data = await response.json();
  console.log('Lead data fetched:', JSON.stringify(data).substring(0, 500));
  
  return data;
}

// Parse field_data from Facebook lead
function parseFieldData(fieldData: any[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  
  if (!Array.isArray(fieldData)) {
    return parsed;
  }
  
  for (const field of fieldData) {
    const name = field.name?.toLowerCase() || '';
    const value = Array.isArray(field.values) ? field.values[0] : field.values;
    
    // Map common field names
    if (name.includes('name') || name === 'full_name') {
      parsed.full_name = value;
    } else if (name.includes('email')) {
      parsed.email = value;
    } else if (name.includes('phone') || name.includes('mobile')) {
      parsed.phone = value;
    } else if (name.includes('city') || name.includes('مدينة')) {
      parsed.city = value;
    } else if (name.includes('address') || name.includes('عنوان')) {
      parsed.address = value;
    } else if (name.includes('service') || name.includes('خدمة')) {
      parsed.service_type = value;
    } else if (name.includes('message') || name.includes('رسالة') || name.includes('description')) {
      parsed.message = value;
    } else {
      // Store unknown fields in the name
      parsed[name] = value;
    }
  }
  
  return parsed;
}

// Create maintenance request from lead
async function createMaintenanceRequest(
  supabase: any,
  lead: any,
  parsedFields: Record<string, string>
): Promise<string | null> {
  try {
    // Get default company and branch
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    const { data: branch } = await supabase
      .from('branches')
      .select('id')
      .limit(1)
      .single();

    if (!company || !branch) {
      console.error('No default company/branch found');
      return null;
    }

    const requestData = {
      title: `طلب من إعلان فيسبوك - ${parsedFields.full_name || 'عميل جديد'}`,
      description: parsedFields.message || `طلب صيانة وارد من إعلان فيسبوك`,
      client_name: parsedFields.full_name || 'عميل من فيسبوك',
      client_phone: parsedFields.phone || null,
      client_email: parsedFields.email || null,
      location: parsedFields.address || parsedFields.city || null,
      service_type: parsedFields.service_type || null,
      channel: 'facebook_lead_ad',
      status: 'pending',
      priority: 'medium',
      company_id: company.id,
      branch_id: branch.id,
    };

    console.log('Creating maintenance request:', JSON.stringify(requestData));

    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert(requestData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating maintenance request:', error);
      return null;
    }

    console.log('Maintenance request created:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error in createMaintenanceRequest:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Webhook verification (GET request from Facebook)
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("Webhook verification request:", { mode, token, challenge });

      const verifyToken = Deno.env.get("FACEBOOK_LEADS_VERIFY_TOKEN") || Deno.env.get("WHATSAPP_VERIFY_TOKEN");
      
      if (mode === "subscribe" && token === verifyToken) {
        console.log("Webhook verified successfully");
        return new Response(challenge, { 
          status: 200,
          headers: corsHeaders 
        });
      } else {
        console.error("Webhook verification failed");
        return new Response("Forbidden", { 
          status: 403,
          headers: corsHeaders 
        });
      }
    }

    // Handle webhook event (POST request from Facebook)
    if (req.method === "POST") {
      const signature = req.headers.get("x-hub-signature-256") || "";
      const payload = await req.text();
      
      console.log("Received webhook event");
      console.log("Payload preview:", payload.substring(0, 500));

      // Verify signature
      const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
      if (!appSecret) {
        console.error("FACEBOOK_APP_SECRET not configured - rejecting webhook");
        return new Response(JSON.stringify({ error: "Service misconfigured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isValid = await verifySignature(payload, signature, appSecret);
      if (!isValid) {
        console.error("Invalid webhook signature - rejecting request");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse the webhook payload
      const data = JSON.parse(payload);
      
      // Check if this is a leadgen event
      if (data.object !== "page") {
        console.log("Not a page event, ignoring");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Initialize Supabase client with service role
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Process each entry
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "leadgen") {
            const leadgenId = change.value?.leadgen_id;
            const formId = change.value?.form_id;
            const pageId = change.value?.page_id;
            const adId = change.value?.ad_id;
            const adgroupId = change.value?.adgroup_id;
            const campaignId = change.value?.campaign_id;

            console.log(`Processing lead: ${leadgenId}`);

            // Check if lead already exists
            const { data: existingLead } = await supabase
              .from("facebook_leads")
              .select("id")
              .eq("leadgen_id", leadgenId)
              .single();

            if (existingLead) {
              console.log(`Lead ${leadgenId} already processed, skipping`);
              continue;
            }

            // Fetch lead data from Facebook Graph API
            const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN"); // Same token works for Graph API
            let leadData = null;
            let parsedFields: Record<string, string> = {};

            if (accessToken) {
              try {
                leadData = await fetchLeadData(leadgenId, accessToken);
                parsedFields = parseFieldData(leadData.field_data || []);
              } catch (error) {
                console.error(`Failed to fetch lead data for ${leadgenId}:`, error);
              }
            }

            // Insert lead into database
            const { data: insertedLead, error: insertError } = await supabase
              .from("facebook_leads")
              .insert({
                leadgen_id: leadgenId,
                form_id: formId,
                page_id: pageId,
                ad_id: adId,
                adgroup_id: adgroupId,
                campaign_id: campaignId,
                full_name: parsedFields.full_name,
                email: parsedFields.email,
                phone: parsedFields.phone,
                city: parsedFields.city,
                address: parsedFields.address,
                service_type: parsedFields.service_type,
                message: parsedFields.message,
                raw_data: change.value,
                field_data: leadData?.field_data || null,
                status: "new",
              })
              .select()
              .single();

            if (insertError) {
              console.error("Error inserting lead:", insertError);
              continue;
            }

            console.log(`Lead ${leadgenId} saved successfully`);

            // Create maintenance request
            const maintenanceRequestId = await createMaintenanceRequest(
              supabase,
              insertedLead,
              parsedFields
            );

            if (maintenanceRequestId) {
              // Update lead with maintenance request ID
              await supabase
                .from("facebook_leads")
                .update({
                  maintenance_request_id: maintenanceRequestId,
                  status: "converted",
                  processed_at: new Date().toISOString(),
                })
                .eq("id", insertedLead.id);

              console.log(`Lead ${leadgenId} converted to maintenance request ${maintenanceRequestId}`);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
