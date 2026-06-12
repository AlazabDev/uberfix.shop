import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage (in-memory for edge function instance)
const verifyAttempts = new Map<string, { count: number; firstAttempt: number }>();

const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 5 * 60 * 1000;

function checkRateLimit(phone: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const key = `verify:${phone}`;
  const attempts = verifyAttempts.get(key);

  if (!attempts) {
    verifyAttempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (now - attempts.firstAttempt > VERIFY_WINDOW_MS) {
    verifyAttempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (attempts.count >= MAX_VERIFY_ATTEMPTS) {
    const remainingTime = Math.ceil((VERIFY_WINDOW_MS - (now - attempts.firstAttempt)) / 1000);
    return { allowed: false, remainingTime };
  }

  attempts.count++;
  verifyAttempts.set(key, attempts);
  return { allowed: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      throw new Error('Phone and OTP are required');
    }

    // Check rate limit
    const rateCheck = checkRateLimit(phone);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `محاولات كثيرة جداً. الرجاء الانتظار ${rateCheck.remainingTime} ثانية.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Hash submitted OTP and look up by hash
    const otpHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp));
    const otpHash = Array.from(new Uint8Array(otpHashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('otp_code_hash', otpHash)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) throw otpError;

    if (!otpRecord) {
      console.log(`❌ Invalid OTP attempt for phone: ${phone.slice(0, 6)}***`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from('otp_verifications')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    console.log('✅ OTP verified for:', phone.slice(0, 6) + '***');

    // ====== Create or find user and generate session ======
    
    // Generate a pseudo-email from the phone number for Supabase auth
    const cleanPhone = phone.replace(/\+/g, '');
    const phoneEmail = `phone_${cleanPhone}@uberfix.local`;
    const tempPassword = crypto.randomUUID(); // Secure random password

    // Try to find existing user by phone email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string | null = null;

    if (existingUsers?.users) {
      const existingUser = existingUsers.users.find(
        (u) => u.email === phoneEmail || u.phone === phone
      );
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    if (!userId) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: phoneEmail,
        phone: phone,
        password: tempPassword,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: `مستخدم ${phone.slice(-4)}`,
          phone: phone,
          role: 'customer',
          auth_method: 'phone_otp',
        },
      });

      if (createError) {
        console.error('❌ Error creating user:', createError);
        throw new Error('فشل في إنشاء الحساب');
      }

      userId = newUser.user.id;
      console.log('✅ New user created for phone:', phone.slice(0, 6) + '***');
    }

    // Generate a magic link token to create a session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: phoneEmail,
    });

    if (sessionError || !sessionData) {
      console.error('❌ Error generating session link:', sessionError);
      
      // Fallback: sign in with password
      // Update password first
      await (supabaseAdmin.auth.admin as any).updateUser(userId, { password: tempPassword });
      
      // Sign in with the temp password using anon key client
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: phoneEmail,
        password: tempPassword,
      });

      if (signInError || !signInData.session) {
        console.error('❌ Fallback sign-in failed:', signInError);
        // Return success without session - user verified but can't create session
        return new Response(
          JSON.stringify({
            success: true,
            message: 'تم التحقق بنجاح. يرجى تسجيل الدخول.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم التحقق وتسجيل الدخول بنجاح',
          session: {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the generated link to verify and get a session
    if (sessionData.properties?.hashed_token) {
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
        token_hash: sessionData.properties.hashed_token,
        type: 'magiclink',
      });

      if (!verifyError && verifyData?.session) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'تم التحقق وتسجيل الدخول بنجاح',
            session: {
              access_token: verifyData.session.access_token,
              refresh_token: verifyData.session.refresh_token,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If all else fails, use password fallback
    await (supabaseAdmin.auth.admin as any).updateUser(userId, { password: tempPassword });
    
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: fallbackData, error: fallbackError } = await supabaseAnon.auth.signInWithPassword({
      email: phoneEmail,
      password: tempPassword,
    });

    if (fallbackError || !fallbackData.session) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم التحقق بنجاح. يرجى تسجيل الدخول.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم التحقق وتسجيل الدخول بنجاح',
        session: {
          access_token: fallbackData.session.access_token,
          refresh_token: fallbackData.session.refresh_token,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-otp:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
