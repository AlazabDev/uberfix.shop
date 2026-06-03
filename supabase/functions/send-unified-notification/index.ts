import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'request_created' | 'status_updated' | 'vendor_assigned' | 'sla_warning' | 'request_completed' | 'technician_approved' | 'technician_rejected' | 'technician_job_assigned';
  request_id?: string;
  recipient_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  channels?: ('email' | 'sms' | 'whatsapp' | 'in_app')[];
  data?: {
    request_title?: string;
    request_status?: string;
    old_status?: string;
    new_status?: string;
    vendor_name?: string;
    property_name?: string;
    sla_deadline?: string;
    notes?: string;
    technician_name?: string;
    technician_id?: string;
    rejection_reason?: string;
    login_url?: string;
    distance?: string;
    job_type?: string;
  };
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// HTML Escape function to prevent XSS in email templates
function escapeHtml(unsafe: string | undefined | null): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// قوالب الرسائل
const messageTemplates = {
  request_created: {
    title: "طلب صيانة جديد",
    message: (data: any) => `تم إنشاء طلب صيانة جديد: ${escapeHtml(data.request_title)}`,
    email_subject: "طلب صيانة جديد - UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #2563eb;">طلب صيانة جديد</h2>
        <p>تم إنشاء طلب صيانة جديد:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>العنوان:</strong> ${escapeHtml(data.request_title)}</p>
          ${data.property_name ? `<p><strong>العقار:</strong> ${escapeHtml(data.property_name)}</p>` : ''}
          <p><strong>الحالة:</strong> ${escapeHtml(data.request_status) || 'مفتوح'}</p>
        </div>
        <p>يرجى متابعة الطلب من لوحة التحكم.</p>
      </div>
    `
  },
  status_updated: {
    title: "تحديث حالة الطلب",
    message: (data: any) => `تم تحديث حالة طلب "${escapeHtml(data.request_title)}" من ${escapeHtml(data.old_status)} إلى ${escapeHtml(data.new_status)}`,
    email_subject: "تحديث حالة طلب الصيانة - UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #2563eb;">تحديث حالة الطلب</h2>
        <p>تم تحديث حالة طلب الصيانة الخاص بك:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>العنوان:</strong> ${escapeHtml(data.request_title)}</p>
          <p><strong>الحالة السابقة:</strong> <span style="color: #6b7280;">${escapeHtml(data.old_status)}</span></p>
          <p><strong>الحالة الجديدة:</strong> <span style="color: #059669;">${escapeHtml(data.new_status)}</span></p>
          ${data.notes ? `<p><strong>ملاحظات:</strong> ${escapeHtml(data.notes)}</p>` : ''}
        </div>
      </div>
    `
  },
  vendor_assigned: {
    title: "تم تخصيص فني",
    message: (data: any) => `تم تخصيص الفني ${escapeHtml(data.vendor_name)} لطلب "${escapeHtml(data.request_title)}"`,
    email_subject: "تم تخصيص فني لطلبك - UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #2563eb;">تم تخصيص فني</h2>
        <p>تم تخصيص فني لطلب الصيانة الخاص بك:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>الطلب:</strong> ${escapeHtml(data.request_title)}</p>
          <p><strong>الفني:</strong> ${escapeHtml(data.vendor_name)}</p>
        </div>
        <p>سيتواصل معك الفني قريباً.</p>
      </div>
    `
  },
  sla_warning: {
    title: "⚠️ تنبيه SLA",
    message: (data: any) => `تنبيه: اقتراب موعد استحقاق SLA للطلب "${escapeHtml(data.request_title)}"`,
    email_subject: "⚠️ تنبيه موعد استحقاق SLA - UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #dc2626;">⚠️ تنبيه موعد استحقاق</h2>
        <p>يقترب موعد استحقاق SLA للطلب التالي:</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
          <p><strong>الطلب:</strong> ${escapeHtml(data.request_title)}</p>
          <p><strong>الموعد النهائي:</strong> ${escapeHtml(data.sla_deadline)}</p>
        </div>
        <p style="color: #dc2626;"><strong>يرجى اتخاذ الإجراء اللازم فوراً!</strong></p>
      </div>
    `
  },
  request_completed: {
    title: "تم إكمال الطلب",
    message: (data: any) => `تم إكمال طلب الصيانة: ${escapeHtml(data.request_title)}`,
    email_subject: "تم إكمال طلب الصيانة - UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #059669;">✓ تم إكمال الطلب</h2>
        <p>تم إكمال طلب الصيانة الخاص بك بنجاح:</p>
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #059669;">
          <p><strong>الطلب:</strong> ${escapeHtml(data.request_title)}</p>
          ${data.notes ? `<p><strong>ملاحظات الفني:</strong> ${escapeHtml(data.notes)}</p>` : ''}
        </div>
        <p>نرجو أن تكون راضياً عن الخدمة. يمكنك تقييم الخدمة من لوحة التحكم.</p>
      </div>
    `
  },
  technician_approved: {
    title: "🎉 تم قبول طلب التسجيل",
    message: (data: any) => `تهانينا ${escapeHtml(data.technician_name)}! تم قبول طلب التسجيل في منصة UberFix. يمكنك الآن البدء في استقبال الطلبات.`,
    email_subject: "مبروك! تم قبولك كفني في UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #059669;">🎉 مبروك! تم قبول طلبك</h2>
        <p>عزيزي ${escapeHtml(data.technician_name)}،</p>
        <p>يسعدنا إبلاغك بأنه تم قبول طلب تسجيلك كفني في منصة <strong>UberFix</strong>.</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #059669;">
          <h3 style="margin-top: 0;">الخطوات التالية:</h3>
          <ul style="padding-right: 20px;">
            <li>قم بتسجيل الدخول إلى لوحة التحكم الخاصة بك</li>
            <li>أكمل إعداد ملفك الشخصي</li>
            <li>حدد حالتك إلى "متاح" لبدء استقبال الطلبات</li>
          </ul>
        </div>
        <a href="${escapeHtml(data.login_url) || 'https://uberfix.shop/technician/dashboard'}" 
           style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          الدخول إلى لوحة التحكم
        </a>
        <p style="margin-top: 20px; color: #6b7280;">مرحباً بك في فريق UberFix!</p>
      </div>
    `
  },
  technician_rejected: {
    title: "❌ لم يتم قبول طلب التسجيل",
    message: (data: any) => `عذراً ${escapeHtml(data.technician_name)}، لم يتم قبول طلب التسجيل. السبب: ${escapeHtml(data.rejection_reason) || 'لم يتم تحديد سبب'}`,
    email_subject: "بخصوص طلب التسجيل في UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #dc2626;">بخصوص طلب التسجيل</h2>
        <p>عزيزي ${escapeHtml(data.technician_name)}،</p>
        <p>نأسف لإبلاغك بأنه لم يتم قبول طلب تسجيلك في منصة UberFix في الوقت الحالي.</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #dc2626;">
          <p><strong>السبب:</strong></p>
          <p>${escapeHtml(data.rejection_reason) || 'لم يتم تحديد سبب محدد'}</p>
        </div>
        <p>يمكنك إعادة تقديم طلب التسجيل بعد استيفاء المتطلبات اللازمة.</p>
        <p style="margin-top: 20px; color: #6b7280;">نشكرك على اهتمامك بالانضمام إلى UberFix.</p>
      </div>
    `
  },
  technician_job_assigned: {
    title: "🔧 طلب صيانة جديد",
    message: (data: any) => `لديك طلب صيانة جديد "${escapeHtml(data.request_title)}" على بعد ${escapeHtml(data.distance) || '?'} كم - ${escapeHtml(data.job_type) || 'عام'}`,
    email_subject: "طلب صيانة جديد متاح - UberFix",
    email_html: (data: any) => `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2 style="color: #2563eb;">🔧 طلب صيانة جديد</h2>
        <p>مرحباً،</p>
        <p>لديك طلب صيانة جديد متاح:</p>
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #2563eb;">
          <p><strong>نوع الخدمة:</strong> ${escapeHtml(data.job_type) || 'صيانة عامة'}</p>
          <p><strong>العنوان:</strong> ${escapeHtml(data.request_title) || 'طلب صيانة'}</p>
          <p><strong>المسافة:</strong> ${escapeHtml(data.distance) || '?'} كم</p>
          ${data.property_name ? `<p><strong>الموقع:</strong> ${escapeHtml(data.property_name)}</p>` : ''}
        </div>
        <a href="https://uberfix.shop/technician/requests" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          عرض التفاصيل والقبول
        </a>
        <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">⏱️ يرجى الرد في أقرب وقت ممكن</p>
      </div>
    `
  }
};

const sendInAppNotification = async (
  recipient_id: string,
  title: string,
  message: string,
  type: string,
  entity_id: string
) => {
  try {
    const { error } = await supabase.from('notifications').insert({
      recipient_id,
      title,
      message,
      type: type === 'sla_warning' ? 'warning' : type === 'request_completed' ? 'success' : 'info',
      entity_type: 'maintenance_request',
      entity_id
    });

    if (error) throw error;
    console.log('In-app notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending in-app notification:', error);
    return { success: false, error };
  }
};

const sendEmailNotification = async (
  email: string,
  subject: string,
  html: string
) => {
  try {
    const result = await resend.emails.send({
      from: 'UberFix <hello@tx.uberfix.shop>',
      to: [email],
      subject,
      html
    });

    console.log('Email sent successfully:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

const sendSMSNotification = async (
  phone: string,
  message: string,
  requestId?: string
): Promise<{ success: boolean; messageLogId?: string; error?: any }> => {
  try {
    // استخدام Twilio لإرسال SMS
    const response = await fetch(`${supabaseUrl}/functions/v1/send-twilio-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        to: phone,
        message: message,
        type: 'sms',
        requestId: requestId
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('SMS failed:', result);
      return { success: false, error: result.error || 'SMS sending failed' };
    }

    console.log('SMS sent successfully:', result.messageSid);
    return { success: true, messageLogId: result.messageSid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error };
  }
};

const sendWhatsAppNotification = async (
  phone: string,
  message: string,
  requestId?: string
): Promise<{ success: boolean; messageLogId?: string; error?: any }> => {
  try {
    // استخدام Meta API مباشرة لإرسال WhatsApp (ليس Twilio)
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        to: phone,
        message: message,
        requestId: requestId
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('WhatsApp failed:', result);
      return { success: false, error: result.error || 'WhatsApp sending failed' };
    }

    console.log('WhatsApp sent successfully via Meta:', result.messageId);
    return { success: true, messageLogId: result.messageId };
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return { success: false, error };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── AUTH: allow either (a) Supabase service_role key (internal edge-fn calls)
    //   or (b) a signed-in user with an elevated role (admin/manager/staff). ──
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isServiceRole = token === supabaseServiceKey;
    if (!isServiceRole) {
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const allowed = new Set(["admin", "manager", "staff", "dispatcher", "owner"]);
      const ok = (roles || []).some((r: any) => allowed.has(r.role));
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const requestData: NotificationRequest = await req.json();
    
    console.log('Processing notification:', requestData);

    const template = messageTemplates[requestData.type];
    if (!template) {
      throw new Error(`Unknown notification type: ${requestData.type}`);
    }

    const channels = requestData.channels || ['in_app'];
    const results: Record<string, { success: boolean; error?: any; messageLogId?: string } | null> = {
      in_app: null,
      email: null,
      sms: null,
      whatsapp: null
    };

    const title = template.title;
    const message = template.message(requestData.data || {});

    // 1. إرسال إشعار داخل التطبيق (دائماً)
    if (channels.includes('in_app')) {
      results.in_app = await sendInAppNotification(
        requestData.recipient_id,
        title,
        message,
        requestData.type,
        requestData.request_id || ''
      );
    }

    // 2. إرسال بريد إلكتروني
    if (channels.includes('email') && requestData.recipient_email) {
      results.email = await sendEmailNotification(
        requestData.recipient_email,
        template.email_subject,
        template.email_html(requestData.data || {})
      );
    }

    // 3. إرسال SMS
    if (channels.includes('sms') && requestData.recipient_phone) {
      results.sms = await sendSMSNotification(
        requestData.recipient_phone,
        message,
        requestData.request_id || ''
      );
      
      // تحديث حالة الإرسال في جدول notifications
      if (results.in_app?.success && requestData.request_id) {
        await supabase.from('notifications')
          .update({ sms_sent: results.sms.success })
          .eq('entity_id', requestData.request_id)
          .eq('recipient_id', requestData.recipient_id);
      }
    }

    // 4. إرسال WhatsApp
    if (channels.includes('whatsapp') && requestData.recipient_phone) {
      results.whatsapp = await sendWhatsAppNotification(
        requestData.recipient_phone,
        message,
        requestData.request_id || ''
      );
      
      // تحديث حالة الإرسال في جدول notifications
      if (results.in_app?.success && requestData.request_id) {
        await supabase.from('notifications')
          .update({ whatsapp_sent: results.whatsapp.success })
          .eq('entity_id', requestData.request_id)
          .eq('recipient_id', requestData.recipient_id);
      }
    }

    // ملخص النتائج
    const allSuccess = Object.values(results).every(r => r === null || r?.success);
    const anyFailed = Object.values(results).some(r => r && !r.success);

    return new Response(
      JSON.stringify({
        success: !anyFailed,
        message: 'Notifications processed',
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-unified-notification:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
