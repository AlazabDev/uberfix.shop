import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * WhatsApp Flow Data Exchange Endpoint
 * =====================================
 * Based on Meta's official reference implementation (encryption.js, flow.js, server.js)
 * Adapted for Deno runtime on Supabase Edge Functions
 * 
 * Domain: uberfix.alazab.com
 * Flow ID: 1946584099618562
 */

const { subtle } = globalThis.crypto;

// ==========================================
// Encryption / Decryption (Meta reference: encryption.js)
// ==========================================

class FlowEndpointException extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "FlowEndpointException";
    this.statusCode = statusCode;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  for (const b of arr) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Support both PKCS#8 and PKCS#1 formats
  // Note: Web Crypto API only supports PKCS#8 unencrypted keys
  // If key is encrypted with passphrase, it must be converted to unencrypted PKCS#8 first
  const pemContents = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const keyData = base64ToUint8Array(pemContents);

  return await subtle.importKey(
    "pkcs8",
    new Uint8Array(keyData).buffer as ArrayBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );
}

async function decryptRequest(
  body: {
    encrypted_aes_key: string;
    encrypted_flow_data: string;
    initial_vector: string;
  },
  privatePem: string
): Promise<{
  decryptedBody: Record<string, unknown>;
  aesKeyBuffer: ArrayBuffer;
  initialVectorBuffer: Uint8Array;
}> {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  const privateKey = await importPrivateKey(privatePem);

  let aesKeyBuffer: ArrayBuffer;
  try {
    // decrypt AES key created by client (RSA-OAEP with SHA-256)
    aesKeyBuffer = await subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      new Uint8Array(base64ToUint8Array(encrypted_aes_key)).buffer as ArrayBuffer
    );
  } catch (error) {
    console.error("RSA decrypt failed:", error);
    /*
     * Failed to decrypt. Please verify your private key.
     * If you change your public key, return HTTP 421 to refresh the public key on the client
     */
    throw new FlowEndpointException(
      421,
      "Failed to decrypt the request. Please verify your private key."
    );
  }

  // decrypt flow data (AES-128-GCM)
  const flowDataBuffer = base64ToUint8Array(encrypted_flow_data);
  const initialVectorBuffer = base64ToUint8Array(initial_vector);

  const aesKey = await subtle.importKey(
    "raw",
    aesKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedData = await subtle.decrypt(
    { name: "AES-GCM", iv: initialVectorBuffer },
    aesKey,
    new Uint8Array(flowDataBuffer).buffer as ArrayBuffer
  );

  const decryptedJSONString = new TextDecoder().decode(decryptedData);

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer,
    initialVectorBuffer,
  };
}

async function encryptResponse(
  response: Record<string, unknown>,
  aesKeyBuffer: ArrayBuffer,
  initialVectorBuffer: Uint8Array
): Promise<string> {
  // flip initial vector (Meta reference pattern)
  const flippedIv = new Uint8Array(initialVectorBuffer.length);
  for (let i = 0; i < initialVectorBuffer.length; i++) {
    flippedIv[i] = ~initialVectorBuffer[i] & 0xff;
  }

  const aesKey = await subtle.importKey(
    "raw",
    aesKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = await subtle.encrypt(
    { name: "AES-GCM", iv: flippedIv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(response))
  );

  return uint8ArrayToBase64(new Uint8Array(encrypted));
}

// ==========================================
// Signature Verification (Meta reference: server.js)
// ==========================================

async function isRequestSignatureValid(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
  if (!appSecret) {
    console.warn(
      "FACEBOOK_APP_SECRET not set. Skipping signature validation."
    );
    return true;
  }

  if (!signatureHeader) {
    console.error("Missing x-hub-signature-256 header");
    return false;
  }

  const signature = signatureHeader.replace("sha256=", "");

  // HMAC-SHA256 verification
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );

  const computedHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (computedHex.length !== signature.length) {
    console.error("Signature length mismatch");
    return false;
  }

  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  if (diff !== 0) {
    console.error("Error: Request Signature did not match");
    return false;
  }

  return true;
}

// ==========================================
// Business Logic Helpers
// ==========================================

function mapPriority(priority: string): string {
  switch (priority) {
    case "urgent":
      return "high";
    case "medium":
      return "medium";
    case "normal":
      return "low";
    default:
      return "medium";
  }
}

function mapStatusToArabic(status: string, stage?: string): string {
  const stageMap: Record<string, string> = {
    submitted: "تم الإرسال",
    triaged: "قيد المراجعة",
    assigned: "تم تعيين فني",
    scheduled: "تم جدولة الموعد",
    in_progress: "قيد التنفيذ",
    inspection: "قيد الفحص",
    completed: "مكتمل",
    closed: "مغلق",
    cancelled: "ملغي",
  };
  const statusMap: Record<string, string> = {
    Open: "مفتوح",
    "In Progress": "قيد التنفيذ",
    Completed: "مكتمل",
    Closed: "مغلق",
    Cancelled: "ملغي",
  };
  return stageMap[stage || ""] || statusMap[status || ""] || status || "غير محدد";
}

function mapPriorityToArabic(priority: string): string {
  const map: Record<string, string> = {
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة",
  };
  return map[priority] || priority || "غير محدد";
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ==========================================
// Data Fetchers
// ==========================================

const SERVICE_TYPES = [
  { id: "plumbing", title: "سباكة" },
  { id: "electrical", title: "كهرباء" },
  { id: "ac", title: "تكييف وتبريد" },
  { id: "carpentry", title: "نجارة" },
  { id: "painting", title: "دهانات" },
  { id: "cleaning", title: "تنظيف" },
  { id: "appliances", title: "أجهزة منزلية" },
  { id: "glass", title: "زجاج ومرايا" },
  { id: "pest_control", title: "مكافحة حشرات" },
  { id: "general", title: "صيانة عامة" },
];

const PRIORITIES = [
  { id: "urgent", title: "🔴 عاجل" },
  { id: "medium", title: "🟡 متوسط" },
  { id: "normal", title: "🟢 عادي" },
];

const SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.id, s.title])
);

const PRIORITY_LABELS: Record<string, string> = Object.fromEntries(
  PRIORITIES.map((p) => [p.id, p.title])
);

async function fetchBranches(): Promise<Array<{ id: string; title: string }>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("❌ Error fetching branches:", error);
    return [];
  }

  return (data || []).map((b) => ({ id: b.id, title: b.name }));
}

async function getBranchInfo(
  branchId: string
): Promise<{ name: string; id: string; companyId: string } | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, company_id")
    .eq("id", branchId)
    .maybeSingle();

  if (error || !data) return null;
  return { name: data.name, id: data.id, companyId: data.company_id };
}

async function trackRequest(
  requestNumber: string
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  const cleaned = requestNumber.trim().toUpperCase();

  const { data, error } = await supabase
    .from("maintenance_requests")
    .select(
      "id, request_number, status, workflow_stage, service_type, priority, client_name, location, created_at, branch_id, assigned_vendor_id"
    )
    .or(
      `request_number.eq.${cleaned},id.eq.${cleaned.length === 36 ? cleaned : "00000000-0000-0000-0000-000000000000"}`
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  let branchName = "غير محدد";
  if (data.branch_id) {
    const { data: branch } = await supabase
      .from("branches")
      .select("name")
      .eq("id", data.branch_id)
      .maybeSingle();
    if (branch) branchName = branch.name;
  }

  let techName = "لم يتم التعيين بعد";
  if (data.assigned_vendor_id) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("name")
      .eq("id", data.assigned_vendor_id)
      .maybeSingle();
    if (vendor) techName = vendor.name;
  }

  return {
    request_number: data.request_number || data.id.slice(0, 8).toUpperCase(),
    status_text: mapStatusToArabic(data.status, data.workflow_stage),
    service_type: data.service_type || "غير محدد",
    priority_text: mapPriorityToArabic(data.priority),
    created_date: data.created_at
      ? new Date(data.created_at).toLocaleDateString("ar-EG")
      : "غير محدد",
    branch_name: branchName,
    technician_name: techName,
    track_url: `https://uberfix.alazab.com/track/${data.request_number || data.id}`,
  };
}

// ==========================================
// Screen Response Handler (Meta reference: flow.js → getNextScreen)
// ==========================================

async function getNextScreen(
  decryptedBody: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { screen, data, version, action, flow_token } = decryptedBody as {
    screen: string;
    data: Record<string, unknown>;
    version: string;
    action: string;
    flow_token: string;
  };

  // handle health check (ping)
  if (action === "ping") {
    return {
      version,
      data: {
        status: "active",
      },
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      version,
      data: {
        acknowledged: true,
      },
    };
  }

  // handle INIT → display APPOINTMENT screen with dynamic data
  if (action === "INIT") {
    console.log("🚀 INIT: Fetching dynamic data...");
    const branches = await fetchBranches();
    console.log(`📋 Found ${branches.length} branches`);

    return {
      version,
      screen: "APPOINTMENT",
      data: {
        department: SERVICE_TYPES,
        location: branches,
        is_location_enabled: false,
        date: PRIORITIES,
        is_date_enabled: false,
        time: [] as Array<{ id: string; title: string }>,
        is_time_enabled: false,
      },
    };
  }

  if (action === "data_exchange") {
    // ---- Track request flow ----
    if ((data as Record<string, unknown>).flow_action === "track_request") {
      const requestNumber = (data as Record<string, unknown>)
        .request_number as string;
      console.log("🔍 Tracking request:", requestNumber);

      if (!requestNumber || requestNumber.trim().length < 3) {
        return {
          version,
          screen: "TRACK_INPUT",
          data: { error_message: "يرجى إدخال رقم طلب صحيح" },
        };
      }

      const result = await trackRequest(requestNumber);
      if (!result) {
        return {
          version,
          screen: "TRACK_INPUT",
          data: {
            error_message: `لم يتم العثور على طلب برقم: ${requestNumber.trim()}`,
          },
        };
      }

      return {
        version,
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: { flow_token, ...result },
          },
        },
      };
    }

    // ---- Screen-based routing (Meta reference pattern) ----
    switch (screen) {
      // APPOINTMENT screen interactions (dropdown selections)
      case "APPOINTMENT": {
        const branches = await fetchBranches();
        return {
          version,
          screen: "APPOINTMENT",
          data: {
            department: SERVICE_TYPES,
            location: branches,
            is_location_enabled: Boolean(data.department),
            date: PRIORITIES,
            is_date_enabled:
              Boolean(data.department) && Boolean(data.location),
            time: [] as Array<{ id: string; title: string }>,
            is_time_enabled:
              Boolean(data.department) &&
              Boolean(data.location) &&
              Boolean(data.date),
          },
        };
      }

      // DETAILS screen → build summary
      case "DETAILS": {
        const dept = data.department as string;
        const loc = data.location as string;
        const prio = data.date as string;

        let branchLabel = "غير محدد";
        if (loc) {
          const info = await getBranchInfo(loc);
          if (info) branchLabel = info.name;
        }

        const appointment = `نوع الخدمة: ${SERVICE_LABELS[dept] || dept}\nالفرع: ${branchLabel}\nالأولوية: ${PRIORITY_LABELS[prio] || prio}`;
        const details = `الاسم: ${data.name || ""}\nالهاتف: ${data.phone || ""}\n${data.email ? "البريد: " + data.email + "\n" : ""}\n${data.more_details || ""}`;

        return {
          version,
          screen: "SUMMARY",
          data: {
            appointment,
            details,
            department: dept,
            location: loc,
            date: prio,
            time: (data.time as string) || "",
            name: (data.name as string) || "",
            email: (data.email as string) || "",
            phone: (data.phone as string) || "",
            more_details: (data.more_details as string) || "",
          },
        };
      }

      // SUMMARY screen → create maintenance request
      case "SUMMARY": {
        const supabase = getSupabase();

        const maintenance_type =
          (data.department as string) || "general";
        const branch_id = data.location as string;
        const priority = (data.date as string) || "normal";
        const requester_name =
          (data.name as string) || "عميل واتساب";
        const client_phone = data.phone as string;
        const client_email = data.email as string;
        const description = (data.more_details as string) || "";

        console.log("📋 Creating request:", {
          requester_name,
          maintenance_type,
          branch_id,
          priority,
        });

        // Get branch info
        const branchInfo = await getBranchInfo(branch_id);
        let finalBranchId = branch_id;
        let finalBranchName = "غير محدد";
        let companyId: string | undefined;

        if (branchInfo) {
          finalBranchId = branchInfo.id;
          finalBranchName = branchInfo.name;
          companyId = branchInfo.companyId;
        } else {
          // Fallback: first available branch
          const { data: fb } = await supabase
            .from("branches")
            .select("id, name, company_id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (fb) {
            finalBranchId = fb.id;
            finalBranchName = fb.name;
            companyId = fb.company_id;
          }
        }

        if (!companyId) {
          const { data: company } = await supabase
            .from("companies")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          companyId = company?.id;
        }

        if (!companyId) {
          console.error("❌ No company found");
          return {
            version,
            screen: "DETAILS",
            data: {
              error_message:
                "خطأ في النظام. يرجى المحاولة لاحقاً.",
            },
          };
        }

        // Insert maintenance request
        const { data: newRequest, error: insertError } = await supabase
          .from("maintenance_requests")
          .insert({
            title: `${maintenance_type} - ${finalBranchName}`,
            description: description || null,
            client_name: requester_name,
            client_phone: client_phone || null,
            client_email: client_email || null,
            service_type: maintenance_type,
            location: finalBranchName,
            priority: mapPriority(priority),
            status: "Open",
            workflow_stage: "submitted",
            channel: "whatsapp_flow",
            company_id: companyId,
            branch_id: finalBranchId,
          })
          .select("id, request_number")
          .single();

        if (insertError) {
          console.error("❌ Insert error:", insertError);
          return {
            version,
            screen: "DETAILS",
            data: {
              error_message:
                "فشل في إرسال الطلب. يرجى المحاولة مرة أخرى.",
            },
          };
        }

        const requestId = newRequest.id;
        const requestNumber =
          newRequest.request_number ||
          requestId.slice(0, 8).toUpperCase();
        console.log(
          "✅ Request created:",
          requestId,
          "Number:",
          requestNumber
        );

        // Notify admin (fire & forget)
        try {
          await supabase.functions.invoke(
            "send-maintenance-notification",
            {
              body: {
                request_id: requestId,
                event_type: "request_created",
              },
            }
          );
        } catch (err) {
          console.error("⚠️ Admin notification failed:", err);
        }

        // Log message
        await supabase.from("message_logs").insert({
          request_id: requestId,
          recipient: "whatsapp_flow_user",
          message_type: "whatsapp",
          message_content: `طلب صيانة جديد من WhatsApp Flow: ${maintenance_type} - ${finalBranchName}`,
          provider: "meta",
          status: "sent",
          metadata: {
            source: "whatsapp_flow",
            flow_id: "1946584099618562",
            requester_name,
            maintenance_type,
            branch_name: finalBranchName,
            branch_id: finalBranchId,
            priority,
          },
        });

        // Send success response to close the flow
        return {
          version,
          screen: "SUCCESS",
          data: {
            extension_message_response: {
              params: {
                flow_token,
                request_number: requestNumber,
                requester_name,
              },
            },
          },
        };
      }

      default:
        break;
    }
  }

  // handle BACK action
  if (action === "BACK") {
    const branches = await fetchBranches();
    return {
      version: version as string,
      screen: "APPOINTMENT",
      data: {
        department: SERVICE_TYPES,
        location: branches,
        is_location_enabled: true,
        date: PRIORITIES,
        is_date_enabled: true,
        time: [] as Array<{ id: string; title: string }>,
        is_time_enabled: false,
      },
    };
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
}

// ==========================================
// Main Server Handler (Meta reference: server.js)
// ==========================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // ==========================================
  // GET → Meta Webhook Verification (Handshake)
  // ==========================================
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ WhatsApp Flow webhook verified");
      return new Response(challenge || "", { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // ==========================================
  // POST → Encrypted Data Exchange
  // ==========================================
  try {
    const rawBody = await req.text();
    console.log("📥 WhatsApp Flow request received");

    // ---- Signature Verification (Meta reference: server.js) ----
    // Return 432 if signature does not match
    const signatureHeader = req.headers.get("x-hub-signature-256");
    if (!(await isRequestSignatureValid(rawBody, signatureHeader))) {
      return new Response(null, { status: 432 });
    }

    // ---- Check private key ----
    const privatePem = Deno.env.get("WHATSAPP_FLOW_PRIVATE_KEY");
    if (!privatePem) {
      console.error("❌ WHATSAPP_FLOW_PRIVATE_KEY not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    // ---- Parse body ----
    let parsedBody: {
      encrypted_aes_key: string;
      encrypted_flow_data: string;
      initial_vector: string;
    };
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      // Simple test/ping (non-encrypted)
      return new Response(
        JSON.stringify({
          status: "active",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ---- Check if it's a non-encrypted test ----
    if (
      !parsedBody.encrypted_aes_key ||
      !parsedBody.encrypted_flow_data ||
      !parsedBody.initial_vector
    ) {
      const testBody = parsedBody as unknown as Record<string, unknown>;
      if (testBody.test === true || testBody.action === "ping") {
        console.log("🏓 Test ping received");
        return new Response(
          JSON.stringify({
            status: "active",
            timestamp: new Date().toISOString(),
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Invalid request body", { status: 400 });
    }

    // ---- Decrypt request ----
    let decryptedRequest;
    try {
      decryptedRequest = await decryptRequest(parsedBody, privatePem);
    } catch (err) {
      console.error("Decryption error:", err);
      if (err instanceof FlowEndpointException) {
        // 421 = key mismatch, triggers Meta to refresh public key
        return new Response(null, { status: err.statusCode });
      }
      return new Response(null, { status: 500 });
    }

    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } =
      decryptedRequest;
    console.log("💬 Decrypted Request:", JSON.stringify(decryptedBody));

    // ---- Get screen response ----
    const screenResponse = await getNextScreen(decryptedBody);
    console.log("👉 Response to Encrypt:", JSON.stringify(screenResponse));

    // ---- Encrypt & send ----
    const encryptedResponse = await encryptResponse(
      screenResponse,
      aesKeyBuffer,
      initialVectorBuffer
    );

    return new Response(encryptedResponse, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("❌ WhatsApp Flow error:", error);
    return new Response(null, { status: 500 });
  }
});
