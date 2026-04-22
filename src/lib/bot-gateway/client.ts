/**
 * Bot Gateway API Client — UberFix
 * 
 * واجهة برمجة موحدة لربط أي بوت (عزبوت / واتساب / ويدجت موقع) بالنظام.
 * كل المكالمات تمر عبر edge function: bot-gateway
 * 
 * مصادقة:
 *  - استخدام داخلي من تطبيق UberFix: VITE_SUPABASE_PUBLISHABLE_KEY (anon key)
 *  - استخدام خارجي (مواقع موسسة العزب): x-api-key مُسجل في api_consumers
 */

export type BotAction =
  | 'create_request'
  | 'check_status'
  | 'get_request_details'
  | 'update_request'
  | 'cancel_request'
  | 'add_note'
  | 'assign_technician'
  | 'list_technicians'
  | 'list_categories'
  | 'list_services'
  | 'get_branches'
  | 'find_nearest_branch'
  | 'collect_customer_info'
  | 'get_quote';

export interface BotGatewayRequest {
  action: BotAction;
  payload: Record<string, any>;
  session_id?: string;
  metadata?: {
    source?: string;       // 'azabot' | 'uberfix_web' | 'azab_real_estate' | ...
    user_agent?: string;
    locale?: string;
  };
}

export interface BotGatewayResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  request_id?: string;
  tracking_number?: string;
}

// ============= Payload types =============

export interface MaintenanceRequestPayload {
  client_name: string;
  client_phone: string;
  client_email?: string;
  location: string;
  service_type?: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  latitude?: number;
  longitude?: number;
}

export interface StatusCheckPayload {
  search_term: string;
  search_type?: 'request_number' | 'phone' | 'name';
}

export interface GetRequestDetailsPayload {
  request_id?: string;
  request_number?: string;
  client_phone?: string; // يستخدم للتحقق
}

export interface UpdateRequestPayload {
  request_id: string;
  client_phone?: string;
  updates: Partial<{
    description: string;
    location: string;
    priority: 'low' | 'medium' | 'high';
    service_type: string;
    customer_notes: string;
    latitude: number;
    longitude: number;
    title: string;
    workflow_stage: 'submitted' | 'acknowledged' | 'on_hold' | 'cancelled' | 'scheduled';
  }>;
}

export interface CancelRequestPayload {
  request_id: string;
  client_phone?: string;
  reason?: string;
}

export interface AddNotePayload {
  request_id: string;
  note: string;
  client_phone?: string;
}

export interface AssignTechnicianPayload {
  request_id: string;
  technician_id?: string;  // إذا غاب يتم التعيين التلقائي
  auto?: boolean;           // فرض التعيين الذكي
}

export interface ListTechniciansPayload {
  specialization?: string;
  city_id?: string;
  limit?: number;
}

export interface FindNearestBranchPayload {
  latitude?: number;
  longitude?: number;
  city?: string;
}

export interface CollectCustomerInfoPayload {
  client_phone: string;
  client_name?: string;
  client_email?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  preferred_branch_id?: string;
  notes?: string;
}

export interface QuoteRequestPayload {
  service_type: string;
  description: string;
  location: string;
  area_sqm?: number;
  client_name: string;
  client_phone: string;
}

// ============= Core caller =============

const BOT_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-gateway`;

async function callBotGateway<T = any>(
  request: BotGatewayRequest,
  apiKey?: string
): Promise<BotGatewayResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
    headers['apikey'] = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }

  try {
    const resp = await fetch(BOT_GATEWAY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'خطأ غير متوقع' }));
      return { success: false, error: err.error || `HTTP ${resp.status}` };
    }

    return await resp.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'فشل الاتصال بالخادم' };
  }
}

// ============= Public API =============

/** إنشاء طلب صيانة عبر البوت */
export const createMaintenanceRequest = (p: MaintenanceRequestPayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'create_request', payload: p, session_id: sessionId, metadata: { source: 'azabot_web' } }, apiKey);

/** البحث في الطلبات */
export const checkRequestStatus = (p: StatusCheckPayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'check_status', payload: p, session_id: sessionId }, apiKey);

/** تفاصيل طلب واحد */
export const getRequestDetails = (p: GetRequestDetailsPayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'get_request_details', payload: p, session_id: sessionId }, apiKey);

/** تعديل طلب */
export const updateRequest = (p: UpdateRequestPayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'update_request', payload: p, session_id: sessionId }, apiKey);

/** إلغاء طلب */
export const cancelRequest = (p: CancelRequestPayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'cancel_request', payload: p, session_id: sessionId }, apiKey);

/** إضافة ملاحظة على طلب */
export const addNote = (p: AddNotePayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'add_note', payload: p, session_id: sessionId }, apiKey);

/** تعيين فني (تلقائي أو يدوي) */
export const assignTechnician = (p: AssignTechnicianPayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'assign_technician', payload: p, session_id: sessionId }, apiKey);

/** قائمة فنيين متاحين */
export const listTechnicians = (p: ListTechniciansPayload = {}, apiKey?: string) =>
  callBotGateway({ action: 'list_technicians', payload: p }, apiKey);

/** قائمة فئات الصيانة */
export const listCategories = (apiKey?: string) =>
  callBotGateway({ action: 'list_categories', payload: {} }, apiKey);

/** قائمة الخدمات (ثابتة) */
export const listServices = (apiKey?: string) =>
  callBotGateway({ action: 'list_services', payload: {} }, apiKey);

/** قائمة كل الفروع */
export const getBranches = (apiKey?: string) =>
  callBotGateway({ action: 'get_branches', payload: {} }, apiKey);

/** أقرب فرع */
export const findNearestBranch = (p: FindNearestBranchPayload, apiKey?: string) =>
  callBotGateway({ action: 'find_nearest_branch', payload: p }, apiKey);

/** حفظ بيانات العميل في سياق الجلسة */
export const collectCustomerInfo = (p: CollectCustomerInfoPayload, sessionId: string, apiKey?: string) =>
  callBotGateway({ action: 'collect_customer_info', payload: p, session_id: sessionId }, apiKey);

/** طلب عرض سعر */
export const requestQuote = (p: QuoteRequestPayload, sessionId?: string, apiKey?: string) =>
  callBotGateway({ action: 'get_quote', payload: p, session_id: sessionId, metadata: { source: 'azabot_web' } }, apiKey);
