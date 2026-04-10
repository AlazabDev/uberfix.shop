/**
 * Bot Gateway API Client
 * 
 * واجهة برمجة موحدة لربط عزبوت (AzaBot) بالأنظمة الخارجية.
 * تمر جميع الطلبات عبر قناة bot-gateway في maintenance-gateway.
 */

export interface BotGatewayRequest {
  /** نوع العملية */
  action: 'create_request' | 'check_status' | 'list_services' | 'get_branches' | 'get_quote';
  /** بيانات العملية */
  payload: Record<string, any>;
  /** معرف الجلسة */
  session_id?: string;
  /** بيانات وصفية إضافية */
  metadata?: {
    source?: string;
    user_agent?: string;
    locale?: string;
  };
}

export interface BotGatewayResponse {
  success: boolean;
  data?: any;
  error?: string;
  request_id?: string;
  tracking_number?: string;
}

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

export interface QuoteRequestPayload {
  service_type: string;
  description: string;
  location: string;
  area_sqm?: number;
  client_name: string;
  client_phone: string;
}

const BOT_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-gateway`;

async function callBotGateway(request: BotGatewayRequest): Promise<BotGatewayResponse> {
  const resp = await fetch(BOT_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(request),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'خطأ غير متوقع' }));
    return { success: false, error: err.error || `HTTP ${resp.status}` };
  }

  return resp.json();
}

/** إنشاء طلب صيانة عبر البوت */
export async function createMaintenanceRequest(payload: MaintenanceRequestPayload, sessionId?: string): Promise<BotGatewayResponse> {
  return callBotGateway({
    action: 'create_request',
    payload,
    session_id: sessionId,
    metadata: { source: 'azabot_web' },
  });
}

/** التحقق من حالة طلب */
export async function checkRequestStatus(payload: StatusCheckPayload, sessionId?: string): Promise<BotGatewayResponse> {
  return callBotGateway({
    action: 'check_status',
    payload,
    session_id: sessionId,
  });
}

/** الحصول على قائمة الخدمات */
export async function listServices(): Promise<BotGatewayResponse> {
  return callBotGateway({
    action: 'list_services',
    payload: {},
  });
}

/** الحصول على قائمة الفروع */
export async function getBranches(): Promise<BotGatewayResponse> {
  return callBotGateway({
    action: 'get_branches',
    payload: {},
  });
}

/** طلب عرض سعر */
export async function requestQuote(payload: QuoteRequestPayload, sessionId?: string): Promise<BotGatewayResponse> {
  return callBotGateway({
    action: 'get_quote',
    payload,
    session_id: sessionId,
    metadata: { source: 'azabot_web' },
  });
}
