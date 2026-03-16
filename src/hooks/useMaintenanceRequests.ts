import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { type WorkflowStage, WORKFLOW_STAGES } from "@/constants/workflowStages";
import type { MaintenanceRequest, MaintenanceRequestInsert, MrStatus } from "@/types/maintenance";

// إعادة تصدير الأنواع للتوافق مع الكود الحالي
export type { WorkflowStage } from "@/constants/workflowStages";
export type { MaintenanceRequest } from "@/types/maintenance";

export function useMaintenanceRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as MaintenanceRequest[]) || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err as Error);
      toast({
        title: "خطأ في تحميل الطلبات",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: Partial<MaintenanceRequestInsert>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError || !profile?.company_id) {
        throw new Error("حدث خطأ في جلب بيانات المستخدم. يرجى تسجيل الخروج والدخول مرة أخرى.");
      }
      
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id')
        .eq('company_id', profile.company_id)
        .limit(1)
        .maybeSingle();
      
      if (branchError || !branch) {
        throw new Error("حدث خطأ في جلب بيانات الفرع. يرجى تسجيل الخروج والدخول مرة أخرى.");
      }
      
      const initialStage: WorkflowStage = 'submitted';
      const initialStatus = WORKFLOW_STAGES[initialStage].status as MrStatus;

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          ...requestData,
          title: requestData.title || 'طلب صيانة جديد',
          created_by: user.id,
          status: initialStatus,
          workflow_stage: initialStage,
          company_id: profile.company_id,
          branch_id: branch.id
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // إرسال إشعار بإنشاء طلب جديد
      try {
        await supabase.functions.invoke('send-maintenance-notification', {
          body: {
            request_id: data.id,
            event_type: 'request_created',
          }
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      // إرسال رسالة WhatsApp للعميل
      if (data.client_phone) {
        try {
          await supabase.functions.invoke('send-twilio-message', {
            body: {
              to: data.client_phone,
              message: `تم استلام طلب الصيانة الخاص بك بنجاح. رقم الطلب: ${data.id}. سيتم التواصل معك قريباً.`,
              type: 'whatsapp',
              requestId: data.id
            }
          });
        } catch (smsError) {
          console.error('Failed to send WhatsApp message:', smsError);
        }
      }

      toast({
        title: "✓ تم إنشاء الطلب",
        description: "تم إنشاء طلب الصيانة بنجاح",
      });

      await fetchRequests();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل في إنشاء طلب الصيانة";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateRequest = async (id: string, updates: Partial<MaintenanceRequest>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      const { data: oldData } = await supabase
        .from('maintenance_requests')
        .select('status, workflow_stage, client_phone')
        .eq('id', id)
        .maybeSingle();

      // تحديث status إذا تم تغيير workflow_stage
      if (updates.workflow_stage) {
        const stage = updates.workflow_stage as WorkflowStage;
        if (WORKFLOW_STAGES[stage]) {
          updates.status = WORKFLOW_STAGES[stage].status as MrStatus;
        }
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .update(updates as unknown as MaintenanceRequestInsert)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      // إرسال إشعار عند تغيير الحالة أو المرحلة
      try {
        if (oldData) {
          if (dbUpdates.status && dbUpdates.status !== oldData.status) {
            await supabase.functions.invoke('send-maintenance-notification', {
              body: {
                request_id: id,
                old_status: oldData.status,
                new_status: dbUpdates.status,
                event_type: 'status_changed',
              }
            });
          }
          
          if (updates.workflow_stage && updates.workflow_stage !== oldData.workflow_stage) {
            await supabase.functions.invoke('send-maintenance-notification', {
              body: {
                request_id: id,
                old_stage: oldData.workflow_stage,
                new_stage: updates.workflow_stage,
                event_type: 'stage_changed',
              }
            });

            // إرسال رسالة WhatsApp للعميل عند تغيير المرحلة
            if (data?.client_phone) {
              const stage = updates.workflow_stage as WorkflowStage;
              let message = '';
              
              switch (stage) {
                case 'assigned':
                  message = `تم تعيين فني لطلب الصيانة رقم ${id}. سيتم التواصل معك قريباً.`;
                  break;
                case 'scheduled':
                  message = `تم جدولة موعد زيارة الفني لطلب الصيانة رقم ${id}.`;
                  break;
                case 'in_progress':
                  message = `الفني في طريقه إليك الآن. طلب رقم ${id}.`;
                  break;
                case 'inspection':
                  message = `جاري فحص المشكلة. طلب رقم ${id}.`;
                  break;
                case 'waiting_parts':
                  message = `في انتظار قطع الغيار. سنبلغك عند وصولها. طلب رقم ${id}.`;
                  break;
                case 'completed':
                  message = `تم إكمال طلب الصيانة رقم ${id} بنجاح. شكراً لثقتك بنا!`;
                  break;
                case 'billed':
                  message = `تم إصدار فاتورة لطلب الصيانة رقم ${id}. يرجى مراجعتها.`;
                  break;
                case 'paid':
                  message = `تم استلام الدفع لطلب الصيانة رقم ${id}. شكراً لك!`;
                  break;
              }
              
              if (message) {
                try {
                  await supabase.functions.invoke('send-twilio-message', {
                    body: {
                      to: data.client_phone,
                      message,
                      type: 'whatsapp',
                      requestId: id
                    }
                  });
                } catch (smsError) {
                  console.error('Failed to send WhatsApp message:', smsError);
                }
              }
            }
          }

          if (updates.workflow_stage === 'completed') {
            await supabase.functions.invoke('send-maintenance-notification', {
              body: {
                request_id: id,
                event_type: 'request_completed',
              }
            });
          }
        }
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      toast({
        title: "✓ تم التحديث",
        description: "تم تحديث طلب الصيانة بنجاح",
      });

      await fetchRequests();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل في تحديث طلب الصيانة";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "✓ تم الحذف",
        description: "تم حذف طلب الصيانة بنجاح",
      });

      await fetchRequests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل في حذف طلب الصيانة";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('maintenance-requests-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  return {
    requests,
    loading,
    error,
    createRequest,
    updateRequest,
    deleteRequest,
    refetch: fetchRequests
  };
}
