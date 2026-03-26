/**
 * خدمة CRUD لطلبات الصيانة
 * العمليات الأساسية: إنشاء، تحديث، حذف، جلب
 */
import { supabase } from "@/integrations/supabase/client";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/constants/workflowStages";
import type { MaintenanceRequest, MaintenanceRequestInsert, MrStatus } from "@/types/maintenance";
import { notifyRequestCreated, notifyStatusChanged } from "./maintenanceNotifications";

/** جلب جميع الطلبات مع pagination لتجنب حد 1000 صف */
export async function fetchAllRequests(page = 0, pageSize = 500): Promise<MaintenanceRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const allData: MaintenanceRequest[] = [];
  let currentPage = page;
  let hasMore = true;

  while (hasMore) {
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...(data as MaintenanceRequest[]));
      hasMore = data.length === pageSize;
      currentPage++;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/** إنشاء طلب جديد */
export async function createMaintenanceRequest(
  requestData: Partial<MaintenanceRequestInsert>
): Promise<MaintenanceRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

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

  // إشعارات في الخلفية
  notifyRequestCreated(data.id, data.client_phone);

  return data as MaintenanceRequest;
}

/** تحديث طلب */
export async function updateMaintenanceRequest(
  id: string,
  updates: Partial<MaintenanceRequest>
): Promise<MaintenanceRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { data: oldData } = await supabase
    .from('maintenance_requests')
    .select('status, workflow_stage, client_phone')
    .eq('id', id)
    .maybeSingle();

  // مزامنة status مع workflow_stage
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

  // إشعارات في الخلفية
  if (oldData) {
    notifyStatusChanged(
      id,
      oldData.status,
      updates.status || null,
      oldData.workflow_stage,
      updates.workflow_stage || null,
      data?.client_phone
    );
  }

  return data as MaintenanceRequest;
}

/** حذف طلب */
export async function deleteMaintenanceRequest(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { error } = await supabase
    .from('maintenance_requests')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
