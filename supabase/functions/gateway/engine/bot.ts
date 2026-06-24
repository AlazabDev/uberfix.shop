import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  plumbing: "سباكة", electrical: "كهرباء", ac: "تكييف", painting: "دهانات",
  carpentry: "نجارة", cleaning: "تنظيف", general: "صيانة عامة",
  appliance: "أجهزة منزلية", pest_control: "مكافحة حشرات", landscaping: "حدائق وتنسيق",
  finishing: "تشطيبات", renovation: "ترميم",
};

// المراحل المسموح للبوت تعديلها (لا يستطيع البوت الإغلاق المالي/الفوترة)
const BOT_ALLOWED_STAGES = new Set([
  'submitted', 'acknowledged', 'on_hold', 'cancelled', 'scheduled',
]);

// الحالات النهائية - لا يجوز التعديل عليها
const TERMINAL_STAGES = new Set(['closed', 'paid', 'cancelled']);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    // Support both API key auth and Supabase JWT auth
    const apiKey = req.headers.get('x-api-key');
    let authenticated = false;
    let consumerId: string | null = null;

    if (apiKey) {
      // External API consumer auth
      const { data: consumer } = await supabase
        .from('api_consumers')
        .select('id, name, is_active, channel')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .maybeSingle();

      if (consumer) {
        authenticated = true;
        consumerId = consumer.id;
      }
    }

    // Also check Supabase JWT (for internal app usage)
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      // Allow anon key (public bot widget) or valid user JWT
      if (token === anonKey) {
        authenticated = true;
      } else {
        const anonClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await anonClient.auth.getUser();
        if (user) authenticated = true;
      }
    }

    if (!authenticated) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, payload, session_id, metadata } = await req.json();

    if (!action || !payload) {
      return jsonResponse({ success: false, error: 'action and payload are required' }, 400);
    }

    // Log the gateway request
    await supabase.from('api_gateway_logs').insert({
      route: `bot-gateway/${action}`,
      method: 'POST',
      status_code: 200,
      duration_ms: 0,
      request_id: crypto.randomUUID(),
      client_ip: '0.0.0.0',
      consumer_id: consumerId,
      consumer_type: consumerId ? 'api_consumer' : 'app',
      user_agent: req.headers.get('user-agent'),
      request_body: JSON.stringify({ action, payload: { ...payload, client_phone: payload.client_phone ? '***' : undefined } }),
    }).catch(e => console.error('Log insert error:', e));

    let result: any;

    switch (action) {
      case 'create_request':
        result = await handleCreateRequest(supabase, supabaseUrl, supabaseServiceKey, payload, metadata);
        break;
      case 'check_status':
        result = await handleCheckStatus(supabase, payload);
        break;
      case 'get_request_details':
        result = await handleGetRequestDetails(supabase, payload);
        break;
      case 'update_request':
        result = await handleUpdateRequest(supabase, payload, consumerId);
        break;
      case 'cancel_request':
        result = await handleCancelRequest(supabase, payload, consumerId);
        break;
      case 'add_note':
        result = await handleAddNote(supabase, payload, consumerId);
        break;
      case 'assign_technician':
        result = await handleAssignTechnician(supabase, supabaseUrl, supabaseServiceKey, payload);
        break;
      case 'list_technicians':
        result = await handleListTechnicians(supabase, payload);
        break;
      case 'list_categories':
        result = await handleListCategories(supabase);
        break;
      case 'list_services':
        result = handleListServices();
        break;
      case 'get_branches':
        result = await handleGetBranches(supabase);
        break;
      case 'find_nearest_branch':
        result = await handleFindNearestBranch(supabase, payload);
        break;
      case 'collect_customer_info':
        result = await handleCollectCustomerInfo(supabase, payload, session_id);
        break;
      case 'get_quote':
        result = await handleGetQuote(supabase, payload, metadata);
        break;
      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return jsonResponse(result, result.success ? 200 : 400);

  } catch (error) {
    console.error('Bot Gateway error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
});

async function handleCreateRequest(supabase: any, supabaseUrl: string, serviceKey: string, payload: any, metadata?: any) {
  const { client_name, client_phone, client_email, location, service_type, title, description, priority, latitude, longitude } = payload;

  if (!client_name || !client_phone || !location || !title || !description) {
    return { success: false, error: 'Missing required fields: client_name, client_phone, location, title, description' };
  }

  // Route through maintenance-gateway for unified tracking
  try {
    const gatewayResp = await fetch(`${supabaseUrl}/functions/v1/maintenance-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        channel: 'bot_gateway',
        client_name,
        client_phone,
        client_email: client_email || null,
        location,
        service_type: service_type || 'general',
        title,
        description,
        priority: priority || 'medium',
        latitude: latitude || null,
        longitude: longitude || null,
        source_metadata: {
          bot_source: metadata?.source || 'azabot',
          ...(metadata || {}),
        },
      }),
    });

    const gatewayResult = await gatewayResp.json();

    if (gatewayResp.ok && gatewayResult.id) {
      // Send WhatsApp notification
      if (client_phone) {
        try {
          const serviceLabel = SERVICE_TYPE_LABELS[service_type || 'general'] || 'صيانة عامة';
          await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-meta`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: client_phone,
              message: `✅ تم استلام طلب الصيانة بنجاح!\n\n📋 رقم التتبع: ${gatewayResult.request_number || ''}\n🔧 الخدمة: ${serviceLabel}\n📝 ${title}\n📍 ${location}\n\nسيتم التواصل معك قريباً.\nشكراً لثقتك في UberFix 🏠`,
              requestId: gatewayResult.id,
            }),
          });
        } catch (e) {
          console.error('WhatsApp notification error:', e);
        }
      }

      return {
        success: true,
        request_id: gatewayResult.id,
        tracking_number: gatewayResult.request_number,
        message: `تم إنشاء الطلب بنجاح. رقم التتبع: ${gatewayResult.request_number || gatewayResult.id}`,
      };
    }

    return { success: false, error: gatewayResult.error || 'Failed to create request via gateway' };
  } catch (err) {
    console.error('Gateway call error:', err);
    return { success: false, error: 'فشل في إنشاء الطلب' };
  }
}

async function handleCheckStatus(supabase: any, payload: any) {
  const { search_term, search_type } = payload;
  if (!search_term) return { success: false, error: 'search_term is required' };

  let query = supabase
    .from('maintenance_requests')
    .select('id, title, status, priority, service_type, created_at, client_name, request_number')
    .order('created_at', { ascending: false })
    .limit(5);

  if (search_type === 'request_number' || search_term.startsWith('UF')) {
    query = query.ilike('request_number', `%${search_term}%`);
  } else if (search_type === 'phone') {
    query = query.ilike('client_phone', `%${search_term}%`);
  } else {
    query = query.or(`title.ilike.%${search_term}%,client_name.ilike.%${search_term}%,request_number.ilike.%${search_term}%`);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: (data || []).map((r: any) => ({
      request_number: r.request_number,
      title: r.title,
      status: r.status,
      priority: r.priority,
      service: SERVICE_TYPE_LABELS[r.service_type] || r.service_type,
      date: r.created_at,
    })),
  };
}

function handleListServices() {
  return {
    success: true,
    data: Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => ({ key, label })),
  };
}

async function handleGetBranches(supabase: any) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, address, city, opening_hours')
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

async function handleGetQuote(supabase: any, payload: any, metadata?: any) {
  const { service_type, description, location, area_sqm, client_name, client_phone } = payload;

  if (!service_type || !description || !client_name || !client_phone) {
    return { success: false, error: 'Missing required fields: service_type, description, client_name, client_phone' };
  }

  // Store quote request as a maintenance request with special status
  const { data: company } = await supabase
    .from('companies').select('id').order('created_at').limit(1).maybeSingle();
  const { data: branch } = await supabase
    .from('branches').select('id').eq('company_id', company!.id).order('created_at').limit(1).maybeSingle();

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .insert({
      company_id: company.id,
      branch_id: branch.id,
      title: `طلب عرض سعر - ${SERVICE_TYPE_LABELS[service_type] || service_type}`,
      description: `${description}${area_sqm ? `\nالمساحة: ${area_sqm} م²` : ''}\nالموقع: ${location || 'غير محدد'}`,
      client_name,
      client_phone,
      location: location || null,
      service_type,
      priority: 'medium',
      status: 'pending',
      channel: 'bot_gateway',
      customer_notes: `طلب عرض سعر عبر عزبوت - ${metadata?.source || 'web'}`,
    })
    .select('id, request_number')
    .single();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    request_id: request.id,
    tracking_number: request.request_number,
    message: 'تم استلام طلب عرض السعر. سيتم التواصل معك خلال 24 ساعة.',
  };
}

// ============================================================
// NEW HANDLERS — Full lifecycle for AzaBot
// ============================================================

/** تفاصيل طلب واحد كاملة (للبوت لعرضها للعميل) */
async function handleGetRequestDetails(supabase: any, payload: any) {
  const { request_id, request_number, client_phone } = payload;
  if (!request_id && !request_number) {
    return { success: false, error: 'request_id أو request_number مطلوب' };
  }

  let query = supabase
    .from('maintenance_requests')
    .select('id, request_number, title, description, status, workflow_stage, priority, service_type, location, client_name, client_phone, estimated_cost, actual_cost, assigned_technician_id, assigned_vendor_id, created_at, updated_at, sla_complete_due, branch_id')
    .limit(1);

  if (request_id) query = query.eq('id', request_id);
  else query = query.eq('request_number', request_number);

  const { data, error } = await query.maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'الطلب غير موجود' };

  // التحقق من الهاتف لو مرسل (حماية ضد التسريب)
  if (client_phone && data.client_phone && !data.client_phone.includes(client_phone.replace(/\D/g, '').slice(-9))) {
    return { success: false, error: 'رقم الهاتف لا يطابق الطلب' };
  }

  // جلب بيانات الفني لو موجود
  let technician = null;
  if (data.assigned_technician_id) {
    const { data: tech } = await supabase
      .from('technicians')
      .select('id, name, specialization, rating, phone')
      .eq('id', data.assigned_technician_id)
      .maybeSingle();
    if (tech) technician = tech;
  }

  return {
    success: true,
    data: {
      ...data,
      service_label: SERVICE_TYPE_LABELS[data.service_type] || data.service_type,
      technician,
    },
  };
}

/** تعديل طلب موجود — حقول محدودة + قواعد انتقال آمنة */
async function handleUpdateRequest(supabase: any, payload: any, consumerId: string | null) {
  const { request_id, client_phone, updates } = payload;
  if (!request_id || !updates || typeof updates !== 'object') {
    return { success: false, error: 'request_id و updates مطلوبان' };
  }

  // جلب الطلب الحالي للتحقق
  const { data: current, error: fetchErr } = await supabase
    .from('maintenance_requests')
    .select('id, status, workflow_stage, client_phone, branch_id, company_id')
    .eq('id', request_id)
    .maybeSingle();

  if (fetchErr || !current) return { success: false, error: 'الطلب غير موجود' };

  // حماية: إذا أرسل client_phone يجب أن يطابق
  if (client_phone && current.client_phone) {
    const last9Sent = client_phone.replace(/\D/g, '').slice(-9);
    if (!current.client_phone.includes(last9Sent)) {
      return { success: false, error: 'غير مصرح بتعديل هذا الطلب' };
    }
  }

  // منع التعديل في المراحل النهائية
  if (TERMINAL_STAGES.has(current.workflow_stage)) {
    return { success: false, error: `لا يمكن تعديل طلب في حالة ${current.workflow_stage}` };
  }

  // فقط الحقول المسموحة من البوت
  const ALLOWED_FIELDS = ['description', 'location', 'priority', 'service_type', 'customer_notes', 'latitude', 'longitude', 'title'];
  const safeUpdates: Record<string, unknown> = {};
  for (const k of ALLOWED_FIELDS) {
    if (k in updates && updates[k] !== undefined && updates[k] !== null) {
      safeUpdates[k] = updates[k];
    }
  }

  // تغيير المرحلة فقط ضمن المسموح
  if (updates.workflow_stage) {
    if (!BOT_ALLOWED_STAGES.has(updates.workflow_stage)) {
      return { success: false, error: `البوت لا يستطيع الانتقال إلى مرحلة ${updates.workflow_stage}` };
    }
    safeUpdates.workflow_stage = updates.workflow_stage;
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { success: false, error: 'لا توجد حقول صالحة للتحديث' };
  }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update(safeUpdates)
    .eq('id', request_id)
    .select('id, request_number, status, workflow_stage')
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  // audit
  await supabase.from('audit_logs').insert({
    action: 'BOT_UPDATE_REQUEST',
    table_name: 'maintenance_requests',
    record_id: request_id,
    new_values: { consumer_id: consumerId, fields: Object.keys(safeUpdates) },
  }).catch(() => {});

  return { success: true, data, message: 'تم تحديث الطلب بنجاح' };
}

/** إلغاء طلب */
async function handleCancelRequest(supabase: any, payload: any, consumerId: string | null) {
  const { request_id, client_phone, reason } = payload;
  if (!request_id) return { success: false, error: 'request_id مطلوب' };

  const { data: current } = await supabase
    .from('maintenance_requests')
    .select('id, workflow_stage, client_phone, request_number')
    .eq('id', request_id)
    .maybeSingle();

  if (!current) return { success: false, error: 'الطلب غير موجود' };

  if (client_phone && current.client_phone) {
    const last9 = client_phone.replace(/\D/g, '').slice(-9);
    if (!current.client_phone.includes(last9)) {
      return { success: false, error: 'غير مصرح بإلغاء هذا الطلب' };
    }
  }

  // لا يمكن إلغاء طلب بدأ تنفيذه أو أُغلق
  if (['in_progress', 'inspection', 'completed', 'billed', 'paid', 'closed', 'cancelled'].includes(current.workflow_stage)) {
    return { success: false, error: `لا يمكن إلغاء طلب في حالة ${current.workflow_stage}` };
  }

  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      workflow_stage: 'cancelled',
      status: 'Cancelled',
      customer_notes: reason ? `إلغاء: ${reason}` : 'تم الإلغاء عبر البوت',
    })
    .eq('id', request_id);

  if (error) return { success: false, error: error.message };

  await supabase.from('audit_logs').insert({
    action: 'BOT_CANCEL_REQUEST',
    table_name: 'maintenance_requests',
    record_id: request_id,
    new_values: { consumer_id: consumerId, reason },
  }).catch(() => {});

  return { success: true, message: `تم إلغاء الطلب ${current.request_number}` };
}

/** إضافة ملاحظة عميل بدون تغيير حالة */
async function handleAddNote(supabase: any, payload: any, consumerId: string | null) {
  const { request_id, note, client_phone } = payload;
  if (!request_id || !note) return { success: false, error: 'request_id و note مطلوبان' };

  const { data: current } = await supabase
    .from('maintenance_requests')
    .select('customer_notes, client_phone')
    .eq('id', request_id)
    .maybeSingle();

  if (!current) return { success: false, error: 'الطلب غير موجود' };

  if (client_phone && current.client_phone) {
    const last9 = client_phone.replace(/\D/g, '').slice(-9);
    if (!current.client_phone.includes(last9)) {
      return { success: false, error: 'غير مصرح' };
    }
  }

  const stamp = new Date().toISOString();
  const newNotes = `${current.customer_notes || ''}\n[${stamp}] ${note.slice(0, 500)}`.trim();

  const { error } = await supabase
    .from('maintenance_requests')
    .update({ customer_notes: newNotes })
    .eq('id', request_id);

  if (error) return { success: false, error: error.message };

  await supabase.from('audit_logs').insert({
    action: 'BOT_ADD_NOTE',
    table_name: 'maintenance_requests',
    record_id: request_id,
    new_values: { consumer_id: consumerId },
  }).catch(() => {});

  return { success: true, message: 'تم إضافة الملاحظة' };
}

/** تعيين فني — يستدعي assign-technician-to-request للتعيين الذكي،
 *  أو يقبل technician_id لتعيين مباشر */
async function handleAssignTechnician(supabase: any, supabaseUrl: string, serviceKey: string, payload: any) {
  const { request_id, technician_id, auto } = payload;
  if (!request_id) return { success: false, error: 'request_id مطلوب' };

  // تعيين تلقائي ذكي
  if (auto || !technician_id) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/assign-technician-to-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({ requestId: request_id }),
      });
      const result = await resp.json();
      if (!resp.ok) return { success: false, error: result.error || 'فشل التعيين التلقائي' };
      return {
        success: true,
        message: `تم تعيين الفني ${result.assigned_technician?.name} (تقييم ${result.assigned_technician?.rating})`,
        data: result,
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // تعيين يدوي بـ technician_id محدد
  const { data: tech, error: techErr } = await supabase
    .from('technicians')
    .select('id, name, is_active, is_verified, status')
    .eq('id', technician_id)
    .maybeSingle();

  if (techErr || !tech) return { success: false, error: 'الفني غير موجود' };
  if (!tech.is_active || !tech.is_verified) {
    return { success: false, error: 'الفني غير نشط أو غير موثق' };
  }

  const { error: assignErr } = await supabase
    .from('maintenance_requests')
    .update({
      assigned_technician_id: technician_id,
      status: 'Assigned',
      workflow_stage: 'assigned',
    })
    .eq('id', request_id);

  if (assignErr) return { success: false, error: assignErr.message };

  return { success: true, message: `تم تعيين الفني ${tech.name}`, data: { technician: tech } };
}

/** قائمة فنيين متاحين (مع فلترة اختيارية بالتخصص/المدينة) */
async function handleListTechnicians(supabase: any, payload: any) {
  const { specialization, city_id, limit = 10 } = payload || {};

  let q = supabase
    .from('technicians')
    .select('id, name, specialization, rating, total_reviews, level, status, is_verified, city_id')
    .eq('is_active', true)
    .eq('is_verified', true)
    .order('rating', { ascending: false })
    .limit(Math.min(limit, 50));

  if (specialization) q = q.eq('specialization', specialization);
  if (city_id) q = q.eq('city_id', city_id);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };

  return { success: true, data: data || [] };
}

/** فئات/تصنيفات الصيانة */
async function handleListCategories(supabase: any) {
  const { data, error } = await supabase
    .from('maintenance_categories')
    .select('id, name, name_ar, slug, is_active')
    .eq('is_active', true)
    .order('name');

  // fallback: إن لم توجد categories, نرجع SERVICE_TYPE_LABELS
  if (error || !data || data.length === 0) {
    return {
      success: true,
      data: Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => ({ slug: key, name_ar: label, name: key })),
    };
  }
  return { success: true, data };
}

/** أقرب فرع لإحداثيات معينة (لمواقع موسسة العزب) */
async function handleFindNearestBranch(supabase: any, payload: any) {
  const { latitude, longitude, city } = payload || {};

  const { data: branches, error } = await supabase
    .from('branches')
    .select('id, name, address, city, latitude, longitude, phone, opening_hours, company_id');

  if (error) return { success: false, error: error.message };
  if (!branches || branches.length === 0) return { success: false, error: 'لا توجد فروع' };

  // فلترة بالمدينة لو مرسلة
  let filtered = branches;
  if (city) {
    const cityLower = city.toLowerCase();
    const cityMatches = branches.filter((b: any) =>
      b.city && (b.city.toLowerCase().includes(cityLower) || cityLower.includes(b.city.toLowerCase()))
    );
    if (cityMatches.length) filtered = cityMatches;
  }

  // حساب المسافة لو إحداثيات متوفرة
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    const withDistance = filtered
      .filter((b: any) => b.latitude && b.longitude)
      .map((b: any) => {
        const R = 6371;
        const dLat = ((b.latitude - latitude) * Math.PI) / 180;
        const dLon = ((b.longitude - longitude) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos((latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
        const distance_km = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...b, distance_km: Math.round(distance_km * 10) / 10 };
      })
      .sort((a: any, b: any) => a.distance_km - b.distance_km);

    return { success: true, data: withDistance.slice(0, 5) };
  }

  return { success: true, data: filtered.slice(0, 5) };
}

/** جمع/تحديث معلومات العميل (upsert في customer_profiles أو session) */
async function handleCollectCustomerInfo(supabase: any, payload: any, sessionId?: string) {
  const { client_phone, client_name, client_email, location, latitude, longitude, preferred_branch_id, notes } = payload;

  if (!client_phone) return { success: false, error: 'client_phone مطلوب لتعريف العميل' };

  const phoneNorm = client_phone.replace(/\D/g, '');

  // ابحث في maintenance_requests السابقة عن العميل (best-effort fallback لو لا يوجد جدول profiles منفصل)
  const { data: prior } = await supabase
    .from('maintenance_requests')
    .select('client_name, client_email, client_phone, location')
    .ilike('client_phone', `%${phoneNorm.slice(-9)}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // جلسة البوت — حفظ السياق
  if (sessionId) {
    await supabase.from('bot_sessions').upsert({
      session_id: sessionId,
      client_phone: phoneNorm,
      context: {
        client_name: client_name || prior?.client_name,
        client_email: client_email || prior?.client_email,
        location: location || prior?.location,
        latitude, longitude, preferred_branch_id, notes,
        updated_at: new Date().toISOString(),
      },
    }, { onConflict: 'session_id' }).catch(() => {});
  }

  return {
    success: true,
    message: 'تم حفظ بيانات العميل في السياق',
    data: {
      is_returning_customer: !!prior,
      previous_data: prior || null,
      collected: { client_name, client_email, client_phone: phoneNorm, location, latitude, longitude },
    },
  };
}
