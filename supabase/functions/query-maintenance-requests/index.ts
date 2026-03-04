import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    let query = supabase
      .from("maintenance_requests")
      .select("id, request_number, title, description, status, workflow_stage, priority, service_type, client_name, client_phone, client_email, location, estimated_cost, actual_cost, created_at, updated_at")
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
