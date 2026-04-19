import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FacebookAuthRequest {
  facebookId: string;
  email?: string;
  name: string;
  pictureUrl?: string;
  accessToken: string;
}

/**
 * يتحقق من التوكن مع Graph API ويعيد facebookId الحقيقي.
 * هذا يمنع هجمات انتحال الهوية (account takeover).
 */
async function verifyFacebookToken(accessToken: string): Promise<{ id: string; email?: string } | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/me?fields=id,email&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;
    return { id: String(data.id), email: data.email };
  } catch (err) {
    console.error('Facebook token verification failed:', err);
    return null;
  }
}

/**
 * البحث عن مستخدم Supabase ببريد إلكتروني عبر pagination كامل.
 */
async function findUserByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;
    const found = data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page++;
    if (page > 50) return null; // حد أمان
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { facebookId, email, name, pictureUrl, accessToken }: FacebookAuthRequest = await req.json();

    if (!facebookId || !name || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: facebookId, name, accessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ التحقق من التوكن مع Facebook قبل أي عملية كتابة
    const verified = await verifyFacebookToken(accessToken);
    if (!verified) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired Facebook access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (verified.id !== facebookId) {
      console.warn('Facebook ID mismatch attempt:', { claimed: facebookId, actual: verified.id });
      return new Response(
        JSON.stringify({ error: 'Token does not belong to the provided facebookId' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // استخدم البريد الموثَّق من Facebook إن وُجد
    const safeEmail = verified.email || email;

    const { data: existingFbUser } = await supabaseAdmin
      .from('facebook_users')
      .select('*')
      .eq('facebook_id', facebookId)
      .single();

    let supabaseUserId: string | null = null;
    let isNewUser = false;

    if (existingFbUser) {
      supabaseUserId = existingFbUser.supabase_user_id;
      // ❌ لا نخزن access_token في قاعدة البيانات (حماية الخصوصية)
      await supabaseAdmin
        .from('facebook_users')
        .update({
          name,
          email: safeEmail,
          picture_url: pictureUrl,
          last_login_at: new Date().toISOString(),
        })
        .eq('facebook_id', facebookId);
    } else {
      isNewUser = true;
      if (safeEmail) {
        const existingUser = await findUserByEmail(supabaseAdmin, safeEmail);
        if (existingUser) {
          supabaseUserId = existingUser.id;
        } else {
          const randomPassword = crypto.randomUUID() + crypto.randomUUID();
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: safeEmail,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              full_name: name,
              avatar_url: pictureUrl,
              provider: 'facebook',
              facebook_id: facebookId,
            }
          });
          if (!createError && newUser.user) {
            supabaseUserId = newUser.user.id;
          }
        }
      }

      const { error: insertError } = await supabaseAdmin
        .from('facebook_users')
        .insert({
          facebook_id: facebookId,
          email: safeEmail,
          name,
          picture_url: pictureUrl,
          // access_token: غير مخزَّن عمداً
          supabase_user_id: supabaseUserId,
        });
      if (insertError) {
        console.error('Error inserting Facebook user:', insertError);
        throw insertError;
      }
    }

    let sessionToken: string | null = null;
    if (supabaseUserId && safeEmail) {
      const { data: sessionData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: safeEmail,
      });
      if (sessionData) {
        sessionToken = sessionData.properties?.hashed_token || null;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        supabaseUserId,
        facebookId,
        name,
        email: safeEmail,
        pictureUrl,
        sessionToken,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Facebook auth sync error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
