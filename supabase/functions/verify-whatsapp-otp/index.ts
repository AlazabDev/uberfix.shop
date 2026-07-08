import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// التحقق من رمز واتساب وإنشاء جلسة Supabase عبر admin.generateLink

const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(raw: string): string | null {
  const t = String(raw || "").trim().replace(/\s|-/g, "");
  if (!t) return null;
  if (t.startsWith("+")) return t;
  if (t.startsWith("00")) return "+" + t.slice(2);
  if (t.startsWith("0")) return "+20" + t.slice(1);
  return "+" + t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone: raw, code } = await req.json();
    const phone = normalizePhone(raw);
    if (!phone || !code || !/^\d{4,8}$/.test(String(code))) {
      return new Response(JSON.stringify({ error: "بيانات غير صحيحة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows, error: fetchErr } = await admin
      .from("whatsapp_otp")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchErr) throw fetchErr;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "الرمز منتهي أو غير موجود" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otpRow = rows[0];
    if ((otpRow.attempts ?? 0) >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "تم استنفاد المحاولات" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await sha256Hex(String(code) + phone);
    if (hash !== otpRow.code_hash) {
      await admin
        .from("whatsapp_otp")
        .update({ attempts: (otpRow.attempts ?? 0) + 1 })
        .eq("id", otpRow.id);
      return new Response(JSON.stringify({ error: "الرمز غير صحيح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark consumed
    await admin.from("whatsapp_otp").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

    // Find or create user by phone
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const foundUser = existing?.users?.find((u) => u.phone === phone.replace(/^\+/, "") || u.phone === phone);
    if (foundUser) {
      userId = foundUser.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        phone: phone.replace(/^\+/, ""),
        phone_confirm: true,
        user_metadata: { provider: "whatsapp", full_name: `عميل ${phone.slice(-4)}` },
      });
      if (createErr || !created.user) throw createErr || new Error("فشل إنشاء المستخدم");
      userId = created.user.id;
    }

    // Generate a magic link to derive a valid session
    // For phone-only users, we mint an access/refresh token via signInWithPassword pattern is not applicable.
    // Use admin.generateLink type=magiclink requires email. Instead, we issue tokens via updateUserById + manual token exchange is unsupported.
    // Simplest reliable path: create a one-time email link if email exists, otherwise use the Sign-In With ID Token approach is not available for custom.
    // We fallback to generating a magic link if email exists; otherwise return userId and let client refresh via signInWithOtp phone.

    // Preferred: use Supabase admin generateLink with type=magiclink (requires email)
    // Since phone users may have no email, we mint tokens via createSession (available in supabase-js v2 admin API? not standard).
    // Reliable universal fix: attach a synthetic email placeholder on the user if none, then generate a magic link and hash-exchange on client.

    // Simpler alternative implemented here: use the admin.signOut then rely on client-side setSession with tokens minted via a signed JWT is out of scope.
    // Correct approach: call admin.generateLink to produce a hashed_token and exchange it client-side using verifyOtp type=magiclink.

    const email = `wa_${userId}@whatsapp.local`;
    // Ensure user has an email so magiclink works
    const { data: userInfo } = await admin.auth.admin.getUserById(userId);
    if (!userInfo.user?.email) {
      await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
    }
    const targetEmail = userInfo.user?.email || email;

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });
    if (linkErr || !linkData) throw linkErr || new Error("فشل إنشاء رابط الجلسة");

    // Return the hashed token and email so client can verifyOtp to establish session
    return new Response(
      JSON.stringify({
        success: true,
        // The client should call supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
        token_hash: linkData.properties?.hashed_token,
        email: targetEmail,
        // Provide a session-ready payload for direct setSession if the client already has one.
        session: null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-whatsapp-otp error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});