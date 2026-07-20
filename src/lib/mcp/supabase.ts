// Import-safe helper: builds an anon Supabase client at call time (never at module load).
import { createClient } from "@supabase/supabase-js";

export function anonClient() {
  const env = (globalThis as any)?.process?.env ?? {};
  const url = env.SUPABASE_URL ?? "https://sentinel.invalid";
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "sentinel";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}