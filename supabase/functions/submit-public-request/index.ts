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

    // Create maintenance request
    const requestData: Record<string, unknown> = {
      company_id: companyId,
      branch_id: branchId,
      title: `طلب صيانة - ${serviceLabel.ar}`,
      description: sanitizedNotes || `طلب صيانة ${serviceLabel.ar}`,
      service_type: serviceType,
      status: 'Open',
      workflow_stage: 'submitted',
      channel,
      priority,
      client_name: sanitizedName || 'زائر',
      client_phone: sanitizedPhone || null,
      client_email: sanitizedEmail || null,
      location: propertyAddress || body.branch_name || null,
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
      console.error('Failed to create request:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create request', message_ar: 'فشل في إنشاء الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload images if any
    let uploadedImages = 0;
    if (body.images && body.images.length > 0) {
      const imagesToProcess = body.images.slice(0, 5);
      for (let i = 0; i < imagesToProcess.length; i++) {
        try {
          const base64Data = imagesToProcess[i];
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

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'PUBLIC_REQUEST_SUBMITTED',
      table_name: 'maintenance_requests',
      record_id: created.id,
      new_values: {
        request_number: created.request_number,
        service_type: serviceType,
        channel,
        ip: clientIP,
        images_count: uploadedImages,
      }
    });

    // WhatsApp notification to client
    if (sanitizedPhone) {
      try {
        await supabaseAdmin.functions.invoke('send-whatsapp-meta', {
          body: {
            to: sanitizedPhone,
            message: `✅ تم استلام طلب الصيانة بنجاح!\n\n📋 رقم الطلب: ${created.request_number}\n🔧 نوع الخدمة: ${serviceLabel.ar}\n\nيمكنك متابعة حالة طلبك من هنا:\nhttps://uberfiix.lovable.app/track/${created.id}`,
            requestId: created.id,
          }
        });
      } catch (notifErr) {
        console.warn('WhatsApp notification failed:', notifErr);
      }
    }

    console.log(`✅ Public request created: ${created.request_number} (${created.id}) | Channel: ${channel}`);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: created.id,
        request_number: created.request_number,
        message_ar: `تم إرسال طلبك بنجاح! رقم الطلب: ${created.request_number}`,
        message_en: `Request submitted successfully! Request #: ${created.request_number}`,
        track_url: `/track/${created.id}`,
        images_uploaded: uploadedImages,
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
