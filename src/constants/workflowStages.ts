import {
  FileText,
  Clock,
  CheckCircle2,
  UserCheck,
  Calendar,
  Wrench,
  Search,
  Package,
  DollarSign,
  Archive,
  XCircle,
  Pause,
  ShieldX,
  type LucideIcon,
} from "lucide-react";

/**
 * تعريف موحد لمراحل سير العمل
 * 
 * DB enum mr_status: Open | Assigned | InProgress | In Progress | Waiting | On Hold | Completed | Rejected | Closed | Cancelled
 * الكود يستخدم: Open, Assigned, In Progress, On Hold, Completed, Rejected, Closed, Cancelled
 */

export type WorkflowStage =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
  | 'inspection'
  | 'waiting_parts'
  | 'completed'
  | 'billed'
  | 'paid'
  | 'closed'
  | 'cancelled'
  | 'on_hold'
  | 'rejected';

export interface WorkflowStageConfig {
  key: WorkflowStage;
  label: string;
  labelEn: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  textColor: string;
  actions: string[];
  nextStages: WorkflowStage[];
  status: string; // الحالة المقابلة في DB (mr_status enum)
}

/**
 * المسار الطبيعي للطلب (Happy Path)
 */
export const HAPPY_PATH_STAGES: WorkflowStage[] = [
  'draft',
  'submitted',
  'acknowledged',
  'assigned',
  'scheduled',
  'in_progress',
  'inspection',
  'completed',
  'billed',
  'paid',
  'closed',
];

/**
 * تكوين جميع مراحل سير العمل
 * status يجب أن يطابق قيم mr_status enum في DB
 */
export const WORKFLOW_STAGES: Record<WorkflowStage, WorkflowStageConfig> = {
  draft: {
    key: 'draft',
    label: 'مسودة',
    labelEn: 'Draft',
    description: 'الطلب قيد الإنشاء ولم يتم إرساله بعد',
    icon: FileText,
    color: 'hsl(var(--muted))',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    actions: ['تعديل', 'إرسال', 'حذف'],
    nextStages: ['submitted', 'cancelled'],
    status: 'Open',
  },
  submitted: {
    key: 'submitted',
    label: 'تم الإرسال',
    labelEn: 'Submitted',
    description: 'تم إرسال الطلب وفي انتظار المراجعة',
    icon: FileText,
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    actions: ['مراجعة', 'استلام', 'رفض'],
    nextStages: ['acknowledged', 'cancelled'],
    status: 'Open',
  },
  acknowledged: {
    key: 'acknowledged',
    label: 'تم الاستلام',
    labelEn: 'Acknowledged',
    description: 'تم استلام الطلب ومراجعته من الإدارة',
    icon: CheckCircle2,
    color: 'hsl(187, 85%, 53%)',
    bgColor: 'bg-cyan-500',
    textColor: 'text-cyan-600',
    actions: ['تعيين فني', 'طلب معلومات إضافية', 'رفض'],
    nextStages: ['assigned', 'on_hold', 'cancelled'],
    status: 'Open',
  },
  assigned: {
    key: 'assigned',
    label: 'تم التعيين',
    labelEn: 'Assigned',
    description: 'تم تعيين فني للطلب وفي انتظار الجدولة',
    icon: UserCheck,
    color: 'hsl(258, 90%, 66%)',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    actions: ['جدولة موعد', 'إعادة تعيين', 'تعليق'],
    nextStages: ['scheduled', 'acknowledged', 'on_hold'],
    status: 'Assigned',
  },
  scheduled: {
    key: 'scheduled',
    label: 'تم الجدولة',
    labelEn: 'Scheduled',
    description: 'تم تحديد موعد الزيارة مع العميل',
    icon: Calendar,
    color: 'hsl(234, 89%, 74%)',
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-600',
    actions: ['بدء العمل', 'إعادة الجدولة', 'تعليق'],
    nextStages: ['in_progress', 'assigned', 'on_hold'],
    status: 'Assigned',
  },
  in_progress: {
    key: 'in_progress',
    label: 'قيد التنفيذ',
    labelEn: 'In Progress',
    description: 'الفني في الموقع وجاري العمل',
    icon: Wrench,
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    actions: ['إتمام', 'طلب قطع غيار', 'تعليق'],
    nextStages: ['inspection', 'waiting_parts', 'on_hold', 'completed'],
    status: 'In Progress',
  },
  inspection: {
    key: 'inspection',
    label: 'قيد الفحص',
    labelEn: 'Inspection',
    description: 'تم الانتهاء من العمل وجاري فحص الجودة',
    icon: Search,
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    actions: ['اعتماد', 'إعادة العمل', 'رفض'],
    nextStages: ['completed', 'in_progress', 'rejected'],
    status: 'In Progress',
  },
  waiting_parts: {
    key: 'waiting_parts',
    label: 'انتظار قطع الغيار',
    labelEn: 'Waiting Parts',
    description: 'في انتظار وصول قطع الغيار المطلوبة',
    icon: Package,
    color: 'hsl(45, 93%, 47%)',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    actions: ['استلام القطع', 'إلغاء الطلب'],
    nextStages: ['in_progress', 'cancelled'],
    status: 'On Hold',
  },
  completed: {
    key: 'completed',
    label: 'مكتمل',
    labelEn: 'Completed',
    description: 'تم إكمال العمل بنجاح واعتماده',
    icon: CheckCircle2,
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    actions: ['إصدار فاتورة', 'طلب تقييم'],
    nextStages: ['billed'],
    status: 'Completed',
  },
  billed: {
    key: 'billed',
    label: 'تم إصدار الفاتورة',
    labelEn: 'Billed',
    description: 'تم إصدار الفاتورة وإرسالها للعميل',
    icon: DollarSign,
    color: 'hsl(217, 91%, 50%)',
    bgColor: 'bg-blue-600',
    textColor: 'text-blue-700',
    actions: ['تسجيل الدفع'],
    nextStages: ['paid'],
    status: 'Completed',
  },
  paid: {
    key: 'paid',
    label: 'تم الدفع',
    labelEn: 'Paid',
    description: 'تم استلام المبلغ المستحق',
    icon: DollarSign,
    color: 'hsl(142, 76%, 36%)',
    bgColor: 'bg-green-600',
    textColor: 'text-green-700',
    actions: ['إغلاق الطلب'],
    nextStages: ['closed'],
    status: 'Completed',
  },
  closed: {
    key: 'closed',
    label: 'مغلق',
    labelEn: 'Closed',
    description: 'تم إغلاق الطلب وأرشفته',
    icon: Archive,
    color: 'hsl(215, 16%, 47%)',
    bgColor: 'bg-slate-500',
    textColor: 'text-slate-600',
    actions: [],
    nextStages: [],
    status: 'Closed',
  },
  cancelled: {
    key: 'cancelled',
    label: 'ملغي',
    labelEn: 'Cancelled',
    description: 'تم إلغاء الطلب',
    icon: XCircle,
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    actions: [],
    nextStages: [],
    status: 'Cancelled',
  },
  on_hold: {
    key: 'on_hold',
    label: 'معلق',
    labelEn: 'On Hold',
    description: 'تم تعليق العمل مؤقتاً',
    icon: Pause,
    color: 'hsl(45, 93%, 47%)',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    actions: ['استئناف', 'إلغاء'],
    nextStages: ['in_progress', 'scheduled', 'cancelled'],
    status: 'On Hold',
  },
  rejected: {
    key: 'rejected',
    label: 'مرفوض',
    labelEn: 'Rejected',
    description: 'تم رفض الطلب أو نتيجة الفحص',
    icon: ShieldX,
    color: 'hsl(0, 72%, 51%)',
    bgColor: 'bg-red-600',
    textColor: 'text-red-700',
    actions: ['إعادة الفتح'],
    nextStages: ['in_progress', 'cancelled'],
    status: 'Rejected',
  },
};

/**
 * الحصول على قائمة المراحل كمصفوفة مرتبة
 */
export const getStagesArray = (): WorkflowStageConfig[] => {
  return HAPPY_PATH_STAGES.map(key => WORKFLOW_STAGES[key]);
};

/**
 * الحصول على جميع المراحل كمصفوفة
 */
export const getAllStagesArray = (): WorkflowStageConfig[] => {
  return Object.values(WORKFLOW_STAGES);
};

/**
 * الحصول على فهرس المرحلة في المسار الطبيعي
 */
export const getStageIndex = (stage: WorkflowStage): number => {
  const index = HAPPY_PATH_STAGES.indexOf(stage);
  return index === -1 ? 0 : index;
};

/**
 * حساب نسبة التقدم
 */
export const getProgressPercentage = (stage: WorkflowStage): number => {
  const index = getStageIndex(stage);
  return Math.round((index / (HAPPY_PATH_STAGES.length - 1)) * 100);
};

/**
 * التحقق من إمكانية الانتقال بين المراحل
 */
export const canTransitionTo = (from: WorkflowStage, to: WorkflowStage): boolean => {
  const fromConfig = WORKFLOW_STAGES[from];
  return fromConfig?.nextStages.includes(to) ?? false;
};

/**
 * الحصول على المراحل التالية المحتملة
 */
export const getNextStages = (currentStage: WorkflowStage): WorkflowStageConfig[] => {
  const current = WORKFLOW_STAGES[currentStage];
  if (!current) return [];
  return current.nextStages.map(key => WORKFLOW_STAGES[key]);
};

/**
 * تحويل الحالة القديمة إلى مرحلة سير العمل
 * يدعم جميع قيم mr_status enum بما فيها القديمة
 */
export const statusToWorkflowStage = (status: string): WorkflowStage => {
  const statusMap: Record<string, WorkflowStage> = {
    'Open': 'submitted',
    'Assigned': 'assigned',
    'In Progress': 'in_progress',
    'InProgress': 'in_progress',
    'On Hold': 'on_hold',
    'Waiting': 'on_hold',
    'Completed': 'completed',
    'Rejected': 'rejected',
    'Closed': 'closed',
    'Cancelled': 'cancelled',
  };
  return statusMap[status] || 'draft';
};
