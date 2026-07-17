// Simple in-memory cache for Edge Functions
// For production, use Upstash Redis or similar

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CACHE_TTL = {
  categories: 3600,           // 1 hour
  services: 3600,             // 1 hour
  cities: 86400,              // 24 hours
  districts: 86400,           // 24 hours
  profiles: 900,              // 15 minutes
  api_responses: 300,         // 5 minutes for API responses
  technicians: 1800,          // 30 minutes
  properties: 600,            // 10 minutes
  maintenance_requests: 120,  // 2 minutes
} as const;

// In-memory cache
const cache = new Map<string, { data: any; expires: number }>();

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const key = url.searchParams.get("key");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      case "get": {
        // AuthN required — mirrors RLS on underlying tables
        const authHeaderGet = req.headers.get('Authorization') ?? '';
        const tokenGet = authHeaderGet.replace('Bearer ', '');
        if (!tokenGet) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        let getUserId: string | null = null;
        let getRoles: string[] = [];
        if (tokenGet !== supabaseKey) {
          const { data: { user } } = await supabase.auth.getUser(tokenGet);
          if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          getUserId = user.id;
          const { data: r } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
          getRoles = (r ?? []).map((x: any) => x.role);
        } else {
          getRoles = ['service_role'];
        }

        if (!key) {
          return new Response(JSON.stringify({ error: "Missing key" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const cached = cache.get(key);
        if (cached && cached.expires > Date.now()) {
          return new Response(
            JSON.stringify({ data: cached.data, cached: true }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": `public, max-age=${Math.floor((cached.expires - Date.now()) / 1000)}`,
                "X-Cache": "HIT",
              },
            }
          );
        }

        // Fetch from database based on key pattern
        let data = null;
        const [table, ...rest] = key.split(":");

        const staffRoles = ['admin', 'owner', 'manager', 'dispatcher', 'staff', 'service_role'];
        const isStaff = getRoles.some((r) => staffRoles.includes(r));
        // properties/technicians are protected — staff only
        if ((table === 'properties' || table === 'technicians') && !isStaff) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        if (table === "categories") {
          const { data: categories } = await supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("sort_order");
          data = categories;
        } else if (table === "services") {
          const { data: services } = await supabase
            .from("services")
            .select("*")
            .eq("is_active", true)
            .order("sort_order");
          data = services;
        } else if (table === "cities") {
          const { data: cities } = await supabase
            .from("cities")
            .select("*")
            .order("name_ar");
          data = cities;
        } else if (table === "districts") {
          const cityId = rest[0];
          const { data: districts } = await supabase
            .from("districts")
            .select("*")
            .eq("city_id", cityId)
            .order("name_ar");
          data = districts;
        } else if (table === "technicians") {
          const { data: technicians } = await supabase
            .from("technicians")
            .select("id, full_name, specialization, rating, city_id, district_id, is_available")
            .eq("status", "active")
            .order("rating", { ascending: false })
            .limit(50);
          data = technicians;
        } else if (table === "properties") {
          const { data: properties } = await supabase
            .from("properties")
            .select("id, name, address, city_id, district_id, type, status")
            .order("created_at", { ascending: false })
            .limit(100);
          data = properties;
        }

        // Cache the result
        const ttl = CACHE_TTL[table as keyof typeof CACHE_TTL] || 900;
        cache.set(key, {
          data,
          expires: Date.now() + ttl * 1000,
        });

        return new Response(JSON.stringify({ data, cached: false }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${ttl}`,
            "X-Cache": "MISS",
          },
        });
      }

      case "set": {
        // Admin/service-role only — prevents cache poisoning
        const auth = req.headers.get('Authorization') ?? '';
        const token = auth.replace('Bearer ', '');
        const isService = token && token === supabaseKey;
        let allowed = !!isService;
        if (!allowed && token) {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);
            allowed = !!roles?.some((r) => ['admin', 'owner', 'manager'].includes(r.role));
          }
        }
        if (!allowed) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        if (!key) {
          return new Response(JSON.stringify({ error: "Missing key" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { data: cacheData, ttl = 300 } = body;

        cache.set(key, {
          data: cacheData,
          expires: Date.now() + ttl * 1000,
        });

        return new Response(
          JSON.stringify({ success: true, message: "Cache set successfully" }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      case "invalidate": {
        // Admin/service-role only — prevents cache-flush DoS
        const auth = req.headers.get('Authorization') ?? '';
        const token = auth.replace('Bearer ', '');
        const isService = token && token === supabaseKey;
        let allowed = !!isService;
        if (!allowed && token) {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);
            allowed = !!roles?.some((r) => ['admin', 'owner', 'manager'].includes(r.role));
          }
        }
        if (!allowed) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        if (!key) {
          // Clear all cache
          cache.clear();
        } else {
          // Clear specific key or pattern
          if (key.endsWith("*")) {
            const prefix = key.slice(0, -1);
            for (const cacheKey of cache.keys()) {
              if (cacheKey.startsWith(prefix)) {
                cache.delete(cacheKey);
              }
            }
          } else {
            cache.delete(key);
          }
        }

        return new Response(
          JSON.stringify({ success: true, message: "Cache invalidated" }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      case "stats": {
        return new Response(
          JSON.stringify({
            size: cache.size,
            keys: Array.from(cache.keys()),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: get, invalidate, stats" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
    }
  } catch (error) {
    console.error("Cache service error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
