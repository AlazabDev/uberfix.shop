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
    console.log('Meta delete data webhook received:', data);

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

    // Find user by Facebook ID
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('facebook_id', user_id)
      .single();

    if (findError || !profile) {
      console.log('User not found:', user_id);
      return new Response(
        JSON.stringify({ 
          url: `https://zrrffsjbfkphridqyais.supabase.co/delete-data-confirmation?status=not_found`,
          confirmation_code: crypto.randomUUID()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const confirmationCode = crypto.randomUUID();

    // Log deletion request
    await supabase.from('audit_logs').insert({
      user_id: profile.id,
      action: 'FACEBOOK_DELETE_REQUEST',
      table_name: 'profiles',
      record_id: profile.id,
      new_values: { 
        facebook_id: user_id,
        requested_at: new Date().toISOString(),
        confirmation_code: confirmationCode
      },
    });

    // Anonymize or delete user data (GDPR compliance)
    // Option 1: Soft delete - mark as deleted
    await supabase
      .from('profiles')
      .update({ 
        is_deleted: true,
        facebook_id: null,
        facebook_deauthorized: true,
        email: `deleted_${confirmationCode}@deleted.local`,
        name: `Deleted User ${confirmationCode.slice(0, 8)}`,
        phone: null,
        avatar_url: null,
        deleted_at: new Date().toISOString(),
        deletion_reason: 'facebook_data_deletion_request'
      })
      .eq('id', profile.id);

    // Option 2: Hard delete - uncomment if you prefer complete removal
    // await supabase.from('profiles').delete().eq('id', profile.id);

    console.log(`User data deletion processed for Facebook ID: ${user_id}`);

    // Return status URL as per Meta requirements
    return new Response(
      JSON.stringify({ 
        url: `https://zrrffsjbfkphridqyais.supabase.co/delete-data-confirmation?code=${confirmationCode}`,
        confirmation_code: confirmationCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in meta-delete-data:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
