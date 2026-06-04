import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC SHA256 verification
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
  if (!appSecret) {
    console.error('FACEBOOK_APP_SECRET not configured');
    return false;
  }

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

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const signature = req.headers.get('x-hub-signature-256')?.replace('sha256=', '');

    // Meta signature is mandatory
    if (!signature || !(await verifySignature(payload, signature))) {
      console.error('Invalid or missing signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = JSON.parse(payload);
    console.log('Meta deauthorize webhook received:', data);

    const { user_id } = data;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by Facebook ID and mark as deauthorized
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('facebook_id', user_id)
      .single();

    if (findError || !profile) {
      console.log('User not found or already deauthorized:', user_id);
      return new Response(JSON.stringify({ success: true, message: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log deauthorization in audit_logs
    await supabase.from('audit_logs').insert({
      user_id: profile.id,
      action: 'FACEBOOK_DEAUTHORIZE',
      table_name: 'profiles',
      record_id: profile.id,
      new_values: { facebook_id: user_id, deauthorized_at: new Date().toISOString() },
    });

    // Optionally: Revoke Facebook-specific permissions or mark user
    await supabase
      .from('profiles')
      .update({ 
        facebook_deauthorized: true,
        facebook_deauthorized_at: new Date().toISOString() 
      })
      .eq('id', profile.id);

    console.log(`User ${user_id} deauthorized successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deauthorization processed',
        confirmation_code: crypto.randomUUID() 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in meta-deauthorize:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
