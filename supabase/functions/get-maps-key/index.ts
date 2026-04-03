import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { rateLimit } from '../_shared/rateLimiter.ts';

// Allowed origins for additional validation
const ALLOWED_ORIGINS = [
  'https://uberfix.shop',
  'https://www.uberfix.shop',
  'https://uberfix.alazab.com',
  'https://www.uberfix.alazab.com',
  'https://lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const isAllowedOrigin = (origin: string) => {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.alazab.com')) return true;
  // Allow Lovable preview domains
  if (origin.includes('.lovable.app') || origin.includes('.lovableproject.com')) return true;
  return false;
};

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  try {
    if (!isAllowedOrigin(origin)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'النطاق غير مسموح به' }),
        { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication (optional for public map access)
    const auth = await verifyAuth(req);
    const clientIdentifier =
      auth.isAuthenticated && auth.user
        ? auth.user.id
        : req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          req.headers.get('cf-connecting-ip') ||
          origin ||
          'anonymous';

    if (!auth.isAuthenticated || !auth.user) {
      console.log('ℹ️ Unauthenticated request for maps key (public access)');
    }

    // Rate limiting per user or IP (30 requests per minute)
    const isAllowed = rateLimit(clientIdentifier, { windowMs: 60000, maxRequests: 30 });
    if (!isAllowed) {
      console.log(`⚠️ Rate limit exceeded for identifier: ${clientIdentifier}`);
      return new Response(
        JSON.stringify({ 
          error: 'Too Many Requests', 
          message: 'تم تجاوز الحد المسموح، يرجى الانتظار' 
        }),
        { 
          status: 429, 
          headers: { 
            ...responseHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          } 
        }
      );
    }

    // Get API key from secrets
    let apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    let keySource = 'primary';

    if (!apiKey) {
      console.log('⚠️ Primary key not found, trying fallback...');
      apiKey = Deno.env.get('GOOGLE_MAP_API_KEY');
      keySource = 'fallback';
    }

    if (!apiKey) {
      console.error('❌ No Google Maps API keys found in secrets');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          message: 'يرجى تكوين مفتاح Google Maps API في Supabase Secrets'
        }),
        { 
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log access for audit
    const requesterLabel = auth.user?.id ?? clientIdentifier;
    console.log(`✅ API key retrieved by user: ${requesterLabel} (${keySource})`);

    return new Response(
      JSON.stringify({ apiKey, keySource }),
      { 
        headers: { 
          ...responseHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
        }
      }
    );
  } catch (error) {
    console.error('❌ Error in get-maps-key:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        message: 'حدث خطأ أثناء جلب مفتاح API'
      }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
