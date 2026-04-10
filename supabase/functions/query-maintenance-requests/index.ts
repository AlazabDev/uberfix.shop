import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function validateApiKey(supabase: any, apiKey: string): Promise<{ valid: boolean; consumer?: any; error?: string }> {
  if (!apiKey) {
    return { valid: false, error: "Missing x-api-key header" };
  }

  const { data, error } = await supabase
    .from("api_consumers")
    .select("id, name, is_active, rate_limit_per_minute, company_id, branch_id, total_requests")
    .eq("api_key", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: "Invalid or inactive API key" };
  }

  // Update last_used_at and total_requests
  await supabase
    .from("api_consumers")
    .update({ last_used_at: new Date().toISOString(), total_requests: (data.total_requests || 0) + 1 })
    .eq("id", data.id);

  return { valid: true, consumer: data };
}

async function validateJWT(req: Request): Promise<{ valid: boolean; userId?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { valid: false };
  }

  return { valid: true, userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // === Authentication: require either x-api-key OR valid JWT ===
    const apiKey = req.headers.get("x-api-key");
    let authenticated = false;

    if (apiKey) {
      const apiKeyResult = await validateApiKey(supabase, apiKey);
      if (!apiKeyResult.valid) {
        return new Response(JSON.stringify({ success: false, error: apiKeyResult.error }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticated = true;
    } else {
      const jwtResult = await validateJWT(req);
      if (!jwtResult.valid) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized: provide x-api-key header or Authorization Bearer token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticated = true;
    }

    if (!authenticated) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support both GET (query params) and POST (body)
    let filters: Record<string, string> = {};
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      url.searchParams.forEach((value, key) => {
        filters[key] = value;
      });
    } else {
      const body = await req.json().catch(() => ({}));
      filters = body;
    }

    // Redact PII: only return safe fields, exclude client_email
    let query = supabase
      .from("maintenance_requests")
      .select("id, request_number, title, description, status, workflow_stage, priority, service_type, location, estimated_cost, actual_cost, created_at, updated_at")
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.status) query = query.eq("status", filters.status as any);
    if (filters.priority) query = query.eq("priority", filters.priority as any);
    if (filters.workflow_stage) query = query.eq("workflow_stage", filters.workflow_stage as any);
    if (filters.request_number) query = query.eq("request_number", filters.request_number);
    if (filters.client_phone) query = query.eq("client_phone", filters.client_phone);
    if (filters.client_name) query = query.ilike("client_name", `%${filters.client_name}%`);
    if (filters.id) query = query.eq("id", filters.id);
    
    // Pagination
    const page = parseInt(filters.page || "1");
    const limit = Math.min(parseInt(filters.limit || "20"), 100);
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      data,
      pagination: { page, limit, total: count },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
