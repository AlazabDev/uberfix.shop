// Import-safe helpers: env is read and clients are built at call time only.
import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export class ToolFailure extends Error {}

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL is required");
  return url;
}

export function supabasePublishableKey(): string {
  const direct = configuredEnv(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // Malformed dictionaries can coexist with a working legacy key.
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("Supabase publishable key is required");
}

function requireToken(ctx: ToolContext): string {
  const token = ctx.getToken();
  if (!ctx.isAuthenticated() || !token) throw new ToolFailure("يلزم تسجيل الدخول إلى UberFix عبر OAuth.");
  return token;
}

/** عميل Supabase بهوية المستخدم المفوِّض — RLS هي السلطة الوحيدة على الشركة والفرع. */
export function supabaseForUser(ctx: ToolContext) {
  const token = requireToken(ctx);
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * يستدعي باب REST الرسمي (/functions/v1/api) بتوكن المستخدم نفسه،
 * فتُطبَّق نفس قواعد التحقق وعزل الشركة ودورة العمل دون تكرار المنطق.
 */
export async function callApi(ctx: ToolContext, body: Record<string, unknown>) {
  const token = requireToken(ctx);
  const res = await fetch(`${supabaseProjectUrl()}/functions/v1/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey(),
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.success === false) {
    const msg = (data.message_ar ?? data.error ?? data.message ?? `HTTP ${res.status}`) as string;
    throw new ToolFailure(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

export function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** يحوّل أي فشل متوقَّع إلى نتيجة خطأ مقروءة للوكيل بدل خطأ عام. */
export async function guarded<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    return errorResult(e instanceof Error ? e.message : String(e));
  }
}

export const REQUEST_FIELDS =
  "id, request_number, title, status, workflow_stage, priority, service_type, location, created_at, updated_at, branch_id, company_id";
