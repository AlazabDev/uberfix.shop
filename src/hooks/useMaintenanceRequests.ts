import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MaintenanceRequest, MaintenanceRequestInsert } from "@/types/maintenance";
import {
  fetchAllRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
} from "@/services/maintenanceCrud";

// إعادة تصدير الأنواع للتوافق مع الكود الحالي
export type { WorkflowStage } from "@/constants/workflowStages";
export type { MaintenanceRequest } from "@/types/maintenance";

export function useMaintenanceRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const isPermissionIssue = (value: unknown) => {
    const message = value instanceof Error ? value.message : String(value ?? '');
    const normalized = message.toLowerCase();
    return normalized.includes('permission denied') || normalized.includes('row-level security') || normalized.includes('rls');
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err as Error);
      setRequests([]);
      if (!isPermissionIssue(err)) {
        toast({
          title: "خطأ في تحميل الطلبات",
          description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: Partial<MaintenanceRequestInsert>) => {
    try {
      const data = await createMaintenanceRequest(requestData);
      toast({ title: "✓ تم إنشاء الطلب", description: "تم إنشاء طلب الصيانة بنجاح" });
      await fetchRequests();
      return data;
    } catch (err) {
      toast({
        title: "خطأ",
        description: err instanceof Error ? err.message : "فشل في إنشاء طلب الصيانة",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateRequest = async (id: string, updates: Partial<MaintenanceRequest>) => {
    try {
      const data = await updateMaintenanceRequest(id, updates);
      toast({ title: "✓ تم التحديث", description: "تم تحديث طلب الصيانة بنجاح" });
      await fetchRequests();
      return data;
    } catch (err) {
      toast({
        title: "خطأ",
        description: err instanceof Error ? err.message : "فشل في تحديث طلب الصيانة",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await deleteMaintenanceRequest(id);
      toast({ title: "✓ تم الحذف", description: "تم حذف طلب الصيانة بنجاح" });
      await fetchRequests();
    } catch (err) {
      toast({
        title: "خطأ",
        description: err instanceof Error ? err.message : "فشل في حذف طلب الصيانة",
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
        () => { fetchRequests(); }
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
