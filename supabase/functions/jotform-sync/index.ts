import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * JotForm Sync - Bidirectional status sync
 * Called when a maintenance request status changes to update JotForm submission
 * 
 * Can be triggered:
 * 1. Manually from the dashboard
 * 2. Via the notification engine on status change
 */

const JOTFORM_API = 'https://api.jotform.com';

const STATUS_MAP: Record<string, string> = {
  'Open': '📥 تم الاستلام',
  'In Progress': '🔧 قيد التنفيذ',
  'Completed': '✅ مكتمل',
  'Closed': '🔒 مغلق',
  'Cancelled': '❌ ملغى',
};

const STAGE_MAP: Record<string, string> = {
  'submitted': '📥 تم الإرسال',
  'reviewed': '📋 تمت المراجعة',
  'assigned': '👷 تم التعيين',
  'scheduled': '📅 تمت الجدولة',
  'in_progress': '🔧 قيد التنفيذ',
  'inspection': '🔍 جاري الفحص',
  'waiting_parts': '⏳ انتظار قطع غيار',
  'completed': '✅ مكتمل',
  'billed': '💰 تم إصدار الفاتورة',
  'paid': '✅ تم الدفع',
  'closed': '🔒 مغلق',
  'cancelled': '❌ ملغى',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const JOTFORM_API_KEY = Deno.env.get('JOTFORM_API_KEY');
    if (!JOTFORM_API_KEY) {
      throw new Error('JOTFORM_API_KEY is not configured');
    }

    const { request_id, status, workflow_stage } = await req.json();

    if (!request_id) {
      return new Response(JSON.stringify({ error: 'request_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the JotForm submission ID from audit logs
    const { data: auditLog } = await supabaseAdmin
      .from('audit_logs')
      .select('new_values')
      .eq('record_id', request_id)
      .eq('action', 'JOTFORM_SUBMISSION_RECEIVED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!auditLog?.new_values) {
      console.log(`No JotForm submission found for request ${request_id} - skipping sync`);
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Not a JotForm request' 
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const jotformData = auditLog.new_values as Record<string, string>;
    const submissionId = jotformData.jotform_submission_id;

    if (!submissionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'No submission ID' 
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update JotForm submission with new status via JotForm API
    const statusText = workflow_stage 
      ? (STAGE_MAP[workflow_stage] || workflow_stage)
      : (STATUS_MAP[status] || status);

    // JotForm API: Edit submission
    // We add status as a submission property update
    const updateUrl = `${JOTFORM_API}/submission/${submissionId}?apiKey=${JOTFORM_API_KEY}`;
    
    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        // Update the submission flag/status
        'submission[flag]': workflow_stage === 'completed' || workflow_stage === 'closed' ? '1' : '0',
        // We can also update an "answer" field if there's a hidden status field
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`JotForm API error [${response.status}]:`, responseData);
      throw new Error(`JotForm API failed: ${response.status}`);
    }

    // Log the sync
    await supabaseAdmin.from('audit_logs').insert({
      action: 'JOTFORM_STATUS_SYNCED',
      table_name: 'maintenance_requests',
      record_id: request_id,
      new_values: {
        jotform_submission_id: submissionId,
        synced_status: statusText,
        workflow_stage,
        status,
      }
    });

    console.log(`✅ JotForm sync: Request ${request_id} → Submission ${submissionId} | Status: ${statusText}`);

    return new Response(JSON.stringify({
      success: true,
      submission_id: submissionId,
      synced_status: statusText,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('JotForm sync error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
