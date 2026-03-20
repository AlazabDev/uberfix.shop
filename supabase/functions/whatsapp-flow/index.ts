import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * WhatsApp Flow Data Exchange Endpoint
 * =====================================
 * يستقبل بيانات من WhatsApp Flow ويحولها لطلب صيانة في Supabase
 * 
 * Meta يرسل البيانات مشفرة بـ RSA + AES
 * نقوم بفك التشفير → إنشاء طلب صيانة → إرسال إشعار تأكيد
 */

const { subtle } = globalThis.crypto;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const keyData = base64ToArrayBuffer(pemContents);

  return await subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

async function decryptRequest(
  body: string,
  privatePem: string
): Promise<{ decryptedBody: Record<string, unknown>; aesKeyBuffer: ArrayBuffer; initialVectorBuffer: ArrayBuffer }> {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = JSON.parse(body);

  const privateKey = await importPrivateKey(privatePem);

  const aesKeyBuffer = await subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToArrayBuffer(encrypted_aes_key)
  );

  const aesKey = await subtle.importKey(
    'raw',
    aesKeyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const initialVectorBuffer = base64ToArrayBuffer(initial_vector);

  const decryptedData = await subtle.decrypt(
    { name: 'AES-GCM', iv: initialVectorBuffer },
    aesKey,
    base64ToArrayBuffer(encrypted_flow_data)
  );

  const decryptedBody = JSON.parse(new TextDecoder().decode(decryptedData));

  return { decryptedBody, aesKeyBuffer, initialVectorBuffer };
}

async function encryptResponse(
  response: Record<string, unknown>,
  aesKeyBuffer: ArrayBuffer,
  initialVectorBuffer: ArrayBuffer
): Promise<string> {
  const ivBytes = new Uint8Array(initialVectorBuffer);
  const flippedIv = new Uint8Array(ivBytes.length);
  for (let i = 0; i < ivBytes.length; i++) {
    flippedIv[i] = ~ivBytes[i] & 0xff;
  }

  const aesKey = await subtle.importKey(
    'raw',
    aesKeyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv: flippedIv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(response))
  );

  return arrayBufferToBase64(encrypted);
}

function mapPriority(priority: string): string {
  switch (priority) {
    case 'urgent': return 'high';
    case 'medium': return 'medium';
    case 'normal': return 'low';
    default: return 'medium';
  }
}

function mapStatusToArabic(status: string, stage?: string): string {
  const stageMap: Record<string, string> = {
    'submitted': 'تم الإرسال',
    'triaged': 'قيد المراجعة',
    'assigned': 'تم تعيين فني',
    'scheduled': 'تم جدولة الموعد',
    'in_progress': 'قيد التنفيذ',
    'inspection': 'قيد الفحص',
    'completed': 'مكتمل',
    'closed': 'مغلق',
    'cancelled': 'ملغي',
  };
  const statusMap: Record<string, string> = {
    'Open': 'مفتوح',
    'In Progress': 'قيد التنفيذ',
    'Completed': 'مكتمل',
    'Closed': 'مغلق',
    'Cancelled': 'ملغي',
  };
  return stageMap[stage || ''] || statusMap[status || ''] || status || 'غير محدد';
}

function mapPriorityToArabic(priority: string): string {
  const map: Record<string, string> = { 'high': 'عالية', 'medium': 'متوسطة', 'low': 'منخفضة' };
  return map[priority] || priority || 'غير محدد';
}

function formatEgyptianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '20' + cleaned.substring(1);
  if (!cleaned.startsWith('20') && cleaned.length === 10) cleaned = '20' + cleaned;
  return '+' + cleaned;
}

// Helper: get Supabase client
function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// Helper: track a request by number
async function trackRequest(requestNumber: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  const cleaned = requestNumber.trim().toUpperCase();
  
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('id, request_number, status, workflow_stage, service_type, priority, client_name, location, created_at, branch_id, assigned_vendor_id')
    .or(`request_number.eq.${cleaned},id.eq.${cleaned.length === 36 ? cleaned : '00000000-0000-0000-0000-000000000000'}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Get branch name
  let branchName = 'غير محدد';
  if (data.branch_id) {
    const { data: branch } = await supabase.from('branches').select('name').eq('id', data.branch_id).maybeSingle();
    if (branch) branchName = branch.name;
  }

  // Get technician name
  let techName = 'لم يتم التعيين بعد';
  if (data.assigned_vendor_id) {
    const { data: vendor } = await supabase.from('vendors').select('name').eq('id', data.assigned_vendor_id).maybeSingle();
    if (vendor) techName = vendor.name;
  }

  return {
    request_number: data.request_number || data.id.slice(0, 8).toUpperCase(),
    status_text: mapStatusToArabic(data.status, data.workflow_stage),
    service_type: data.service_type || 'غير محدد',
    priority_text: mapPriorityToArabic(data.priority),
    created_date: data.created_at ? new Date(data.created_at).toLocaleDateString('ar-EG') : 'غير محدد',
    branch_name: branchName,
    technician_name: techName,
    track_url: `https://uberfiix.lovable.app/track/${data.request_number || data.id}`,
  };
}

// Helper: fetch branches from DB
async function fetchBranches(): Promise<Array<{ id: string; title: string }>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('❌ Error fetching branches:', error);
    return [];
  }

  return (data || []).map(b => ({ id: b.id, title: b.name }));
}

// Helper: get branch name by ID
async function getBranchName(branchId: string): Promise<{ name: string; id: string; companyId: string } | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, company_id')
    .eq('id', branchId)
    .maybeSingle();

  if (error || !data) return null;
  return { name: data.name, id: data.id, companyId: data.company_id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ==========================================
  // GET → Meta Webhook Verification (Handshake)
  // ==========================================
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WhatsApp Flow webhook verified');
      return new Response(challenge || '', { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // ==========================================
  // POST → Data Exchange من WhatsApp Flow
  // ==========================================
  try {
    const rawBody = await req.text();
    console.log('📥 WhatsApp Flow request received');

    // Check if it's a simple test/ping (non-encrypted)
    try {
      const testBody = JSON.parse(rawBody);
      if (testBody.test === true || testBody.action === 'ping') {
        console.log('🏓 Test ping received');
        return new Response(JSON.stringify({ status: 'active', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch { /* not JSON or not a test request, continue with encrypted flow */ }

    const privatePem = Deno.env.get('WHATSAPP_FLOW_PRIVATE_KEY');
    if (!privatePem) {
      console.error('❌ WHATSAPP_FLOW_PRIVATE_KEY not configured');
      return new Response('Server error', { status: 500 });
    }

    // فك التشفير
    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = await decryptRequest(rawBody, privatePem);

    console.log('🔓 Decrypted body:', JSON.stringify(decryptedBody));

    const { action, screen, data, version, flow_token } = decryptedBody as {
      action: string;
      screen: string;
      data: Record<string, unknown>;
      version: string;
      flow_token: string;
    };

    // ==========================================
    // Health Check (ping)
    // ==========================================
    if (action === 'ping') {
      const response = { version, data: { status: 'active' } };
      const encrypted = await encryptResponse(response, aesKeyBuffer, initialVectorBuffer);
      return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
    }

    // ==========================================
    // INIT → إرسال البيانات الأولية (الفروع من قاعدة البيانات)
    // ==========================================
    if (action === 'INIT') {
      console.log('🚀 INIT: Fetching branches from database...');
      const branches = await fetchBranches();
      console.log(`📋 Found ${branches.length} branches`);

      const response = {
        version,
        screen: 'SELECT_BRANCH',
        data: {
          branches,
        },
      };
      const encrypted = await encryptResponse(response, aesKeyBuffer, initialVectorBuffer);
      return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
    }

    // ==========================================
    // navigate → عند اختيار الفرع والانتقال للنموذج
    // ==========================================
    if (action === 'navigate' && screen === 'SELECT_BRANCH') {
      const branchId = data.branch_id as string;
      const branchInfo = await getBranchName(branchId);
      
      const response = {
        version,
        screen: 'REQUEST_FORM',
        data: {
          branch_name: branchInfo?.name || 'غير محدد',
        },
      };
      const encrypted = await encryptResponse(response, aesKeyBuffer, initialVectorBuffer);
      return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
    }

    // ==========================================
    // data_exchange → تتبع طلب (Tracking Flow)
    // ==========================================
    if (action === 'data_exchange' && (data as Record<string, unknown>).flow_action === 'track_request') {
      const requestNumber = (data as Record<string, unknown>).request_number as string;
      console.log('🔍 Tracking request:', requestNumber);

      if (!requestNumber || requestNumber.trim().length < 3) {
        const errorResp = {
          version,
          screen: 'TRACK_INPUT',
          data: { error_message: 'يرجى إدخال رقم طلب صحيح' },
        };
        const encrypted = await encryptResponse(errorResp, aesKeyBuffer, initialVectorBuffer);
        return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
      }

      const result = await trackRequest(requestNumber);

      if (!result) {
        const errorResp = {
          version,
          screen: 'TRACK_INPUT',
          data: { error_message: `لم يتم العثور على طلب برقم: ${requestNumber.trim()}` },
        };
        const encrypted = await encryptResponse(errorResp, aesKeyBuffer, initialVectorBuffer);
        return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
      }

      const successResp = {
        version,
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token,
              ...result,
            },
          },
        },
      };
      const encrypted = await encryptResponse(successResp, aesKeyBuffer, initialVectorBuffer);
      return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
    }

    // ==========================================
    // data_exchange → استلام بيانات النموذج وإنشاء طلب
    // ==========================================
    if (action === 'data_exchange') {
      const supabase = getSupabase();

      const {
        requester_name,
        maintenance_type,
        branch_id,
        priority,
        description,
      } = data as {
        requester_name: string;
        maintenance_type: string;
        branch_id: string;
        priority: string;
        description: string;
      };

      console.log('📋 Flow data:', { requester_name, maintenance_type, branch_id, priority });

      // جلب بيانات الفرع
      const branchInfo = await getBranchName(branch_id);

      if (!branchInfo) {
        console.error('❌ Branch not found:', branch_id);
        // Fallback: use first available branch
        const { data: fallbackBranch } = await supabase
          .from('branches')
          .select('id, name, company_id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!fallbackBranch) {
          const errorResp = {
            version,
            screen: 'REQUEST_FORM',
            data: { error_message: 'خطأ في النظام. يرجى المحاولة لاحقاً.' },
          };
          const encrypted = await encryptResponse(errorResp, aesKeyBuffer, initialVectorBuffer);
          return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
        }
      }

      const finalBranchId = branchInfo?.id || branch_id;
      const finalBranchName = branchInfo?.name || 'غير محدد';
      const finalCompanyId = branchInfo?.companyId;

      // Get company_id if not from branch
      let companyId = finalCompanyId;
      if (!companyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        companyId = company?.id;
      }

      if (!companyId) {
        console.error('❌ No company found');
        const errorResp = {
          version,
          screen: 'REQUEST_FORM',
          data: { error_message: 'خطأ في النظام. يرجى المحاولة لاحقاً.' },
        };
        const encrypted = await encryptResponse(errorResp, aesKeyBuffer, initialVectorBuffer);
        return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
      }

      // إنشاء طلب الصيانة
      const { data: newRequest, error: insertError } = await supabase
        .from('maintenance_requests')
        .insert({
          title: `${maintenance_type} - ${finalBranchName}`,
          description: description,
          client_name: requester_name,
          service_type: maintenance_type,
          location: finalBranchName,
          priority: mapPriority(priority),
          status: 'Open',
          workflow_stage: 'submitted',
          channel: 'whatsapp_flow',
          company_id: companyId,
          branch_id: finalBranchId,
        })
        .select('id, request_number')
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        const errorResp = {
          version,
          screen: 'REQUEST_FORM',
          data: { error_message: 'فشل في إرسال الطلب. يرجى المحاولة مرة أخرى.' },
        };
        const encrypted = await encryptResponse(errorResp, aesKeyBuffer, initialVectorBuffer);
        return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
      }

      const requestId = newRequest.id;
      const requestNumber = newRequest.request_number || requestId.slice(0, 8).toUpperCase();
      console.log('✅ Maintenance request created:', requestId, 'Number:', requestNumber);

      // إرسال إشعار للإدارة
      try {
        await supabase.functions.invoke('send-maintenance-notification', {
          body: {
            request_id: requestId,
            event_type: 'request_created',
          },
        });
      } catch (adminNotifErr) {
        console.error('⚠️ Failed to notify admin:', adminNotifErr);
      }

      // سجل الرسالة
      await supabase.from('message_logs').insert({
        request_id: requestId,
        recipient: 'whatsapp_flow_user',
        message_type: 'whatsapp',
        message_content: `طلب صيانة جديد من WhatsApp Flow: ${maintenance_type} - ${finalBranchName}`,
        provider: 'meta',
        status: 'sent',
        metadata: {
          source: 'whatsapp_flow',
          flow_id: '1946584099618562',
          requester_name,
          maintenance_type,
          branch_name: finalBranchName,
          branch_id: finalBranchId,
          priority,
        },
      });

      // الاستجابة → شاشة النجاح
      const successResp = {
        version,
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token,
              request_number: requestNumber,
              requester_name: requester_name,
            },
          },
        },
      };

      const encrypted = await encryptResponse(successResp, aesKeyBuffer, initialVectorBuffer);
      return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
    }

    // ==========================================
    // BACK → العودة للشاشة السابقة
    // ==========================================
    if (action === 'BACK') {
      let targetScreen = 'SELECT_BRANCH';
      let screenData: Record<string, unknown> = {};

      if (screen === 'REQUEST_FORM') {
        targetScreen = 'SELECT_BRANCH';
        const branches = await fetchBranches();
        screenData = { branches };
      }

      const response = { version, screen: targetScreen, data: screenData };
      const encrypted = await encryptResponse(response, aesKeyBuffer, initialVectorBuffer);
      return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });
    }

    // ==========================================
    // إجراء غير معروف
    // ==========================================
    console.warn('⚠️ Unknown action:', action);
    const branches = await fetchBranches();
    const fallback = { version, screen: 'SELECT_BRANCH', data: { branches } };
    const encrypted = await encryptResponse(fallback, aesKeyBuffer, initialVectorBuffer);
    return new Response(encrypted, { headers: { 'Content-Type': 'text/plain' } });

  } catch (error) {
    console.error('❌ WhatsApp Flow error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
