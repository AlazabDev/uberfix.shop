import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * 🌐 Unified Maintenance Gateway (API Gateway)
 * 
 * نقطة الدخول الموحدة لجميع طلبات الصيانة من كافة القنوات:
 * - whatsapp_flow: من تدفقات واتساب
 * - jotform: من نماذج JotForm
 * - public_form: من النموذج العام على الموقع
 * - qr_guest: من مسح QR Code
 * - facebook_lead: من إعلانات فيسبوك
 * - phone: من المكالمات الهاتفية
 * - internal: من لوحة التحكم الداخلية
 * - whatsapp_chat: من محادثات واتساب المباشرة
 * 
 * يضمن هذا الـ Gateway:
 * 1. توحيد بنية البيانات من جميع المصادر
 * 2. تطبيق قواعد التحقق والتطهير الموحدة
 * 3. إنشاء رقم طلب موحد (UF/MR/...)
 * 4. تسجيل مصدر القناة في audit_logs
 * 5. إرسال إشعارات موحدة
 */

// ─── Types ───────────────────────────────────────────────────────────

type Channel = 
  | 'whatsapp_flow' | 'jotform' | 'public_form' | 'qr_guest' 
  | 'facebook_lead' | 'phone' | 'internal' | 'whatsapp_chat'
  | 'email' | 'api';

interface GatewayRequest {
  // مطلوب
  channel: Channel;
  client_name: string;
  
  // اختياري - بيانات العميل
  client_phone?: string;
  client_email?: string;
  
  // اختياري - تفاصيل الطلب
  service_type?: string;
  priority?: string;
  description?: string;
  location?: string;
  
  // اختياري - ربط بالنظام
  branch_id?: string;
  branch_name?: string;
  company_id?: string;
  property_id?: string;
  
  // اختياري - بيانات القناة المصدرية
  source_id?: string;       // معرف في النظام المصدر (jotform submission id, lead id, etc.)
  source_metadata?: Record<string, unknown>;
  
  // اختياري - صور
  images?: string[];
}

interface GatewayResponse {
  success: boolean;
  request_id: string;
  request_number: string;
  track_url: string;
  channel: string;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const VALID_CHANNELS: Channel[] = [
  'whatsapp_flow', 'jotform', 'public_form', 'qr_guest',
  'facebook_lead', 'phone', 'internal', 'whatsapp_chat',
  'email', 'api',
];

const SERVICE_MAP: Record<string, string> = {
  'سباكة': 'plumbing', 'plumbing': 'plumbing',
  'كهرباء': 'electrical', 'electrical': 'electrical',
  'تكييف': 'ac', 'ac': 'ac', 'تبريد': 'ac',
  'نجارة': 'carpentry', 'carpentry': 'carpentry',
  'حدادة': 'metalwork', 'metalwork': 'metalwork',
  'دهانات': 'painting', 'painting': 'painting',
  'تنظيف': 'cleaning', 'cleaning': 'cleaning',
  'أخرى': 'other', 'other': 'other', 'general': 'other',
};

const SERVICE_LABELS: Record<string, string> = {
  plumbing: 'سباكة', electrical: 'كهرباء', ac: 'تكييف',
  carpentry: 'نجارة', metalwork: 'حدادة', painting: 'دهانات',
  cleaning: 'تنظيف', other: 'أخرى',
};

const VALID_PRIORITIES = ['high', 'medium', 'low'];

// ─── Helpers ─────────────────────────────────────────────────────────

function sanitize(input: string | undefined, maxLen: number): string {
  if (!input) return '';
  return input.trim().replace(/[<>"';]/g, '').slice(0, maxLen);
}

function sanitizePhone(phone: string | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '').slice(0, 15);
}

function normalizeServiceType(raw: string | undefined): string {
  if (!raw) return 'other';
  const key = raw.toLowerCase().trim();
  return SERVICE_MAP[key] || 'other';
}

function normalizePriority(raw: string | undefined): string {
  if (!raw) return 'medium';
  const p = raw.toLowerCase().trim();
  // Handle Arabic/emoji priorities from WhatsApp Flow
  if (p.includes('عاجل') || p === 'urgent' || p === 'high') return 'high';
  if (p.includes('متوسط') || p === 'medium') return 'medium';
  if (p.includes('عادي') || p === 'normal' || p === 'low') return 'low';
  return VALID_PRIORITIES.includes(p) ? p : 'medium';
}

// ─── Main Handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('cf-connecting-ip') || 'unknown';

  try {
    const body: GatewayRequest = await req.json();

    // ─── Validate Channel ────────────────────────────────────────
    if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid channel', 
          valid_channels: VALID_CHANNELS,
          message_ar: 'قناة غير صالحة' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Validate Client Name ────────────────────────────────────
    const clientName = sanitize(body.client_name, 100);
    if (!clientName) {
      return new Response(
        JSON.stringify({ error: 'client_name is required', message_ar: 'اسم العميل مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Normalize & Sanitize ────────────────────────────────────
    const clientPhone = sanitizePhone(body.client_phone);
    const clientEmail = body.client_email?.trim().toLowerCase().slice(0, 100) || '';
    const serviceType = normalizeServiceType(body.service_type);
    const priority = normalizePriority(body.priority);
    const description = sanitize(body.description, 500);
    const location = sanitize(body.location, 200);
    const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;

    // ─── Supabase Admin Client ───────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ─── Resolve Company & Branch ────────────────────────────────
    let companyId = body.company_id || '';
    let branchId = body.branch_id || '';

    // If property_id provided, get company/branch from property
    if (body.property_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(body.property_id)) {
        const { data: property } = await supabaseAdmin
          .from('properties')
          .select('company_id, branch_id, address')
          .eq('id', body.property_id)
          .maybeSingle();
        
        if (property) {
          companyId = property.company_id;
          branchId = property.branch_id;
        }
      }
    }

    // If still no company/branch, resolve from defaults
    if (!companyId || !branchId) {
      const { data: defaultOrg } = await supabaseAdmin
        .from('companies')
        .select('id, branches(id, name)')
        .limit(1)
        .maybeSingle();

      if (!defaultOrg) {
        return new Response(
          JSON.stringify({ error: 'No company configured', message_ar: 'لم يتم إعداد الشركة' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      companyId = companyId || defaultOrg.id;
      const branches = (defaultOrg as any).branches as Array<{ id: string; name: string }>;

      if (!branchId && branches?.length) {
        // Try to match branch by name
        if (body.branch_name) {
          const match = branches.find(b => 
            b.name.includes(body.branch_name!) || body.branch_name!.includes(b.name)
          );
          branchId = match?.id || branches[0].id;
        } else {
          branchId = branches[0].id;
        }
      }

      if (!branchId) {
        return new Response(
          JSON.stringify({ error: 'No branch available', message_ar: 'لا يوجد فرع متاح' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ─── Create Maintenance Request ──────────────────────────────
    const requestData: Record<string, unknown> = {
      company_id: companyId,
      branch_id: branchId,
      title: `طلب صيانة - ${serviceLabel}`,
      description: description || `طلب صيانة ${serviceLabel}`,
      service_type: serviceType,
      status: 'Open',
      workflow_stage: 'submitted',
      channel: body.channel,
      priority,
      client_name: clientName,
      client_phone: clientPhone || null,
      client_email: clientEmail || null,
      location: location || body.branch_name || null,
    };

    if (body.property_id) {
      requestData.property_id = body.property_id;
    }

    const { data: created, error: createError } = await supabaseAdmin
      .from('maintenance_requests')
      .insert([requestData])
      .select('id, request_number, created_at')
      .single();

    if (createError) {
      console.error(`❌ Gateway [${body.channel}] insert failed:`, createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create request', message_ar: 'فشل في إنشاء الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Upload Images ───────────────────────────────────────────
    let uploadedImages = 0;
    if (body.images?.length) {
      for (let i = 0; i < Math.min(body.images.length, 5); i++) {
        try {
          const base64Data = body.images[i];
          const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
          const binaryData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
          const fileName = `${created.id}/${Date.now()}-${i}.jpg`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from('maintenance-attachments')
            .upload(fileName, binaryData, { contentType: 'image/jpeg', upsert: false });
          if (!uploadError) uploadedImages++;
        } catch (imgError) {
          console.warn('Image upload failed:', imgError);
        }
      }
    }

    // ─── Audit Log ───────────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    await supabaseAdmin.from('audit_logs').insert({
      action: 'GATEWAY_REQUEST_CREATED',
      table_name: 'maintenance_requests',
      record_id: created.id,
      new_values: {
        channel: body.channel,
        request_number: created.request_number,
        service_type: serviceType,
        priority,
        source_id: body.source_id || null,
        source_metadata: body.source_metadata || null,
        ip: clientIP,
        duration_ms: durationMs,
        images_count: uploadedImages,
      }
    });

    // ─── Log to API Gateway Logs ─────────────────────────────────
    try {
      await supabaseAdmin.from('api_gateway_logs').insert({
        route: `/gateway/${body.channel}`,
        method: 'POST',
        status_code: 201,
        duration_ms: durationMs,
        client_ip: clientIP,
        consumer_type: body.channel,
        consumer_id: body.source_id || null,
        request_id: created.id,
        user_agent: req.headers.get('user-agent') || null,
        response_size: null,
      });
    } catch (logErr) {
      console.warn('Gateway log insert failed:', logErr);
    }

    // ─── WhatsApp Notification ───────────────────────────────────
    if (clientPhone) {
      try {
        await supabaseAdmin.functions.invoke('send-whatsapp-meta', {
          body: {
            to: clientPhone,
            message: `✅ تم استلام طلب الصيانة بنجاح!\n\n📋 رقم الطلب: ${created.request_number}\n🔧 نوع الخدمة: ${serviceLabel}\n📡 القناة: ${body.channel}\n\nيمكنك متابعة حالة طلبك من هنا:\nhttps://uberfiix.lovable.app/track/${created.id}`,
            requestId: created.id,
          }
        });
      } catch (notifErr) {
        console.warn('WhatsApp notification failed:', notifErr);
      }
    }

    // ─── Admin Notification ──────────────────────────────────────
    try {
      await supabaseAdmin.functions.invoke('send-maintenance-notification', {
        body: {
          request_id: created.id,
          event_type: 'request_created',
        }
      });
    } catch (notifErr) {
      console.warn('Admin notification failed:', notifErr);
    }

    console.log(`✅ Gateway [${body.channel}] → ${created.request_number} (${durationMs}ms)`);

    const response: GatewayResponse = {
      success: true,
      request_id: created.id,
      request_number: created.request_number,
      track_url: `https://uberfiix.lovable.app/track/${created.id}`,
      channel: body.channel,
      created_at: created.created_at,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`❌ Gateway error (${durationMs}ms):`, error);

    // Log failed request
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseAdmin.from('api_gateway_logs').insert({
        route: '/gateway/error',
        method: 'POST',
        status_code: 500,
        duration_ms: durationMs,
        client_ip: clientIP,
        consumer_type: 'unknown',
        request_id: crypto.randomUUID(),
        user_agent: req.headers.get('user-agent') || null,
      });
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ error: 'Internal server error', message_ar: 'حدث خطأ داخلي' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
