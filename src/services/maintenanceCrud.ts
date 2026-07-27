/**
 * خدمة CRUD لطلبات الصيانة.
 *
 * قاعدة معمارية:
 * - القراءة والتحديث والحذف تخضع لـ RLS من خلال Supabase Client.
 * - إنشاء أي طلب جديد يمر حصرياً عبر Unified Gateway.
 */
import { supabase } from "@/integrations/supabase/client";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/constants/workflowStages";
import type { MaintenanceRequest, MaintenanceRequestInsert, MrStatus } from "@/types/maintenance";

interface GatewayCreateResponse {
  success: boolean;
  request_id: string;
  request_number: string;
  track_url: string;
  channel: string;
  created_at: string;
  error?: string;
  message_ar?: string;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

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
      .from("maintenance_requests")
      .select("*")
      .order("created_at", { ascending: false })
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

/**
 * إنشاء طلب جديد عبر Unified Gateway فقط.
 * لا يُسمح لهذه الخدمة بإجراء INSERT مباشر في maintenance_requests.
 */
export async function createMaintenanceRequest(
  requestData: Partial<MaintenanceRequestInsert>
): Promise<MaintenanceRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const raw = requestData as Record<string, unknown>;
  const clientName =
    optionalString(raw.client_name) ||
    optionalString(user.user_metadata?.full_name) ||
    optionalString(user.user_metadata?.name) ||
    user.email ||
    "مستخدم داخلي";
  const clientPhone = optionalString(raw.client_phone) || optionalString(user.user_metadata?.phone);

  if (!clientPhone || clientPhone.replace(/\D/g, "").length < 8) {
    throw new Error("رقم هاتف العميل مطلوب ويجب ألا يقل عن 8 أرقام");
  }

  const requestedTitle = optionalString(raw.title) || "طلب صيانة جديد";
  const requestedDescription = optionalString(raw.description);
  const customerNotes = optionalString(raw.customer_notes);
  const description = [
    requestedTitle,
    requestedDescription,
    customerNotes ? `ملاحظات العميل: ${customerNotes}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 500);

  const { data: gatewayResult, error: gatewayError } =
    await supabase.functions.invoke<GatewayCreateResponse>("gateway", {
      body: {
        channel: "internal",
        action: "create_request",
        client_name: clientName,
        client_phone: clientPhone,
        client_email: optionalString(raw.client_email) || user.email || undefined,
        service_type: optionalString(raw.service_type) || "general",
        priority: optionalString(raw.priority) || "medium",
        description,
        location: optionalString(raw.location),
        property_id: optionalString(raw.property_id),
        source_metadata: {
          internal_user_id: user.id,
          requested_title: requestedTitle,
          customer_notes: customerNotes || null,
          preferred_date: optionalString(raw.preferred_date) || null,
          preferred_time: optionalString(raw.preferred_time) || null,
          intake_surface: "web_dashboard",
        },
      },
    });

  if (gatewayError) {
    throw new Error(gatewayError.message || "فشل الاتصال بالبوابة الموحدة");
  }

  if (!gatewayResult?.success || !gatewayResult.request_id) {
    throw new Error(gatewayResult?.message_ar || gatewayResult?.error || "فشل إنشاء طلب الصيانة");
  }

  // اقرأ السجل النهائي بعد أن تنهي البوابة التحقق والترقيم والتسجيل.
  const { data: created, error: readError } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("id", gatewayResult.request_id)
    .maybeSingle();

  if (!readError && created) return created as MaintenanceRequest;

  // لا نُبلغ المستخدم بفشل الإنشاء بعد نجاح البوابة لمجرد تعذر إعادة القراءة.
  console.warn("Request created through gateway but could not be reloaded", readError);
  return {
    ...requestData,
    id: gatewayResult.request_id,
    request_number: gatewayResult.request_number,
    title: requestedTitle,
    description,
    status: "Open",
    workflow_stage: "submitted",
    created_at: gatewayResult.created_at,
    created_by: user.id,
  } as MaintenanceRequest;
}

/** تحديث طلب */
export async function updateMaintenanceRequest(
  id: string,
  updates: Partial<MaintenanceRequest>
): Promise<MaintenanceRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  // مزامنة status مع workflow_stage
  if (updates.workflow_stage) {
    const stage = updates.workflow_stage as WorkflowStage;
    if (WORKFLOW_STAGES[stage]) {
      updates.status = WORKFLOW_STAGES[stage].status as MrStatus;
    }
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .update(updates as unknown as MaintenanceRequestInsert)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as MaintenanceRequest;
}

/** حذف طلب */
export async function deleteMaintenanceRequest(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const { error } = await supabase
    .from("maintenance_requests")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
