// Submit UberFix maintenance lifecycle templates to Meta for auto-approval
// All templates are UTILITY category which is eligible for fast/auto approval
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMPLATES = [
  {
    name: "uberfix_request_received",
    language: "ar",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "تم استلام طلب الصيانة" },
      {
        type: "BODY",
        text: "مرحبًا {{1}}،\nتم استلام طلب الصيانة الخاص بك بنجاح ✅\nرقم الطلب: {{2}}\nسنتواصل معك قريبًا لتحديد موعد الزيارة.",
        example: { body_text: [["محمد", "MR-26-01040"]] }
      },
      { type: "FOOTER", text: "UberFix - خدمات الصيانة الاحترافية" },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "تتبع الطلب", url: "https://uberfix.shop/track/{{1}}", example: ["https://uberfix.shop/track/abc123"] }
        ]
      }
    ]
  },
  {
    name: "uberfix_request_assigned",
    language: "ar",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "تم تعيين فني لطلبك" },
      {
        type: "BODY",
        text: "مرحبًا {{1}}،\nتم تعيين الفني {{2}} للعمل على طلب الصيانة رقم {{3}} 👨‍🔧\nسيتواصل معك لتأكيد موعد الزيارة.",
        example: { body_text: [["محمد", "أحمد علي", "MR-26-01040"]] }
      },
      { type: "FOOTER", text: "UberFix" },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "تتبع الطلب", url: "https://uberfix.shop/track/{{1}}", example: ["https://uberfix.shop/track/abc123"] }
        ]
      }
    ]
  },
  {
    name: "uberfix_work_started",
    language: "ar",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "بدأ تنفيذ الصيانة" },
      {
        type: "BODY",
        text: "مرحبًا {{1}}،\nبدأ الفني تنفيذ أعمال الصيانة لطلبك رقم {{2}} 🛠️\nسنبلغك فور الانتهاء.",
        example: { body_text: [["محمد", "MR-26-01040"]] }
      },
      { type: "FOOTER", text: "UberFix" },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "متابعة مباشرة", url: "https://uberfix.shop/track/{{1}}", example: ["https://uberfix.shop/track/abc123"] }
        ]
      }
    ]
  },
  {
    name: "uberfix_request_completed",
    language: "ar",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "اكتملت أعمال الصيانة" },
      {
        type: "BODY",
        text: "مرحبًا {{1}}،\nتم الانتهاء من أعمال الصيانة لطلبك رقم {{2}} بنجاح ✅\nيرجى مراجعة الأعمال واعتماد إغلاق الطلب.",
        example: { body_text: [["محمد", "MR-26-01040"]] }
      },
      { type: "FOOTER", text: "UberFix - شكرًا لثقتك" },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "اعتماد الإغلاق", url: "https://uberfix.shop/track/{{1}}", example: ["https://uberfix.shop/track/abc123"] }
        ]
      }
    ]
  },
  {
    name: "uberfix_request_paid",
    language: "ar",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "تم استلام الدفع" },
      {
        type: "BODY",
        text: "مرحبًا {{1}}،\nتم استلام دفعة قيمتها {{2}} ج.م لفاتورة طلب الصيانة رقم {{3}} 💳\nشكرًا لتعاملك مع UberFix.",
        example: { body_text: [["محمد", "500", "MR-26-01040"]] }
      },
      { type: "FOOTER", text: "UberFix" },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "عرض الفاتورة", url: "https://uberfix.shop/track/{{1}}", example: ["https://uberfix.shop/track/abc123"] }
        ]
      }
    ]
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
    const wabaId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (!accessToken || !wabaId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing WhatsApp credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: any[] = [];

    for (const tpl of TEMPLATES) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(tpl)
          }
        );
        const data = await res.json();

        if (res.ok) {
          await supabase.from('wa_templates').upsert({
            name: tpl.name,
            language: tpl.language,
            category: tpl.category.toLowerCase(),
            status: (data.status || 'PENDING').toLowerCase(),
            components: tpl.components,
            external_id: data.id,
          } as any, { onConflict: 'name,language' } as any);

          results.push({ name: tpl.name, success: true, id: data.id, status: data.status });
        } else {
          const errMsg = data.error?.message || data.error?.error_user_msg || 'Unknown error';
          const errSubcode = data.error?.error_subcode;
          const errDetails = data.error?.error_user_title || data.error?.message;
          const alreadyExists = errSubcode === 2388023 || /already exists|duplicate/i.test(errMsg);
          results.push({
            name: tpl.name,
            success: alreadyExists,
            already_exists: alreadyExists,
            error: errMsg,
            error_subcode: errSubcode,
            error_details: errDetails,
            full_error: data.error
          });
        }
      } catch (err) {
        results.push({ name: tpl.name, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
