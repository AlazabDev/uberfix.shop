/**
 * UberFix — Pre-production frontend audit findings.
 *
 * هذا الملف ليس Mock. كل عنصر يصف ملاحظة حقيقية تم رصدها في الكود الحالي
 * أثناء جلسة التدقيق، مع المسار الفعلي للملف وسبب الخطورة وطريقة الإصلاح
 * داخل المشروع نفسه (بدون أي إعادة بناء).
 *
 * Severity:
 *   critical — يهدد سلامة البيانات أو دورة حياة الطلب أو الإشعارات في الإنتاج.
 *   major    — تباين بصري/تعاقدي يضر بالموثوقية لكن لا يكسر التشغيل فوراً.
 *   minor    — تحسينات وضوح وتجربة مستخدم وعرض حالات.
 */

export type AuditSeverity = "critical" | "major" | "minor";

export type AuditArea =
  | "create_request"
  | "tracking"
  | "status_display"
  | "notifications"
  | "dashboard"
  | "api_contracts"
  | "data_integrity";

export interface AuditFinding {
  id: string;
  title: string;
  severity: AuditSeverity;
  area: AuditArea;
  /** أين رُصدت المشكلة فعلياً (مسارات ملفات حقيقية في المستودع). */
  locations: string[];
  /** لماذا هذه مشكلة في الإنتاج. */
  risk: string;
  /** كيف تُصلح داخل هذا المشروع بالذات. */
  recommendation: string;
}

export const AUDIT_FINDINGS: AuditFinding[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "MR-CRT-001",
    title:
      "تجاوز gateway عند الإنشاء من داخل التطبيق المُصادَق",
    severity: "critical",
    area: "create_request",
    locations: [
      "src/components/forms/NewRequestForm.tsx",
      "src/hooks/useMaintenanceRequests.ts",
      "src/services/maintenanceCrud.ts",
    ],
    risk:
      "قواعد المشروع تنص على أن كل إنشاء طلب يجب أن يمر عبر gateway. " +
      "النموذج الداخلي يستدعي createRequest الذي يكتب مباشرة على جدول maintenance_requests، " +
      "ما يكسر توحيد الترقيم والتسجيل في audit_logs والإشعارات الأولى للعميل.",
    recommendation:
      "تحويل createMaintenanceRequest في src/services/maintenanceCrud.ts ليستدعي " +
      "supabase.functions.invoke('gateway', { body: { channel: 'internal', ... } }) " +
      "بدل INSERT المباشر، مع الإبقاء على نفس واجهة الـ hook.",
  },
  {
    id: "MR-CRT-002",
    title: "اختيار الفرع تلقائياً بأول صف من جدول branches",
    severity: "critical",
    area: "data_integrity",
    locations: ["src/services/maintenanceCrud.ts"],
    risk:
      "createMaintenanceRequest يأخذ branch_id عبر .limit(1) من branches الخاصة بشركة المستخدم. " +
      "هذا fallback صامت يُعد قيمة افتراضية مزيفة لأي شركة لديها أكثر من فرع، " +
      "وينسف تقارير الأداء حسب الفرع وحسابات SLA المرتبطة بالموقع.",
    recommendation:
      "تمرير branch_id صراحةً من الـ UI (Select إلزامي عند الإنشاء)، " +
      "أو الاعتماد على maintenance-gateway لاستنتاج الفرع من العقار/الموقع، " +
      "ورفض الإنشاء بدون فرع موثق.",
  },
  {
    id: "MR-CRT-003",
    title: "اعتماد NewRequestForm على status: 'Open' كقيمة ثابتة",
    severity: "critical",
    area: "data_integrity",
    locations: ["src/components/forms/NewRequestForm.tsx"],
    risk:
      "النموذج يمرر status: 'Open' as const داخل requestPayload، " +
      "بينما المصدر الموحّد للحقيقة هو WORKFLOW_STAGES['submitted'].status. " +
      "أي تعديل مستقبلي على المرحلة الابتدائية لن ينعكس على هذا المسار، " +
      "ما يخلق تباين status/workflow_stage من لحظة الإنشاء.",
    recommendation:
      "حذف الحقل status من requestPayload في NewRequestForm.tsx " +
      "والاعتماد كلياً على الاشتقاق داخل maintenanceCrud.ts " +
      "(initialStatus من WORKFLOW_STAGES[initialStage].status).",
  },
  {
    id: "MR-CRT-004",
    title: "إشعار يدوي مكرر يتعارض مع DB triggers",
    severity: "critical",
    area: "notifications",
    locations: [
      "src/components/forms/NewRequestForm.tsx",
      "src/services/maintenanceNotifications.ts",
    ],
    risk:
      "auto_notify_on_status_change وtrigger_notify_customer_on_status_change " +
      "تطلق send-maintenance-notification تلقائياً عند تغيّر الحالة، " +
      "بينما الكود يستدعي send-notification وsend-twilio-message ويُنشئ صف notifications يدوياً. " +
      "النتيجة: ازدواج رسائل واتساب وإشعارات داخلية للعميل.",
    recommendation:
      "إزالة المسار اليدوي في NewRequestForm.tsx (notifications.insert + send-notification) " +
      "والاعتماد على الـ trigger، أو تعطيل الـ trigger لمسار محدد بشكل صريح. " +
      "يجب أن تكون قناة الإشعارات واحدة لكل حدث.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAJOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "MR-MAJ-001",
    title: "تباين خرائط حالة بين عدة مكونات",
    severity: "major",
    area: "status_display",
    locations: [
      "src/constants/maintenanceStatusConstants.ts",
      "src/components/dashboard/RecentRequests.tsx",
      "src/pages/track/TrackOrder.tsx",
    ],
    risk:
      "RecentRequests يعرّف statusConfig محلياً بقيم pending/in_progress/Open/Closed، " +
      "TrackOrder يعرّف TRACKING_STAGES + WORKFLOW_MAP محلياً، " +
      "بينما يوجد STATUS_MAP وWORKFLOW_STAGE_MAP مركزياً. " +
      "النتيجة: نفس الطلب قد يظهر بثلاث تسميات مختلفة في ثلاث شاشات.",
    recommendation:
      "حذف الخرائط المحلية واستيراد getStatusConfig / getWorkflowStageConfig " +
      "من maintenanceStatusConstants.ts فقط. التتبع العام يبقى يستخدم خريطة العميل المختصرة " +
      "لكن مشتقة من WORKFLOW_STAGES.",
  },
  {
    id: "MR-MAJ-002",
    title: "Status وWorkflow Stage يمكن أن يخرجا متعاكسين",
    severity: "major",
    area: "status_display",
    locations: [
      "src/services/maintenanceCrud.ts",
      "src/components/maintenance/RequestWorkflowControls.tsx",
      "src/components/maintenance/RequestStatusBadge.tsx",
    ],
    risk:
      "المزامنة status ← workflow_stage موجودة فقط داخل updateMaintenanceRequest، " +
      "لكن RequestWorkflowControls يكتب تحديث مباشر على Supabase لا يمر بهذه الدالة، " +
      "ما يفتح ثغرة حالات يدوية تخرج غير متطابقة. " +
      "أيضاً RequestStatusBadge يعرض إما الـ status أو الـ stage حسب prop، " +
      "وهو ما يخلق ارتباك بصري بين الشاشات.",
    recommendation:
      "إجبار RequestWorkflowControls على المرور عبر updateMaintenanceRequest " +
      "(أو دالة موحدة updateWorkflowStage) لضمان التزامن. " +
      "وعرض الاثنين معاً في صفحة التفاصيل بدل الاختيار بينهما.",
  },
  {
    id: "MR-MAJ-003",
    title: "غياب تغذية راجعة فعلية لتسليم رسائل واتساب في الواجهة",
    severity: "major",
    area: "notifications",
    locations: [
      "src/components/maintenance/MaintenanceRequestDetails.tsx",
      "src/pages/messages/MessageLogs.tsx",
    ],
    risk:
      "صفحة تفاصيل الطلب لا تعرض حالة آخر إشعار واتساب " +
      "(sent/delivered/read/failed) لهذا الطلب من جدول message_logs. " +
      "العميل قد يقول 'لم تصلني الرسالة' بينما لا توجد طريقة للتشغيل لمعرفة ذلك من نفس الشاشة.",
    recommendation:
      "إضافة Card 'سجل إشعارات الطلب' داخل تفاصيل الطلب يقرأ من message_logs " +
      "حيث request_id = current request مع آخر 10 محاولات وحالتها وقت/سبب الفشل.",
  },
  {
    id: "MR-MAJ-004",
    title: "Edge functions الفرونت يستدعي بعضها لم يعد له ما يبرره",
    severity: "major",
    area: "api_contracts",
    locations: [
      "src/components/forms/NewRequestForm.tsx",
      "src/services/maintenanceNotifications.ts",
    ],
    risk:
      "send-notification وsend-twilio-message وsend-unified-notification " +
      "كلها مستدعاة من الفرونت بينما القناة المعتمدة الآن هي send-maintenance-notification " +
      "وقوالب واتساب الـ 40 المعتمدة. تعدد المسارات يجعل التتبع مستحيل.",
    recommendation:
      "حصر إرسال إشعارات الصيانة في send-maintenance-notification (يُطلق من DB trigger)، " +
      "وحذف استدعاءات send-notification وsend-twilio-message من مسار إنشاء الطلب.",
  },
  {
    id: "MR-MAJ-005",
    title: "redirect قسري بـ window.location.href بعد إنشاء الطلب",
    severity: "major",
    area: "create_request",
    locations: ["src/components/forms/NewRequestForm.tsx"],
    risk:
      "بعد نجاح الإنشاء يتم setTimeout ثم window.location.href = `/requests/${id}`. " +
      "هذا يدمر حالة React Query، ويجبر جلب كامل، ويظهر شاشة تحميل بيضاء غير مبررة. " +
      "كما يخفي أي خطأ يحدث بين الـ toast والتوجيه.",
    recommendation:
      "استبداله بـ navigate(`/requests/${id}`) من react-router مع invalidateQueries " +
      "لمفتاح الطلبات.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MINOR
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "MR-MIN-001",
    title: "Dashboard لا يعرض حالة الخطأ بشكل قابل للتنفيذ",
    severity: "minor",
    area: "dashboard",
    locations: ["src/pages/Dashboard.tsx"],
    risk:
      "عند فشل useDashboardStats لا يوجد سوى loader دائم بلا رسالة خطأ، " +
      "ولا زر إعادة المحاولة. التشغيل لا يستطيع التمييز بين 'لا توجد بيانات' و'فشل الاتصال'.",
    recommendation:
      "إضافة فرع error صريح يعرض رسالة + زر retry يستدعي refetch.",
  },
  {
    id: "MR-MIN-002",
    title: "TrackOrder يعتمد على fallback 'submitted' عند غياب workflow_stage",
    severity: "minor",
    area: "tracking",
    locations: ["src/pages/track/TrackOrder.tsx"],
    risk:
      "WORKFLOW_MAP[request.workflow_stage || 'submitted'] " +
      "يخفي أي طلب وصل بحالة شاذة عن طريق إظهاره وكأنه في 'تم الاستلام'. " +
      "هذا يطمس مشكلات بيانات حقيقية على العميل.",
    recommendation:
      "عند غياب workflow_stage عرض شارة تحذير 'حالة غير معروفة' " +
      "مع تتبع الحدث في error_logs بدل تطبيع صامت.",
  },
  {
    id: "MR-MIN-003",
    title: "EmptyRequestsState وRequestErrorState غير موحدَين عبر الشاشات",
    severity: "minor",
    area: "status_display",
    locations: [
      "src/components/maintenance/EmptyRequestsState.tsx",
      "src/components/maintenance/RequestErrorState.tsx",
      "src/components/dashboard/RecentRequests.tsx",
    ],
    risk:
      "RecentRequests يعرض رسالة خطأ نصية بدون زر retry بينما يوجد RequestErrorState جاهز. " +
      "اختلاف معاملة الحالات بين الشاشات يربك الفنيين والمشغلين.",
    recommendation:
      "استخدام EmptyRequestsState وRequestErrorState في كل شاشة تعرض قائمة طلبات.",
  },
  {
    id: "MR-MIN-004",
    title: "النموذج العام يضيف emoji/labels داخل الحقول الحساسة",
    severity: "minor",
    area: "create_request",
    locations: ["src/components/forms/NewRequestForm.tsx"],
    risk:
      "title يُولَّد أحياناً من 'طلب صيانة جديد' افتراضياً في maintenanceCrud.ts. " +
      "هذا يخلق طلبات بعنوان واحد مكرر يصعب فرزها لاحقاً في التقارير.",
    recommendation:
      "جعل العنوان حقل إلزامي صريح في الـ schema بدون قيمة افتراضية، " +
      "مع validation rule واضح في maintenanceRequestFormSchema.",
  },
];

export const AUDIT_AREA_LABELS: Record<AuditArea, string> = {
  create_request: "إنشاء الطلب",
  tracking: "صفحة التتبع",
  status_display: "عرض الحالة",
  notifications: "الإشعارات",
  dashboard: "لوحة التحكم",
  api_contracts: "تعاقدات الـ API",
  data_integrity: "سلامة البيانات",
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  critical: "حرجة",
  major: "كبيرة",
  minor: "بسيطة",
};

/**
 * عقود الـ Edge Functions الفعلية المُستخدمة من الفرونت اليوم.
 * تم الاستخراج عبر grep على supabase.functions.invoke في src/.
 * عمود contract_status يعكس الحكم بعد المراجعة.
 */
export interface ApiContract {
  name: string;
  method: "POST" | "GET";
  /** القنوات/الشاشات التي تستدعي هذه الدالة. */
  callers: string[];
  expectedPayload: string;
  expectedResponse: string;
  contractStatus: "ok" | "weak" | "deprecated";
  notes: string;
}

export const API_CONTRACTS: ApiContract[] = [
  {
    name: "maintenance-gateway",
    method: "POST",
    callers: [
      "src/pages/gateway/MaintenanceGateway.tsx",
      "src/pages/public/QuoteRequestForm.tsx",
      "src/lib/bot-gateway/client.ts",
    ],
    expectedPayload:
      "{ channel, client_name, client_phone, service_type, description, location?, latitude?, longitude?, attachments?[] }",
    expectedResponse:
      "{ success: true, request_id: uuid, request_number: 'MR-YY-NNNNN', track_url }",
    contractStatus: "ok",
    notes:
      "النقطة المعتمدة لكل القنوات. لكنها لا تُستخدم من النموذج الداخلي للموظفين (انظر MR-CRT-001).",
  },
  {
    name: "submit-public-request",
    method: "POST",
    callers: [
      "src/components/forms/PublicQuickRequestForm.tsx",
      "src/components/whatsapp/WhatsAppMaintenanceForm.tsx",
      "src/pages/QuickRequestFromMap.tsx",
      "src/pages/public/UberFixRequestForm.tsx",
    ],
    expectedPayload:
      "{ property_id?, client_name, client_phone, service_type, description, location?, lat?, lng? }",
    expectedResponse:
      "{ success: true, request_id, request_number } (يمر داخلياً عبر gateway)",
    contractStatus: "ok",
    notes:
      "Wrapper عام صحيح. مطلوب توثيق قواعد rate-limiting ومدة TTL في الواجهة.",
  },
  {
    name: "send-maintenance-notification",
    method: "POST",
    callers: [
      "src/services/maintenanceNotifications.ts (legacy)",
      "DB trigger auto_notify_on_status_change (المعتمد)",
    ],
    expectedPayload:
      "{ request_id, event_type: 'status_changed'|'request_created'|'stage_changed', old_status?, new_status?, old_stage?, new_stage? }",
    expectedResponse: "{ ok: true, sent: { whatsapp: bool, email: bool } }",
    contractStatus: "ok",
    notes:
      "الاستدعاء الرسمي اليوم من DB trigger. الاستدعاء اليدوي من الفرونت يجب أن يُحذف لتفادي الازدواج.",
  },
  {
    name: "send-notification",
    method: "POST",
    callers: ["src/components/forms/NewRequestForm.tsx"],
    expectedPayload:
      "{ maintenanceRequestId, latitude, longitude, serviceType, clientName, address }",
    expectedResponse: "{ vendor: { name, distance } } | { error }",
    contractStatus: "deprecated",
    notes:
      "يتداخل مع تعيين الفنيين عبر assign-technician-to-request وإشعارات DB trigger. يجب الاستغناء عنه.",
  },
  {
    name: "send-twilio-message",
    method: "POST",
    callers: ["src/services/maintenanceNotifications.ts"],
    expectedPayload: "{ to, message, type: 'whatsapp', requestId }",
    expectedResponse: "{ sid, status }",
    contractStatus: "deprecated",
    notes:
      "بديل تاريخي قبل اعتماد قوالب Meta المعتمدة الـ 40. لا يجب استخدامه لأي إشعار دورة حياة.",
  },
  {
    name: "send-whatsapp-meta",
    method: "POST",
    callers: ["جزء من سلسلة send-maintenance-notification"],
    expectedPayload:
      "{ to, template_name, language, components: [{ type:'body', parameters:[...] }, { type:'button', ... }?] }",
    expectedResponse: "{ messages: [{ id, message_status }] }",
    contractStatus: "ok",
    notes: "العقد متوافق مع Meta Cloud API. يجب توثيق mapping القوالب في wa_templates.",
  },
  {
    name: "get-default-company-branch",
    method: "GET",
    callers: ["مسارات public وQR"],
    expectedPayload: "—",
    expectedResponse: "{ branch_id, company_id, branch_name, city }",
    contractStatus: "weak",
    notes:
      "يستخدم لاختيار فرع افتراضي للقنوات العامة. خطر تكرار نفس الـ fallback المذكور في MR-CRT-002.",
  },
];
