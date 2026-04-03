import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
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
  'https://id-preview--c6adaf51-0eef-43e8-bf45-d65ac7ebe1aa.lovable.app',
  'https://c6adaf51-0eef-43e8-bf45-d65ac7ebe1aa.lovableproject.com',
];

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.some(o => origin.includes(o.replace('https://', '').replace('http://', '')));
  
  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  try {
    // للخريطة الترويجية على صفحة Landing - نستخدم rate limiting بناءً على IP
    // هذا آمن لأن المفتاح هو public token وليس secret
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'anonymous';
    
    // Rate limiting (60 requests per minute per IP for public access)
    const isAllowed = rateLimit(clientIP, { windowMs: 60000, maxRequests: 60 });
    if (!isAllowed) {
      console.log(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
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

    // التحقق من أن الطلب من origin مسموح به
    if (!isAllowedOrigin && origin) {
      console.error(`❌ Rejected request from unauthorized origin: ${origin}`);
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden',
          message: 'Origin not allowed'
        }),
        { 
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');

    if (!mapboxToken) {
      console.error('❌ MAPBOX_PUBLIC_TOKEN not found in secrets');
      return new Response(
        JSON.stringify({ 
          error: 'Mapbox token not configured',
          message: 'يرجى تكوين مفتاح Mapbox في Supabase Secrets'
        }),
        { 
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Mapbox token retrieved for origin: ${origin || 'unknown'}`);

    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { 
        headers: { 
          ...responseHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
        }
      }
    );
  } catch (error) {
    console.error('❌ Error in get-mapbox-token:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        message: 'حدث خطأ أثناء جلب مفتاح Mapbox'
      }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
