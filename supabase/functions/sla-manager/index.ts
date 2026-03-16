import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SLADeadlines {
  accept: number;  // دقائق
  arrive: number;  // دقائق
  complete: number; // دقائق
}

// جدول SLA حسب الأولوية
const SLA_TABLE: Record<string, SLADeadlines> = {
  'high': {
    accept: 30,     // 30 دقيقة لقبول الطلب
    arrive: 120,    // ساعتين للوصول
    complete: 480   // 8 ساعات للإنجاز
  },
  'medium': {
    accept: 60,     // ساعة لقبول الطلب
    arrive: 240,    // 4 ساعات للوصول
    complete: 1440  // 24 ساعة للإنجاز
  },
  'low': {
    accept: 240,    // 4 ساعات لقبول الطلب
    arrive: 480,    // 8 ساعات للوصول
    complete: 2880  // 48 ساعة للإنجاز
  }
};

const calculateSLADeadlines = (priority: string, createdAt: string) => {
  const sla = SLA_TABLE[priority] || SLA_TABLE['medium'];
  const created = new Date(createdAt);
  
  return {
    sla_accept_due: new Date(created.getTime() + sla.accept * 60000).toISOString(),
    sla_arrive_due: new Date(created.getTime() + sla.arrive * 60000).toISOString(),
    sla_complete_due: new Date(created.getTime() + sla.complete * 60000).toISOString()
  };
};

const checkSLAViolations = async () => {
  const now = new Date();
  
  // البحث عن الطلبات التي تجاوزت أو قربت من تجاوز SLA
  const { data: requests, error } = await supabase
    .from('maintenance_requests')
    .select('id, title, priority, status, workflow_stage, created_by, sla_accept_due, sla_arrive_due, sla_complete_due, created_at')
    .in('status', ['Open', 'Assigned', 'In Progress', 'InProgress'])
    .not('workflow_stage', 'in', '(completed,closed,cancelled)');

  if (error) {
    console.error('Error fetching requests:', error);
    return;
  }

  const violations = [];
  const warnings = [];

  for (const request of requests || []) {
    // التحقق من SLA Accept
    if (request.sla_accept_due) {
      const acceptDue = new Date(request.sla_accept_due);
      const timeDiff = acceptDue.getTime() - now.getTime();
      const minutesRemaining = Math.floor(timeDiff / 60000);

      // تحذير قبل 15 دقيقة من الموعد
      if (minutesRemaining > 0 && minutesRemaining <= 15 && request.status === 'Open') {
        warnings.push({
          request_id: request.id,
          request_title: request.title,
          type: 'accept_warning',
          deadline: request.sla_accept_due,
          minutes_remaining: minutesRemaining,
          created_by: request.created_by
        });
      }
      
      // انتهاك SLA
      if (minutesRemaining < 0 && request.status === 'Open') {
        violations.push({
          request_id: request.id,
          request_title: request.title,
          type: 'accept_violation',
          deadline: request.sla_accept_due,
          created_by: request.created_by
        });
      }
    }

    // التحقق من SLA Arrive
    if (request.sla_arrive_due) {
      const arriveDue = new Date(request.sla_arrive_due);
      const timeDiff = arriveDue.getTime() - now.getTime();
      const minutesRemaining = Math.floor(timeDiff / 60000);

      if (minutesRemaining > 0 && minutesRemaining <= 30 && request.status === 'Assigned') {
        warnings.push({
          request_id: request.id,
          request_title: request.title,
          type: 'arrive_warning',
          deadline: request.sla_arrive_due,
          minutes_remaining: minutesRemaining,
          created_by: request.created_by
        });
      }
      
      if (minutesRemaining < 0 && request.status === 'Assigned') {
        violations.push({
          request_id: request.id,
          request_title: request.title,
          type: 'arrive_violation',
          deadline: request.sla_arrive_due,
          created_by: request.created_by
        });
      }
    }

    // التحقق من SLA Complete
    if (request.sla_complete_due) {
      const completeDue = new Date(request.sla_complete_due);
      const timeDiff = completeDue.getTime() - now.getTime();
      const hoursRemaining = Math.floor(timeDiff / 3600000);

      if (hoursRemaining > 0 && hoursRemaining <= 2 && (request.status === 'In Progress' || request.status === 'InProgress')) {
        warnings.push({
          request_id: request.id,
          request_title: request.title,
          type: 'complete_warning',
          deadline: request.sla_complete_due,
          hours_remaining: hoursRemaining,
          created_by: request.created_by
        });
      }
      
      if (hoursRemaining < 0 && (request.status === 'In Progress' || request.status === 'InProgress')) {
        violations.push({
          request_id: request.id,
          request_title: request.title,
          type: 'complete_violation',
          deadline: request.sla_complete_due,
          created_by: request.created_by
        });
      }
    }
  }

  // إرسال تحذيرات
  for (const warning of warnings) {
    await sendSLANotification(warning, 'warning');
  }

  // إرسال انتهاكات
  for (const violation of violations) {
    await sendSLANotification(violation, 'violation');
  }

  return { warnings: warnings.length, violations: violations.length };
};

const sendSLANotification = async (slaData: any, severity: 'warning' | 'violation') => {
  try {
    // إرسال إشعار للمستخدم الذي أنشأ الطلب
    if (slaData.created_by) {
      await supabase.functions.invoke('send-unified-notification', {
        body: {
          type: 'sla_warning',
          request_id: slaData.request_id,
          recipient_id: slaData.created_by,
          channels: ['in_app', 'email'],
          data: {
            request_title: slaData.request_title,
            sla_deadline: slaData.deadline,
            notes: severity === 'violation' 
              ? `⚠️ تم تجاوز موعد استحقاق SLA`
              : `⏰ اقتراب موعد استحقاق SLA - ${slaData.minutes_remaining || slaData.hours_remaining} ${slaData.minutes_remaining ? 'دقيقة' : 'ساعة'} متبقية`
          }
        }
      });
    }

    // إرسال إشعار للمسؤولين
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager']);

    if (admins) {
      for (const admin of admins) {
        await supabase.from('notifications').insert({
          recipient_id: admin.user_id,
          title: severity === 'violation' ? '🚨 انتهاك SLA' : '⚠️ تحذير SLA',
          message: `طلب "${slaData.request_title}" - ${slaData.type}`,
          type: severity === 'violation' ? 'error' : 'warning',
          entity_type: 'maintenance_request',
          entity_id: slaData.request_id
        });
      }
    }

    console.log(`SLA ${severity} notification sent for request:`, slaData.request_id);
  } catch (error) {
    console.error('Error sending SLA notification:', error);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, request_id, priority, created_at } = await req.json();

    if (action === 'calculate') {
      // حساب مواعيد SLA لطلب جديد
      const deadlines = calculateSLADeadlines(priority, created_at);
      
      // تحديث الطلب في قاعدة البيانات
      const { error } = await supabase
        .from('maintenance_requests')
        .update(deadlines)
        .eq('id', request_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, deadlines }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === 'check') {
      // فحص جميع الطلبات للتحقق من SLA
      const result = await checkSLAViolations();
      
      return new Response(
        JSON.stringify({ success: true, result }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error("Error in sla-manager:", error);
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
