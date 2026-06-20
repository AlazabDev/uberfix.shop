import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rateLimiter.ts";

const ALLOWED_ORIGINS = [
  "https://uf.alazab.com",
  "https://uberfix.shop",
  "https://www.uberfix.shop",
  "https://uberfix.alazab.com",
  "https://www.uberfix.alazab.com",
  "https://lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://id-preview--c6adaf51-0eef-43e8-bf45-d65ac7ebe1aa.lovable.app",
  "https://c6adaf51-0eef-43e8-bf45-d65ac7ebe1aa.lovableproject.com",
];

const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return true; // allow curl/server diagnostics
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith(".alazab.com")) return true;
  if (origin.includes(".lovable.app") || origin.includes(".lovableproject.com")) return true;
  return false;
};

const getRequesterId = (req: Request, origin: string): string => {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    origin ||
    "anonymous"
  );
};

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = isAllowedOrigin(origin);
  const responseHeaders = {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigin ? origin || "*" : ALLOWED_ORIGINS[0],
    "Vary": "Origin",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: responseHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: { ...responseHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    if (!allowedOrigin) {
      console.error(`Rejected Mapbox token request from unauthorized origin: ${origin}`);
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "Origin not allowed" }),
        { status: 403, headers: { ...responseHeaders, "Content-Type": "application/json" } },
      );
    }

    const requesterId = getRequesterId(req, origin);
    const isAllowed = rateLimit(`mapbox:${requesterId}`, { windowMs: 60_000, maxRequests: 60 });

    if (!isAllowed) {
      console.log(`Rate limit exceeded for Mapbox token requester: ${requesterId}`);
      return new Response(
        JSON.stringify({ error: "Too Many Requests", message: "تم تجاوز الحد المسموح، يرجى الانتظار" }),
        {
          status: 429,
          headers: {
            ...responseHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }

    const mapboxToken =
      Deno.env.get("MAPBOX_PUBLIC_TOKEN") ||
      Deno.env.get("MAPBOX_TOKEN") ||
      Deno.env.get("VITE_MAPBOX_TOKEN") ||
      "";

    if (!mapboxToken) {
      console.error("MAPBOX_PUBLIC_TOKEN / MAPBOX_TOKEN not found in Supabase secrets");
      return new Response(
        JSON.stringify({
          error: "Mapbox token not configured",
          message: "يرجى تكوين مفتاح Mapbox في Supabase Secrets",
        }),
        { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ token: mapboxToken }),
      {
        headers: {
          ...responseHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  } catch (error) {
    console.error("Error in get-mapbox-token:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        message: "حدث خطأ أثناء جلب مفتاح Mapbox",
      }),
      { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } },
    );
  }
});
