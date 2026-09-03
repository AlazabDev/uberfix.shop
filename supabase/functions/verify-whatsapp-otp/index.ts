import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { normalizePhone } from "../_shared/phone.ts";

// التحقق من رمز واتساب وإنشاء جلسة Supabase عبر admin.generateLink

const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

    // Find or create user by phone (indexed lookup via profiles, no full user listing)
    const bare = phone.replace(/^\+/, "");
    let userId: string | null = null;
    const { data: prof } = await admin
      .from("profiles")
      .select("auth_user_id")
      .in("phone", [bare, phone, "0" + bare.replace(/^20/, "")])
      .not("auth_user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (prof?.auth_user_id) userId = prof.auth_user_id as string;

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        phone: bare,
        phone_confirm: true,
        user_metadata: { provider: "whatsapp", phone: phone, full_name: `عميل ${phone.slice(-4)}` },
      });
      if (created?.user) {
        userId = created.user.id;
      } else {
        // Phone already registered but profile has no phone → paginate auth users
        console.warn("createUser failed, scanning users:", createErr?.message);
        for (let page = 1; page <= 20 && !userId; page++) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          const hit = list?.users?.find((u) => u.phone === bare || u.phone === phone);
          if (hit) userId = hit.id;
          if (!list?.users?.length || list.users.length < 1000) break;
        }
        if (!userId) throw createErr || new Error("فشل إنشاء المستخدم");
      }
    }

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