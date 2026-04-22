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
      return new Response(JSON.stringify({ success: false, error: 'action and payload are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      case 'list_services':
        result = handleListServices();
        break;
      case 'get_branches':
        result = await handleGetBranches(supabase);
        break;
      case 'get_quote':
        result = await handleGetQuote(supabase, payload, metadata);
        break;
      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Bot Gateway error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
