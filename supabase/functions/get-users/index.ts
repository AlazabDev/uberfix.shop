import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
    }

    const { data: adminRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      return jsonResponse({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    // Get all users except the current user
    const { data, error } = await supabaseClient.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    // Filter out current user and format the response
    const users = data.users
      .filter(u => u.id !== user.id)
      .map(u => ({
        id: u.id,
        email: u.email || '',
        raw_user_meta_data: u.user_metadata || {},
      }));

    return jsonResponse({ users });
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
