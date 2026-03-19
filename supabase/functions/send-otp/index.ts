import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

function checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean old entries
  if (record && now > record.resetTime) {
    rateLimitStore.delete(identifier);
  }

  const currentRecord = rateLimitStore.get(identifier);

  if (!currentRecord) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  if (currentRecord.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: currentRecord.resetTime };
  }

  currentRecord.count++;
  return { allowed: true, remaining: config.maxRequests - currentRecord.count, resetTime: currentRecord.resetTime };
}

// Rate limit config: 5 requests per phone number per 10 minutes
const OTP_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
};

// Global rate limit: 100 requests per IP per hour
const GLOBAL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for global rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check global rate limit by IP
    const globalCheck = checkRateLimit(`ip:${clientIP}`, GLOBAL_RATE_LIMIT);
    if (!globalCheck.allowed) {
      console.warn(`🚫 Global rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد ساعة.',
          retryAfter: Math.ceil((globalCheck.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((globalCheck.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': GLOBAL_RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(globalCheck.resetTime / 1000).toString(),
          },
        }
      );
    }

    const { phone, action = 'verify' } = await req.json();

    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Validate Egyptian phone format
    const egyptianPhoneRegex = /^(\+20|0020|20)?1[0125]\d{8}$/;
    if (!egyptianPhoneRegex.test(phone.replace(/\s/g, ''))) {
      throw new Error('رقم الهاتف غير صحيح. يجب أن يكون رقم مصري صالح.');
    }

    // Check per-phone rate limit
    const phoneCheck = checkRateLimit(`phone:${phone}`, OTP_RATE_LIMIT);
    if (!phoneCheck.allowed) {
      console.warn(`🚫 Phone rate limit exceeded for: ${phone}`);
      return new Response(
        JSON.stringify({
          error: 'Too many OTP requests',
          message: 'لقد تجاوزت الحد المسموح من طلبات OTP لهذا الرقم. يرجى المحاولة بعد 10 دقائق.',
          retryAfter: Math.ceil((phoneCheck.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((phoneCheck.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': OTP_RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(phoneCheck.resetTime / 1000).toString(),
          },
        }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
    const { error: dbError } = await supabaseClient
      .from('otp_verifications')
      .insert({
        phone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        action,
      });

    if (dbError) throw dbError;

    // Send OTP via Twilio
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (twilioSid && twilioToken && twilioPhone) {
      const message = `رمز التحقق من UberFix: ${otp}. صالح لمدة 10 دقائق.`;
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioPhone,
            Body: message,
          }),
        }
      );

      const twilioResult = await response.json();
      
      if (!response.ok) {
        console.error('Twilio error:', twilioResult);
      } else {
        console.log('✅ OTP sent via Twilio:', twilioResult.sid);
      }
    } else {
      console.warn('⚠️ Twilio not configured — OTP stored in DB only (code redacted from logs)');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إرسال رمز التحقق',
        expiresIn: 600, // seconds
        remaining: phoneCheck.remaining,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': OTP_RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': phoneCheck.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(phoneCheck.resetTime / 1000).toString(),
        } 
      }
    );
  } catch (error) {
    console.error('Error in send-otp:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
