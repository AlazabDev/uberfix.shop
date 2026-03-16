/**
 * خدمة إشعارات طلبات الصيانة
 * مسؤولة عن إرسال إشعارات البريد و WhatsApp عند تغيير الحالة
 */
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowStage } from "@/constants/workflowStages";

/** إرسال إشعار إنشاء طلب جديد */
export async function notifyRequestCreated(requestId: string, clientPhone?: string | null) {
  try {
    await supabase.functions.invoke('send-maintenance-notification', {
      body: { request_id: requestId, event_type: 'request_created' }
    });
  } catch (err) {
    console.error('Failed to send creation notification:', err);
  }

  if (clientPhone) {
    await sendWhatsApp(clientPhone, `تم استلام طلب الصيانة الخاص بك بنجاح. رقم الطلب: ${requestId}. سيتم التواصل معك قريباً.`, requestId);
  }
}

/** إرسال إشعارات تغيير الحالة/المرحلة */
export async function notifyStatusChanged(
  requestId: string,
  oldStatus: string | null,
  newStatus: string | null,
  oldStage: string | null,
  newStage: string | null,
  clientPhone?: string | null
) {
  try {
    if (newStatus && newStatus !== oldStatus) {
      await supabase.functions.invoke('send-maintenance-notification', {
        body: { request_id: requestId, old_status: oldStatus, new_status: newStatus, event_type: 'status_changed' }
      });
    }

    if (newStage && newStage !== oldStage) {
      await supabase.functions.invoke('send-maintenance-notification', {
        body: { request_id: requestId, old_stage: oldStage, new_stage: newStage, event_type: 'stage_changed' }
      });

      if (clientPhone) {
        const message = getStageMessage(newStage as WorkflowStage, requestId);
        if (message) {
          await sendWhatsApp(clientPhone, message, requestId);
        }
      }
    }

    if (newStage === 'completed') {
      await supabase.functions.invoke('send-maintenance-notification', {
        body: { request_id: requestId, event_type: 'request_completed' }
      });
    }
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

/** رسالة WhatsApp حسب المرحلة */
function getStageMessage(stage: WorkflowStage, requestId: string): string {
  const messages: Partial<Record<WorkflowStage, string>> = {
    assigned: `تم تعيين فني لطلب الصيانة رقم ${requestId}. سيتم التواصل معك قريباً.`,
    scheduled: `تم جدولة موعد زيارة الفني لطلب الصيانة رقم ${requestId}.`,
    in_progress: `الفني في طريقه إليك الآن. طلب رقم ${requestId}.`,
    inspection: `جاري فحص المشكلة. طلب رقم ${requestId}.`,
    waiting_parts: `في انتظار قطع الغيار. سنبلغك عند وصولها. طلب رقم ${requestId}.`,
    completed: `تم إكمال طلب الصيانة رقم ${requestId} بنجاح. شكراً لثقتك بنا!`,
    billed: `تم إصدار فاتورة لطلب الصيانة رقم ${requestId}. يرجى مراجعتها.`,
    paid: `تم استلام الدفع لطلب الصيانة رقم ${requestId}. شكراً لك!`,
  };
  return messages[stage] || '';
}

/** إرسال رسالة WhatsApp */
async function sendWhatsApp(to: string, message: string, requestId: string) {
  try {
    await supabase.functions.invoke('send-twilio-message', {
      body: { to, message, type: 'whatsapp', requestId }
    });
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err);
  }
}
