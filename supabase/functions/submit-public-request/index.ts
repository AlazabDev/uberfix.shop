import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { rateLimit } from '../_shared/rateLimiter.ts';

/**
 * Public endpoint for submitting maintenance requests
 * Supports two modes:
 * 1. QR mode: requires property_id (from QR code scan)
 * 2. Direct mode: general form submission without property_id
 * 
 * Security: Rate limiting, input validation, no auth required
 */

interface RequestBody {
  // QR mode
  property_id?: string;
  // Direct mode fields
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  branch_name?: string;
  // Common fields
  service_type: string;
  priority?: string;
  description?: string;
  notes?: string;
  images?: string[];
  channel?: string;
}

const SERVICE_LABELS: Record<string, { ar: string; en: string }> = {
  plumbing: { ar: 'سباكة', en: 'Plumbing' },
  electrical: { ar: 'كهرباء', en: 'Electrical' },
  ac: { ar: 'تكييف', en: 'AC' },
  carpentry: { ar: 'نجارة', en: 'Carpentry' },
  metalwork: { ar: 'حدادة', en: 'Metalwork' },
  painting: { ar: 'دهانات', en: 'Painting' },
  cleaning: { ar: 'تنظيف', en: 'Cleaning' },
  other: { ar: 'أخرى', en: 'Other' },
};

const VALID_SERVICES = Object.keys(SERVICE_LABELS);
const VALID_PRIORITIES = ['high', 'medium', 'low'];

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

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('cf-connecting-ip') || 'unknown';
    
    const isAllowed = rateLimit(`submit_${clientIP}`, { windowMs: 60000, maxRequests: 5 });
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests', message_ar: 'يرجى الانتظار قبل المحاولة مرة أخرى' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    const body: RequestBody = await req.json();

    // Validate service type
    const serviceType = body.service_type?.trim().toLowerCase();
    if (!serviceType || !VALID_SERVICES.includes(serviceType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid service type', message_ar: 'نوع الخدمة غير صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedName = body.client_name?.trim().replace(/[<>"';]/g, '').slice(0, 100) || '';
    const sanitizedPhone = body.client_phone?.replace(/[^\d+]/g, '').slice(0, 15) || '';
    const sanitizedEmail = body.client_email?.trim().toLowerCase().slice(0, 100) || '';
    const sanitizedNotes = (body.description || body.notes || '').trim().slice(0, 500);
    const priority = VALID_PRIORITIES.includes(body.priority || '') ? body.priority! : 'medium';
    const channel = body.channel || (body.property_id ? 'qr_guest' : 'public_form');

    // Validate: direct mode requires client_name
    if (!body.property_id && !sanitizedName) {
      return new Response(
        JSON.stringify({ error: 'Client name is required', message_ar: 'اسم مقدم الطلب مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let companyId: string;
    let branchId: string;
    let propertyName = '';
    let propertyAddress = '';

    if (body.property_id) {
      // QR mode - get company/branch from property
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(body.property_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid property ID', message_ar: 'معرف العقار غير صحيح' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: property, error: propError } = await supabaseAdmin
        .from('properties')
        .select('id, name, address, company_id, branch_id')
        .eq('id', body.property_id)
        .maybeSingle();

      if (propError || !property) {
        return new Response(
          JSON.stringify({ error: 'Property not found', message_ar: 'العقار غير موجود' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      companyId = property.company_id;
      branchId = property.branch_id;
      propertyName = property.name;
      propertyAddress = property.address || '';
    } else {
      // Direct mode - get default company/branch
      const { data: defaultOrg, error: orgError } = await supabaseAdmin
        .from('companies')
        .select('id, branches(id, name)')
        .limit(1)
        .maybeSingle();

      if (orgError || !defaultOrg) {
        console.error('No default company found:', orgError);
        return new Response(
          JSON.stringify({ error: 'System configuration error', message_ar: 'خطأ في إعداد النظام' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      companyId = defaultOrg.id;
      // Try to match branch by name
      const branches = (defaultOrg as any).branches as Array<{ id: string; name: string }>;
      const matchedBranch = body.branch_name 
        ? branches?.find(b => b.name.includes(body.branch_name!)) 
        : null;
      branchId = matchedBranch?.id || branches?.[0]?.id || '';

      if (!branchId) {
        return new Response(
          JSON.stringify({ error: 'No branch available', message_ar: 'لا يوجد فرع متاح' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const serviceLabel = SERVICE_LABELS[serviceType] || { ar: serviceType, en: serviceType };

    // ─── Route through Unified Gateway ─────────────────────────
    const { data: gatewayResult, error: gatewayError } = await supabaseAdmin.functions.invoke('maintenance-gateway', {
      body: {
        channel,
        client_name: sanitizedName || 'زائر',
        client_phone: sanitizedPhone || undefined,
        client_email: sanitizedEmail || undefined,
        service_type: serviceType,
        priority,
        description: sanitizedNotes || `طلب صيانة ${serviceLabel.ar}`,
        location: propertyAddress || body.branch_name || undefined,
        property_id: body.property_id || undefined,
        branch_name: body.branch_name || undefined,
        company_id: companyId,
        branch_id: branchId,
        images: body.images,
        source_id: body.property_id || undefined,
        source_metadata: {
          submission_mode: body.property_id ? 'qr' : 'direct',
          property_name: propertyName || undefined,
        }
      }
    });

    if (gatewayError || !gatewayResult?.success) {
      console.error('Gateway error:', gatewayError || gatewayResult);
      return new Response(
        JSON.stringify({ error: 'Failed to create request', message_ar: 'فشل في إنشاء الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Public request → Gateway → ${gatewayResult.request_number} | Channel: ${channel}`);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: gatewayResult.request_id,
        request_number: gatewayResult.request_number,
        message_ar: `تم إرسال طلبك بنجاح! رقم الطلب: ${gatewayResult.request_number}`,
        message_en: `Request submitted successfully! Request #: ${gatewayResult.request_number}`,
        track_url: `/track/${gatewayResult.request_id}`,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message_ar: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
