import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;

const resend = new Resend(resendApiKey);

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cron-only endpoint: require shared secret or service-role token
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const cronHeader = req.headers.get('x-cron-secret');
    const isService = !!token && token === supabaseKey;
    const isCron = !!cronSecret && cronHeader === cronSecret;
    if (!isService && !isCron) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    // جلب الطلبات التي تجاوزت SLA
    const { data: overdueTasks, error: fetchError } = await supabase
      .from('maintenance_requests')
      .select(`
        id,
        title,
        priority,
        workflow_stage,
        status,
        sla_accept_due,
        sla_arrive_due,
        sla_complete_due,
        created_by,
        created_at
      `)
      .not('status', 'in', '(completed,cancelled,closed)')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    const now = new Date();
    const notifications = [];
    const emailPromises = [];
    const smsPromises = [];

    for (const task of overdueTasks || []) {
      const violations = [];
      
      // فحص تجاوز موعد القبول
      if (task.sla_accept_due && new Date(task.sla_accept_due) < now && task.workflow_stage === 'submitted') {
        violations.push({
          type: 'accept',
          due: task.sla_accept_due,
          message: 'تأخر في قبول الطلب'
        });
      }

      // فحص تجاوز موعد الوصول
      if (task.sla_arrive_due && new Date(task.sla_arrive_due) < now && task.workflow_stage === 'assigned') {
        violations.push({
          type: 'arrive',
          due: task.sla_arrive_due,
          message: 'تأخر في الوصول للموقع'
        });
      }

      // فحص تجاوز موعد الإنجاز
      if (task.sla_complete_due && new Date(task.sla_complete_due) < now && task.workflow_stage !== 'completed') {
        violations.push({
          type: 'complete',
          due: task.sla_complete_due,
          message: 'تأخر في إنجاز الطلب'
        });
      }

      // إنشاء إشعارات للتجاوزات
      for (const violation of violations) {
        const minutesOverdue = Math.floor((now.getTime() - new Date(violation.due).getTime()) / 60000);
        const title = `⚠️ تجاوز SLA - طلب #${task.id.substring(0, 8)}`;
        const message = `${violation.message}: تأخر ${minutesOverdue} دقيقة عن الموعد المحدد`;
        
        notifications.push({
          recipient_id: task.created_by,
          title,
          message,
          type: 'warning',
          entity_type: 'maintenance_request',
          entity_id: task.id
        });

        // جلب بيانات المستخدم (البريد والهاتف)
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('id', task.created_by)
          .single();

        // إرسال بريد إلكتروني
        if (profile?.email) {
          emailPromises.push(
            resend.emails.send({
              from: 'UberFix <hello@tx.uberfix.shop>',
              to: [profile.email],
              subject: title,
              html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb;">
                  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ تنبيه تجاوز SLA</h1>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                      <strong>رقم الطلب:</strong> #${task.id.substring(0, 8)}<br/>
                      <strong>العنوان:</strong> ${task.title}<br/>
                      <strong>الأولوية:</strong> ${task.priority}<br/>
                      <strong>المرحلة:</strong> ${task.workflow_stage}<br/>
                    </p>
                    <div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #991b1b; font-weight: bold;">${message}</p>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                      يرجى متابعة الطلب في أقرب وقت ممكن.
                    </p>
                  </div>
                </div>
              `,
            }).catch(err => console.error('Email error:', err))
          );
        }

        // إرسال SMS
        if (profile?.phone) {
          const smsBody = `${title}\n${message}\nالطلب: ${task.title}`;
          
          smsPromises.push(
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: profile.phone,
                From: twilioPhoneNumber,
                Body: smsBody,
              }),
            }).catch(err => console.error('SMS error:', err))
          );
        }

        // تسجيل حدث التجاوز
        await supabase.from('request_events').insert({
          request_id: task.id,
          event_type: 'sla_violation',
          from_stage: task.workflow_stage,
          to_stage: task.workflow_stage,
          meta: {
            violation_type: violation.type,
            due_date: violation.due,
            minutes_overdue: minutesOverdue,
            detected_at: now.toISOString(),
            email_sent: !!profile?.email,
            sms_sent: !!profile?.phone
          }
        });
      }
    }

    // إرسال الإشعارات دفعة واحدة
    if (notifications.length > 0) {
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (notifyError) console.error('Error creating notifications:', notifyError);
    }

    // انتظار إرسال جميع الإيميلات و SMS
    await Promise.all([...emailPromises, ...smsPromises]);

    return new Response(
      JSON.stringify({
        success: true,
        checked: overdueTasks?.length || 0,
        violations: notifications.length,
        emails_sent: emailPromises.length,
        sms_sent: smsPromises.length,
        timestamp: now.toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SLA Monitor Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
