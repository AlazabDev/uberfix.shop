import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { rateLimit } from '../_shared/rateLimiter.ts';

/**
 * Public endpoint for submitting maintenance requests.
 * Supports two modes:
 * 1. QR mode: requires property_id (from QR code scan)
 * 2. Direct mode: requires an unambiguous branch name
 *
 * Security: Rate limiting, input validation, no auth required.
 * This adapter never assigns technicians, never trusts a client-supplied channel,
 * and never falls back to the first company or branch in the database.
 */

interface RequestMetadata {
  company_name?: string;
  form_type?: 'general' | 'urgent' | 'periodic';
  stops_work?: string;
  contact_time?: string;
  preferred_date?: string;
  time_slot?: string;
  issue_date?: string;
}

interface RequestBody {
  property_id?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  branch_name?: string;
  service_type: string;
  priority?: string;
  description?: string;
  notes?: string;
  images?: string[];
  metadata?: RequestMetadata;
  location?: string;
  latitude?: number;
  longitude?: number;
  route_info?: {
    distance?: string;
    duration?: string;
    distance_value?: number;
    duration_value?: number;
    eta?: string;
  };
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

const SERVICE_ALIASES: Record<string, string> = {
  hvac: 'ac',
  facades: 'other',
  power_outage: 'electrical',
  water_leak: 'plumbing',
  ac_failure: 'ac',
  glass_break: 'other',
  sign_issue: 'electrical',
  door_lock: 'carpentry',
  smoke: 'other',
  full_inspection: 'other',
  electrical_periodic: 'electrical',
  ac_periodic: 'ac',
  plumbing_periodic: 'plumbing',
  painting_periodic: 'painting',
  facade_periodic: 'other',
};

const VALID_SERVICES = Object.keys(SERVICE_LABELS);
const VALID_PRIORITIES = ['high', 'medium', 'low'];

function safeMetadata(metadata: RequestMetadata | undefined): RequestMetadata {
  if (!metadata || typeof metadata !== 'object') return {};
  return {
    company_name: metadata.company_name?.toString().trim().slice(0, 120),
    form_type: ['general', 'urgent', 'periodic'].includes(metadata.form_type || '')
      ? metadata.form_type
      : undefined,
    stops_work: metadata.stops_work?.toString().trim().slice(0, 20),
    contact_time: metadata.contact_time?.toString().trim().slice(0, 20),
    preferred_date: metadata.preferred_date?.toString().trim().slice(0, 20),
    time_slot: metadata.time_slot?.toString().trim().slice(0, 30),
    issue_date: metadata.issue_date?.toString().trim().slice(0, 20),
  };
}

function sanitizeLookup(value: string | undefined, maxLength = 120): string {
  return (value || '')
    .trim()
    .replace(/[<>"';%_]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') || 'unknown';

    const isAllowed = rateLimit(`submit_${clientIP}`, { windowMs: 60_000, maxRequests: 5 });
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests', message_ar: 'يرجى الانتظار قبل المحاولة مرة أخرى' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        },
      );
    }

    const body: RequestBody = await req.json();
    const originalServiceType = body.service_type?.trim().toLowerCase() || '';
    const serviceType = SERVICE_ALIASES[originalServiceType] || originalServiceType;

    if (!serviceType || !VALID_SERVICES.includes(serviceType)) {
      return jsonResponse(400, {
        error: 'Invalid service type',
        message_ar: 'نوع الخدمة غير صحيح',
      });
    }

    const sanitizedName = body.client_name?.trim().replace(/[<>"';]/g, '').slice(0, 100) || '';
    const sanitizedPhone = body.client_phone?.replace(/[^\d+]/g, '').slice(0, 15) || '';
    const sanitizedEmail = body.client_email?.trim().toLowerCase().slice(0, 100) || '';
    const sanitizedNotes = (body.description || body.notes || '').trim().slice(0, 500);
    const priority = VALID_PRIORITIES.includes(body.priority || '') ? body.priority! : 'medium';
    const channel = body.property_id ? 'qr_guest' : 'public_form';
    const sanitizedLocation = body.location?.toString().trim().slice(0, 200) || '';
    const sanitizedBranchName = sanitizeLookup(body.branch_name);
    const submittedMetadata = safeMetadata(body.metadata);
    const sanitizedCompanyName = sanitizeLookup(submittedMetadata.company_name);
    const latNum = typeof body.latitude === 'number' ? body.latitude : Number(body.latitude);
    const lngNum = typeof body.longitude === 'number' ? body.longitude : Number(body.longitude);
    const hasGeo = Number.isFinite(latNum) && Number.isFinite(lngNum) &&
      latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;

    if (!body.property_id && !sanitizedName) {
      return jsonResponse(400, {
        error: 'Client name is required',
        message_ar: 'اسم مقدم الطلب مطلوب',
      });
    }

    if (!body.property_id && !sanitizedBranchName) {
      return jsonResponse(400, {
        error: 'Branch name is required',
        message_ar: 'اسم الفرع مطلوب لتوجيه الطلب بشكل صحيح',
      });
    }

    if (sanitizedPhone.length < 8) {
      return jsonResponse(400, {
        error: 'Phone number is required',
        message_ar: 'رقم الهاتف مطلوب (8 أرقام على الأقل) لمتابعة طلبك',
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let companyId: string;
    let branchId: string;
    let propertyName = '';
    let propertyAddress = '';
    let resolvedBranchName = '';
    let resolvedCompanyName = '';

    if (body.property_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(body.property_id)) {
        return jsonResponse(400, {
          error: 'Invalid property ID',
          message_ar: 'معرف العقار غير صحيح',
        });
      }

      const { data: property, error: propError } = await supabaseAdmin
        .from('properties')
        .select('id, name, address, company_id, branch_id')
        .eq('id', body.property_id)
        .maybeSingle();

      if (propError || !property) {
        return jsonResponse(404, {
          error: 'Property not found',
          message_ar: 'العقار غير موجود',
        });
      }

      companyId = property.company_id;
      branchId = property.branch_id;
      propertyName = property.name;
      propertyAddress = property.address || '';
    } else {
      let companyIds: string[] | null = null;

      if (sanitizedCompanyName) {
        const { data: exactCompanies, error: companyError } = await supabaseAdmin
          .from('companies')
          .select('id, name')
          .ilike('name', sanitizedCompanyName)
          .limit(5);

        if (companyError) {
          console.error('Company lookup failed:', companyError);
          return jsonResponse(500, {
            error: 'Company lookup failed',
            message_ar: 'تعذر التحقق من الشركة',
          });
        }

        let companies = exactCompanies || [];
        if (companies.length === 0) {
          const { data: partialCompanies, error: partialCompanyError } = await supabaseAdmin
            .from('companies')
            .select('id, name')
            .ilike('name', `%${sanitizedCompanyName}%`)
            .limit(5);

          if (partialCompanyError) {
            console.error('Company partial lookup failed:', partialCompanyError);
            return jsonResponse(500, {
              error: 'Company lookup failed',
              message_ar: 'تعذر التحقق من الشركة',
            });
          }
          companies = partialCompanies || [];
        }

        if (companies.length !== 1) {
          return jsonResponse(409, {
            error: 'Company is ambiguous or not found',
            message_ar: companies.length === 0
              ? 'لم يتم العثور على الشركة المحددة'
              : 'اسم الشركة غير محدد بدقة؛ يرجى كتابة الاسم الكامل',
          });
        }

        companyIds = [companies[0].id];
        resolvedCompanyName = companies[0].name;
      }

      const selectFields = 'id, name, address, company_id';
      const { data: exactBranches, error: exactBranchError } = await supabaseAdmin
        .from('branches')
        .select(selectFields)
        .ilike('name', sanitizedBranchName)
        .limit(10);

      if (exactBranchError) {
        console.error('Branch lookup failed:', exactBranchError);
        return jsonResponse(500, {
          error: 'Branch lookup failed',
          message_ar: 'تعذر التحقق من الفرع',
        });
      }

      let branches = exactBranches || [];
      if (branches.length === 0) {
        const { data: partialBranches, error: partialBranchError } = await supabaseAdmin
          .from('branches')
          .select(selectFields)
          .ilike('name', `%${sanitizedBranchName}%`)
          .limit(10);

        if (partialBranchError) {
          console.error('Branch partial lookup failed:', partialBranchError);
          return jsonResponse(500, {
            error: 'Branch lookup failed',
            message_ar: 'تعذر التحقق من الفرع',
          });
        }
        branches = partialBranches || [];
      }

      if (companyIds) {
        branches = branches.filter((branch) => companyIds!.includes(branch.company_id));
      }

      if (branches.length !== 1) {
        return jsonResponse(409, {
          error: 'Branch is ambiguous or not found',
          message_ar: branches.length === 0
            ? 'لم يتم العثور على الفرع المحدد'
            : 'اسم الفرع غير محدد بدقة؛ يرجى كتابة اسم الشركة والفرع بالكامل',
        });
      }

      const matchedBranch = branches[0];
      companyId = matchedBranch.company_id;
      branchId = matchedBranch.id;
      resolvedBranchName = matchedBranch.name;
      propertyAddress = matchedBranch.address || '';

      if (!resolvedCompanyName) {
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .maybeSingle();
        resolvedCompanyName = company?.name || '';
      }
    }

    const serviceLabel = SERVICE_LABELS[serviceType] || { ar: serviceType, en: serviceType };

    const { data: gatewayResult, error: gatewayError } = await supabaseAdmin.functions.invoke('gateway', {
      body: {
        channel,
        client_name: sanitizedName || 'زائر',
        client_phone: sanitizedPhone,
        client_email: sanitizedEmail || undefined,
        service_type: serviceType,
        priority,
        description: sanitizedNotes || `طلب صيانة ${serviceLabel.ar}`,
        location: sanitizedLocation || propertyAddress || resolvedBranchName || undefined,
        property_id: body.property_id || undefined,
        branch_name: resolvedBranchName || sanitizedBranchName || undefined,
        company_id: companyId,
        branch_id: branchId,
        images: body.images,
        latitude: hasGeo ? latNum : undefined,
        longitude: hasGeo ? lngNum : undefined,
        source_id: body.property_id || undefined,
        source_metadata: {
          submission_mode: body.property_id ? 'qr' : 'direct',
          property_name: propertyName || undefined,
          resolved_company_name: resolvedCompanyName || undefined,
          resolved_branch_name: resolvedBranchName || undefined,
          original_service_type: originalServiceType,
          normalized_service_type: serviceType,
          ...submittedMetadata,
          map_intake: hasGeo
            ? {
                has_geo: true,
                route: body.route_info && typeof body.route_info === 'object'
                  ? {
                      distance: String(body.route_info.distance || '').slice(0, 32) || null,
                      duration: String(body.route_info.duration || '').slice(0, 32) || null,
                      distance_value: Number.isFinite(Number(body.route_info.distance_value))
                        ? Number(body.route_info.distance_value)
                        : null,
                      duration_value: Number.isFinite(Number(body.route_info.duration_value))
                        ? Number(body.route_info.duration_value)
                        : null,
                      eta: typeof body.route_info.eta === 'string'
                        ? body.route_info.eta.slice(0, 64)
                        : null,
                    }
                  : null,
              }
            : undefined,
        },
      },
    });

    if (gatewayError || !gatewayResult?.success) {
      console.error('Gateway error:', gatewayError || gatewayResult);
      return jsonResponse(500, {
        error: 'Failed to create request',
        message_ar: 'فشل في إنشاء الطلب',
      });
    }

    console.log(`✅ Public request → Gateway → ${gatewayResult.request_number} | Channel: ${channel}`);

    return jsonResponse(201, {
      success: true,
      request_id: gatewayResult.request_id,
      request_number: gatewayResult.request_number,
      message_ar: `تم إرسال طلبك بنجاح! رقم الطلب: ${gatewayResult.request_number}`,
      message_en: `Request submitted successfully! Request #: ${gatewayResult.request_number}`,
      track_url: `/track/${gatewayResult.request_id}`,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return jsonResponse(500, {
      error: 'Internal server error',
      message_ar: 'حدث خطأ غير متوقع',
    });
  }
});
