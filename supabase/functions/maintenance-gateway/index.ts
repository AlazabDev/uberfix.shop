import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { rateLimit, createRateLimitResponse } from '../_shared/rateLimiter.ts';

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
 * - api: من مواقع خارجية عبر API Key
 * 
 * يضمن هذا الـ Gateway:
 * 1. توحيد بنية البيانات من جميع المصادر
 * 2. تطبيق قواعد التحقق والتطهير الموحدة
 * 3. إنشاء رقم طلب موحد (MR-...)
 * 4. تسجيل مصدر القناة في audit_logs
 * 5. إرسال إشعارات موحدة
 * 6. مصادقة API Key للمستهلكين الخارجيين
 */

// ─── Types ───────────────────────────────────────────────────────────

type Channel = 
  | 'whatsapp_flow' | 'jotform' | 'public_form' | 'qr_guest' 
  | 'facebook_lead' | 'phone' | 'internal' | 'whatsapp_chat'
  | 'email' | 'api' | 'bot_gateway';

interface GatewayRequest {
  channel: Channel;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  service_type?: string;
  priority?: string;
  description?: string;
  location?: string;
  branch_id?: string;
  branch_name?: string;
  company_id?: string;
  property_id?: string;
  source_id?: string;
  source_metadata?: Record<string, unknown>;
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

interface ApiConsumer {
  id: string;
  name: string;
  channel: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  allowed_origins: string[];
  company_id: string | null;
  branch_id: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────

const VALID_CHANNELS: Channel[] = [
  'whatsapp_flow', 'jotform', 'public_form', 'qr_guest',
  'facebook_lead', 'phone', 'internal', 'whatsapp_chat',
  'email', 'api', 'bot_gateway',
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

// Channels that require API key authentication
const API_KEY_CHANNELS: Channel[] = ['api'];

// Channels called internally by other edge functions (trusted)
const INTERNAL_CHANNELS: Channel[] = [
  'whatsapp_flow', 'jotform', 'public_form', 'qr_guest',
  'facebook_lead', 'phone', 'internal', 'whatsapp_chat', 'email', 'bot_gateway',
];

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
  if (p.includes('عاجل') || p === 'urgent' || p === 'high') return 'high';
  if (p.includes('متوسط') || p === 'medium') return 'medium';
  if (p.includes('عادي') || p === 'normal' || p === 'low') return 'low';
  return VALID_PRIORITIES.includes(p) ? p : 'medium';
}

function errorResponse(message: string, messageAr: string, status: number, extra?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ error: message, message_ar: messageAr, ...extra }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─── API Key Authentication ──────────────────────────────────────────

async function authenticateApiKey(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ consumer: ApiConsumer | null; error: Response | null }> {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return {
      consumer: null,
      error: errorResponse(
        'API key required',
        'مفتاح API مطلوب. أرسل المفتاح في الهيدر x-api-key',
        401
      ),
    };
  }

  const { data: consumer, error } = await supabaseAdmin
    .from('api_consumers')
    .select('id, name, channel, is_active, rate_limit_per_minute, allowed_origins, company_id, branch_id')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !consumer) {
    return {
      consumer: null,
      error: errorResponse(
        'Invalid or inactive API key',
        'مفتاح API غير صالح أو معطل',
        403
      ),
    };
  }

  // Update last_used_at and total_requests
  supabaseAdmin
    .from('api_consumers')
    .update({ last_used_at: new Date().toISOString(), total_requests: (consumer as any).total_requests + 1 })
    .eq('id', consumer.id)
    .then(() => {});

  // Check origin if allowed_origins is set
  const origin = req.headers.get('origin');
  if (consumer.allowed_origins?.length > 0 && origin) {
    if (!consumer.allowed_origins.includes(origin) && !consumer.allowed_origins.includes('*')) {
      return {
        consumer: null,
        error: errorResponse('Origin not allowed', 'النطاق غير مسموح به', 403),
      };
    }
  }

  return { consumer: consumer as ApiConsumer, error: null };
}

// ─── Request Processing ─────────────────────────────────────────────

async function resolveCompanyBranch(
  supabaseAdmin: ReturnType<typeof createClient>,
  body: GatewayRequest,
  consumer: ApiConsumer | null
): Promise<{ companyId: string; branchId: string; error: Response | null }> {
  // Priority: consumer defaults > body params > property lookup > system defaults
  let companyId = consumer?.company_id || body.company_id || '';
  let branchId = consumer?.branch_id || body.branch_id || '';

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
        companyId = companyId || property.company_id;
        branchId = branchId || property.branch_id;
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
      return {
        companyId: '', branchId: '',
        error: errorResponse('No company configured', 'لم يتم إعداد الشركة', 500),
      };
    }

    companyId = companyId || defaultOrg.id;
    const branches = (defaultOrg as any).branches as Array<{ id: string; name: string }>;

    if (!branchId && branches?.length) {
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
      return {
        companyId: '', branchId: '',
        error: errorResponse('No branch available', 'لا يوجد فرع متاح', 500),
      };
    }
  }

  return { companyId, branchId, error: null };
}

async function uploadImages(
  supabaseAdmin: ReturnType<typeof createClient>,
  requestId: string,
  images: string[]
): Promise<number> {
  let uploadedImages = 0;
  for (let i = 0; i < Math.min(images.length, 5); i++) {
    try {
      const base64Data = images[i];
      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const binaryData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      const fileName = `${requestId}/${Date.now()}-${i}.jpg`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('maintenance-attachments')
        .upload(fileName, binaryData, { contentType: 'image/jpeg', upsert: false });
      if (!uploadError) uploadedImages++;
    } catch (imgError) {
      console.warn('Image upload failed:', imgError);
    }
  }
  return uploadedImages;
}

async function sendNotifications(
  supabaseAdmin: ReturnType<typeof createClient>,
  requestId: string,
  _requestNumber: string,
  _clientPhone: string,
  _serviceLabel: string,
  _channel: string
) {
  // Unified notification via send-maintenance-notification
  // This handles WhatsApp, Email, and in-app notifications in one call
  // DO NOT call send-whatsapp-meta directly here to avoid duplicate messages
  try {
    await supabaseAdmin.functions.invoke('send-maintenance-notification', {
      body: { request_id: requestId, event_type: 'request_created' }
    });
  } catch (notifErr) {
    console.warn('Notification failed:', notifErr);
  }
}

// ─── Main Handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 'الطريقة غير مسموحة', 405);
  }

  const startTime = Date.now();
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('cf-connecting-ip') || 'unknown';

  try {
    const body: GatewayRequest = await req.json();

    // ─── Validate Channel ────────────────────────────────────────
    if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
      return errorResponse('Invalid channel', 'قناة غير صالحة', 400, { valid_channels: VALID_CHANNELS });
    }

    // ─── Supabase Admin Client ───────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ─── API Key Auth for external channels ──────────────────────
    let consumer: ApiConsumer | null = null;

    if (API_KEY_CHANNELS.includes(body.channel)) {
      const authResult = await authenticateApiKey(req, supabaseAdmin);
      if (authResult.error) return authResult.error;
      consumer = authResult.consumer;

      // Consumer-specific rate limiting
      const consumerLimit = consumer!.rate_limit_per_minute || 30;
      const isAllowed = rateLimit(`consumer_${consumer!.id}`, { windowMs: 60_000, maxRequests: consumerLimit });
      if (!isAllowed) return createRateLimitResponse();
    } else {
      // Default IP-based rate limiting for non-API channels
      const isAllowed = rateLimit(`gateway_${clientIP}`, { windowMs: 60_000, maxRequests: 10 });
      if (!isAllowed) return createRateLimitResponse();
    }

    // ─── Validate Client Name ────────────────────────────────────
    const clientName = sanitize(body.client_name, 100);
    if (!clientName) {
      return errorResponse('client_name is required', 'اسم العميل مطلوب', 400);
    }

    // ─── Normalize & Sanitize ────────────────────────────────────
    const clientPhone = sanitizePhone(body.client_phone);
    const clientEmail = body.client_email?.trim().toLowerCase().slice(0, 100) || '';
    const serviceType = normalizeServiceType(body.service_type);
    const priority = normalizePriority(body.priority);
    const description = sanitize(body.description, 500);
    const location = sanitize(body.location, 200);
    const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;

    // ─── Resolve Company & Branch ────────────────────────────────
    const orgResult = await resolveCompanyBranch(supabaseAdmin, body, consumer);
    if (orgResult.error) return orgResult.error;

    // ─── Create Maintenance Request ──────────────────────────────
    const requestData: Record<string, unknown> = {
      company_id: orgResult.companyId,
      branch_id: orgResult.branchId,
      title: `طلب صيانة - ${serviceLabel}`,
      description: description || `طلب صيانة ${serviceLabel}`,
      service_type: serviceType,
      status: 'Open',
      workflow_stage: 'submitted',
      channel: consumer ? `api:${consumer.name}` : body.channel,
      priority,
      client_name: clientName,
      client_phone: clientPhone || null,
      client_email: clientEmail || null,
      location: location || body.branch_name || null,
    };

    if (body.property_id) requestData.property_id = body.property_id;

    const { data: created, error: createError } = await supabaseAdmin
      .from('maintenance_requests')
      .insert([requestData])
      .select('id, request_number, created_at')
      .single();

    if (createError) {
      console.error(`❌ Gateway [${body.channel}] insert failed:`, createError);
      return errorResponse('Failed to create request', 'فشل في إنشاء الطلب', 500);
    }

    // ─── Upload Images ───────────────────────────────────────────
    let uploadedImages = 0;
    if (body.images?.length) {
      uploadedImages = await uploadImages(supabaseAdmin, created.id, body.images);
    }

    // ─── Audit Log ───────────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    await supabaseAdmin.from('audit_logs').insert({
      action: 'GATEWAY_REQUEST_CREATED',
      table_name: 'maintenance_requests',
      record_id: created.id,
      new_values: {
        channel: body.channel,
        consumer_name: consumer?.name || null,
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

    // ─── API Gateway Logs ────────────────────────────────────────
    try {
      await supabaseAdmin.from('api_gateway_logs').insert({
        route: `/gateway/${body.channel}`,
        method: 'POST',
        status_code: 201,
        duration_ms: durationMs,
        client_ip: clientIP,
        consumer_type: consumer ? `api:${consumer.name}` : body.channel,
        consumer_id: consumer?.id || body.source_id || null,
        request_id: created.id,
        user_agent: req.headers.get('user-agent') || null,
        response_size: null,
      });
    } catch (logErr) {
      console.warn('Gateway log insert failed:', logErr);
    }

    // ─── Notifications ───────────────────────────────────────────
    sendNotifications(supabaseAdmin, created.id, created.request_number, clientPhone, serviceLabel, body.channel);

    console.log(`✅ Gateway [${body.channel}${consumer ? `:${consumer.name}` : ''}] → ${created.request_number} (${durationMs}ms)`);

    const response: GatewayResponse = {
      success: true,
      request_id: created.id,
      request_number: created.request_number,
      track_url: `https://uberfix.shop/track/${created.id}`,
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

    return errorResponse('Internal server error', 'حدث خطأ داخلي', 500);
  }
});
