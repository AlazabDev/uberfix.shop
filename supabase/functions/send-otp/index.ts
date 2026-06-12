import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

function checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (record && now > record.resetTime) {
    rateLimitStore.delete(identifier);
  }

  const currentRecord = rateLimitStore.get(identifier);

  if (!currentRecord) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  if (currentRecord.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: currentRecord.resetTime };
  }

  currentRecord.count++;
  return { allowed: true, remaining: config.maxRequests - currentRecord.count, resetTime: currentRecord.resetTime };
}

const OTP_RATE_LIMIT: RateLimitConfig = { windowMs: 10 * 60 * 1000, maxRequests: 5 };
const GLOBAL_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 60 * 1000, maxRequests: 100 };

/**
 * Send OTP via WhatsApp (primary) or Twilio SMS (fallback)
 */
async function sendViaWhatsApp(phone: string, otp: string): Promise<boolean> {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!accessToken || !phoneNumberId) {
    console.warn('⚠️ WhatsApp not configured');
    return false;
  }

  // Format phone for WhatsApp (remove + prefix)
  const waPhone = phone.replace(/^\+/, '');

  try {
    // Try sending as a template message first (more reliable)
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waPhone,
          type: 'text',
          text: {
            body: `رمز التحقق من UberFix: ${otp}\n\nصالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص.`
          }
        }),
      }
    );

    const result = await response.json();

    if (response.ok && result.messages?.[0]?.id) {
      console.log('✅ OTP sent via WhatsApp:', result.messages[0].id);
      return true;
    }

    console.error('❌ WhatsApp API error:', result);
    return false;
  } catch (error) {
    console.error('❌ WhatsApp send failed:', error);
    return false;
  }
}

async function sendViaTwilio(phone: string, otp: string): Promise<boolean> {
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioSid || !twilioToken || !twilioPhone) {
    console.warn('⚠️ Twilio not configured');
    return false;
  }

  try {
    const message = `رمز التحقق من UberFix: ${otp}. صالح لمدة 10 دقائق.`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: twilioPhone, Body: message }),
      }
    );

    const twilioResult = await response.json();
    if (response.ok) {
      console.log('✅ OTP sent via Twilio SMS:', twilioResult.sid);
      return true;
    }
    console.error('❌ Twilio error:', twilioResult);
    return false;
  } catch (error) {
    console.error('❌ Twilio send failed:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 'unknown';

    const globalCheck = checkRateLimit(`ip:${clientIP}`, GLOBAL_RATE_LIMIT);
    if (!globalCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد ساعة.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, action = 'verify', channel = 'whatsapp' } = await req.json();

    if (!phone) throw new Error('Phone number is required');

    const egyptianPhoneRegex = /^(\+20|0020|20)?1[0125]\d{8}$/;
    if (!egyptianPhoneRegex.test(phone.replace(/\s/g, ''))) {
      throw new Error('رقم الهاتف غير صحيح. يجب أن يكون رقم مصري صالح.');
    }

    const phoneCheck = checkRateLimit(`phone:${phone}`, OTP_RATE_LIMIT);
    if (!phoneCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many OTP requests',
          message: 'لقد تجاوزت الحد المسموح من طلبات OTP لهذا الرقم. يرجى المحاولة بعد 10 دقائق.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete old OTPs for this phone
    await supabaseClient
      .from('otp_verifications')
      .delete()
      .eq('phone', phone)
      .eq('verified', false);

    // Store OTP in database
    const otpHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp));
    const otpHash = Array.from(new Uint8Array(otpHashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
    const { error: dbError } = await supabaseClient
      .from('otp_verifications')
      .insert({ phone, otp_code_hash: otpHash, expires_at: expiresAt.toISOString(), action });

    if (dbError) throw dbError;

    // Send OTP: WhatsApp first, SMS fallback
    let sentVia = 'none';

    if (channel === 'whatsapp') {
      const whatsappSent = await sendViaWhatsApp(phone, otp);
      if (whatsappSent) {
        sentVia = 'whatsapp';
      } else {
        // Fallback to SMS
        const smsSent = await sendViaTwilio(phone, otp);
        sentVia = smsSent ? 'sms' : 'none';
      }
    } else {
      const smsSent = await sendViaTwilio(phone, otp);
      sentVia = smsSent ? 'sms' : 'none';
    }

    if (sentVia === 'none') {
      console.warn('⚠️ OTP stored in DB but could not be sent via any channel');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: sentVia === 'whatsapp' 
          ? 'تم إرسال رمز التحقق عبر واتساب' 
          : sentVia === 'sms' 
            ? 'تم إرسال رمز التحقق عبر رسالة نصية'
            : 'تم إنشاء رمز التحقق',
        channel: sentVia,
        expiresIn: 600,
        remaining: phoneCheck.remaining,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-otp:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
