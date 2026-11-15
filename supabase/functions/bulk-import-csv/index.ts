import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 15 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Import file is too large' }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate JWT and require admin/owner role
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "owner"])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { table, rows } = JSON.parse(rawBody);
    if (typeof table !== 'string' || !Array.isArray(rows) || rows.length === 0 || rows.length > 5000) {
      return new Response(JSON.stringify({ error: "A supported table and 1–5000 rows are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const importSchemas: Record<string, { columns: string[]; required: string[]; numeric: string[]; boolean: string[]; uuid: string[]; date: string[] }> = {
      stores: {
        columns: ['id', 'name', 'description', 'location', 'phone', 'email', 'category', 'status', 'area', 'opening_date', 'region_id', 'map_url', 'is_deleted'],
        required: ['name'], numeric: ['area'], boolean: ['is_deleted'], uuid: ['id', 'region_id'], date: ['opening_date'],
      },
      rate_items: {
        columns: ['id', 'rate_card_id', 'trade_id', 'normal_hourly', 'after_hours_hourly', 'min_billable_hours', 'trip_charge', 'notes', 'min_invoice'],
        required: [], numeric: ['id', 'trade_id', 'normal_hourly', 'after_hours_hourly', 'min_billable_hours', 'trip_charge', 'min_invoice'], boolean: [], uuid: ['rate_card_id'], date: [],
      },
      malls: {
        columns: ['id', 'name', 'location', 'type'], required: ['name'], numeric: ['id'], boolean: [], uuid: [], date: [],
      },
    };
    const schema = importSchemas[table];
    if (!schema) {
      return new Response(JSON.stringify({ error: "Unsupported import table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sanitizedRows = rows.map((row: unknown, index: number) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Invalid row ${index + 1}`);
      const source = row as Record<string, unknown>;
      const clean: Record<string, unknown> = {};
      for (const column of schema.columns) {
        if (!(column in source)) continue;
        const value = source[column];
        if (value === null || value === '') continue;
        if (schema.uuid.includes(column)) {
          if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error(`Invalid identifier in row ${index + 1}`);
          clean[column] = value;
        } else if (schema.date.includes(column)) {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`Invalid date in row ${index + 1}`);
          clean[column] = value;
        } else if (schema.numeric.includes(column)) {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid numeric value in row ${index + 1}`);
          clean[column] = parsed;
        } else if (schema.boolean.includes(column)) {
          if (![true, false, 'true', 'false', '1', '0', 1, 0].includes(value as never)) throw new Error(`Invalid boolean value in row ${index + 1}`);
          clean[column] = value === true || value === 'true' || value === '1' || value === 1;
        } else if (typeof value === 'string') {
          if (value.length > 5000) throw new Error(`Value too long in row ${index + 1}`);
          clean[column] = value.trim();
        } else {
          throw new Error(`Invalid value in row ${index + 1}`);
        }
      }
      if (schema.required.some((key) => typeof clean[key] !== 'string' || !(clean[key] as string).length)) {
        throw new Error(`Required fields are missing in row ${index + 1}`);
      }
      return clean;
    });

    // Insert in chunks of 500
    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const batch = sanitizedRows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid import request';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
