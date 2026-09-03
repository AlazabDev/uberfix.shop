import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// إرسال OTP عبر واتساب Cloud API
// - يخزن الهاش فقط، ليس الرمز
// - Rate limit: 5 محاولات لكل 10 دقائق

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

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
    const { phone: raw } = await req.json();
    const phone = normalizePhone(raw);
    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return new Response(JSON.stringify({ success: false, error: "رقم غير صحيح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await admin
      .from("whatsapp_otp")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", since);

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ success: false, error: "تم تجاوز عدد المحاولات، حاول لاحقاً" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
    const codeHash = await sha256Hex(code + phone);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    await admin.from("whatsapp_otp").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
      ip_address: ip,
    });

    // Send via WhatsApp Cloud API
    const waToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!waToken || !waPhoneId) {
      console.error("WhatsApp credentials missing");
      return new Response(JSON.stringify({ success: false, error: "خدمة واتساب غير مكوّنة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const to = phone.replace(/^\+/, "");
    const graph = `https://graph.facebook.com/v20.0/${waPhoneId}/messages`;
    const headers = { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" };
    const templateName = Deno.env.get("WHATSAPP_OTP_TEMPLATE") || "otp_verification";

    // 1) Approved AUTHENTICATION template (required by Meta outside the 24h window —
    //    free-form text is accepted with 200 but silently never delivered).
    const templateBody = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "ar" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    };

    let waRes = await fetch(graph, { method: "POST", headers, body: JSON.stringify(templateBody) });
    let sentVia = "template";

    if (!waRes.ok) {
      const tplErr = await waRes.text();
      console.error("WhatsApp template send failed, falling back to text:", waRes.status, tplErr);
      // 2) Fallback: plain text (works only inside an open 24h conversation window)
      const textBody = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: `رمز التحقق الخاص بك من UberFix هو: ${code}\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.` },
      };
      waRes = await fetch(graph, { method: "POST", headers, body: JSON.stringify(textBody) });
      sentVia = "text";
    }

    if (!waRes.ok) {
      const err = await waRes.text();
      console.error("WhatsApp send failed:", waRes.status, err);
      return new Response(JSON.stringify({ success: false, error: "فشل إرسال الرسالة عبر واتساب" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const waJson = await waRes.json().catch(() => ({}));
    console.log("OTP sent", { phone: phone.slice(0, 5) + "***", via: sentVia, wamid: waJson?.messages?.[0]?.id });

    return new Response(JSON.stringify({ success: true, via: sentVia }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-whatsapp-otp error:", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});