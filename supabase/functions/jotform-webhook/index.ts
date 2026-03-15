import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * JotForm Webhook Endpoint
 * Receives form submissions and creates maintenance requests
 * 
 * Setup in JotForm:
 * 1. Go to Form Settings → Integrations → Webhooks
 * 2. Add URL: https://zrrffsjbfkphridqyais.supabase.co/functions/v1/jotform-webhook
 * 
 * Expected JotForm field names (map in FIELD_MAP):
 * - client_name, client_phone, client_email
 * - service_type, priority, description, location, branch_name
 */

// Map JotForm field names/IDs to our internal fields
const FIELD_MAP: Record<string, string> = {
  // Common JotForm field names (adjust based on actual form)
  'client_name': 'client_name',
  'name': 'client_name',
  'الاسم': 'client_name',
  'اسم العميل': 'client_name',
  'phone': 'client_phone',
  'الهاتف': 'client_phone',
  'رقم الهاتف': 'client_phone',
  'client_phone': 'client_phone',
  'email': 'client_email',
  'البريد': 'client_email',
  'client_email': 'client_email',
  'service_type': 'service_type',
  'نوع الخدمة': 'service_type',
  'priority': 'priority',
  'الأولوية': 'priority',
  'description': 'description',
  'الوصف': 'description',
  'تفاصيل الطلب': 'description',
  'location': 'location',
  'الموقع': 'location',
  'العنوان': 'location',
  'branch': 'branch_name',
  'الفرع': 'branch_name',
};

const SERVICE_MAP: Record<string, string> = {
  'سباكة': 'plumbing', 'plumbing': 'plumbing',
  'كهرباء': 'electrical', 'electrical': 'electrical',
  'تكييف': 'ac', 'ac': 'ac',
  'نجارة': 'carpentry', 'carpentry': 'carpentry',
  'حدادة': 'metalwork', 'metalwork': 'metalwork',
  'دهانات': 'painting', 'painting': 'painting',
  'تنظيف': 'cleaning', 'cleaning': 'cleaning',
  'أخرى': 'other', 'other': 'other',
};

const SERVICE_LABELS: Record<string, string> = {
  plumbing: 'سباكة', electrical: 'كهرباء', ac: 'تكييف',
  carpentry: 'نجارة', metalwork: 'حدادة', painting: 'دهانات',
  cleaning: 'تنظيف', other: 'أخرى',
};

function extractFields(body: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase().trim();
    
    // Check direct mapping
    const mapped = FIELD_MAP[lowerKey];
    if (mapped && value) {
      // JotForm name fields can be objects {first, last}
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, string>;
        if (obj.first || obj.last) {
          result[mapped] = `${obj.first || ''} ${obj.last || ''}`.trim();
        } else {
          result[mapped] = JSON.stringify(value);
        }
      } else {
        result[mapped] = String(value).trim();
      }
      continue;
    }

    // Check partial match
    for (const [pattern, field] of Object.entries(FIELD_MAP)) {
      if (lowerKey.includes(pattern) && value && !result[field]) {
        result[field] = typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
      }
    }
  }
  
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // JotForm sends form data as application/x-www-form-urlencoded or JSON
    let body: Record<string, unknown>;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      // URL-encoded form data
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = {};
      
      // JotForm sends rawRequest as JSON string
      const rawRequest = params.get('rawRequest');
      if (rawRequest) {
        try {
          body = JSON.parse(rawRequest);
        } catch {
          // Parse individual params
          for (const [k, v] of params.entries()) {
            body[k] = v;
          }
        }
      } else {
        for (const [k, v] of params.entries()) {
          body[k] = v;
        }
      }
    }

    const submissionId = body.submissionID || body.submission_id || body.id || '';
    const formId = body.formID || body.form_id || '';
    
    console.log(`📥 JotForm submission received | Form: ${formId} | Submission: ${submissionId}`);

    const fields = extractFields(body);
    
    // Sanitize
    const clientName = fields.client_name?.replace(/[<>"';]/g, '').slice(0, 100) || '';
    const clientPhone = fields.client_phone?.replace(/[^\d+]/g, '').slice(0, 15) || '';
    const clientEmail = fields.client_email?.toLowerCase().slice(0, 100) || '';
    const description = fields.description?.slice(0, 500) || '';
    const location = fields.location?.slice(0, 200) || '';
    const serviceRaw = (fields.service_type || 'other').toLowerCase();
    const serviceType = SERVICE_MAP[serviceRaw] || 'other';
    const priority = ['high', 'medium', 'low'].includes(fields.priority || '') ? fields.priority! : 'medium';

    if (!clientName) {
      return new Response(JSON.stringify({ error: 'Client name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get default company/branch
    const { data: defaultOrg, error: orgError } = await supabaseAdmin
      .from('companies')
      .select('id, branches(id, name)')
      .limit(1)
      .maybeSingle();

    if (orgError || !defaultOrg) {
      console.error('No default company found:', orgError);
      return new Response(JSON.stringify({ error: 'System config error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const companyId = defaultOrg.id;
    const branches = (defaultOrg as any).branches as Array<{ id: string; name: string }>;
    const matchedBranch = fields.branch_name
      ? branches?.find(b => b.name.includes(fields.branch_name!))
      : null;
    const branchId = matchedBranch?.id || branches?.[0]?.id || '';

    if (!branchId) {
      return new Response(JSON.stringify({ error: 'No branch available' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;

    // ─── Route through Unified Gateway ─────────────────────────
    const { data: gatewayResult, error: gatewayError } = await supabaseAdmin.functions.invoke('maintenance-gateway', {
      body: {
        channel: 'jotform',
        client_name: clientName,
        client_phone: clientPhone || undefined,
        client_email: clientEmail || undefined,
        service_type: serviceType,
        priority,
        description: description || `طلب صيانة ${serviceLabel}`,
        location: location || undefined,
        branch_name: fields.branch_name || undefined,
        source_id: String(submissionId),
        source_metadata: {
          jotform_form_id: String(formId),
          jotform_submission_id: String(submissionId),
        }
      }
    });

    if (gatewayError) {
      console.error('Gateway error:', gatewayError);
      return new Response(JSON.stringify({ error: 'Failed to create request via gateway' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const created = gatewayResult;

    // Store JotForm-specific audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'JOTFORM_SUBMISSION_RECEIVED',
      table_name: 'maintenance_requests',
      record_id: created.request_id,
      new_values: {
        jotform_submission_id: String(submissionId),
        jotform_form_id: String(formId),
        request_number: created.request_number,
        channel: 'jotform',
        routed_via: 'maintenance-gateway',
      }
    });

    console.log(`✅ JotForm → Gateway → ${created.request_number} (${created.request_id})`);

    return new Response(JSON.stringify({
      success: true,
      request_id: created.request_id,
      request_number: created.request_number,
      track_url: created.track_url,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('JotForm webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
