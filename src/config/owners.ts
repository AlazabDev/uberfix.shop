/**
 * ملف تكوين المالكين الثابت
 * هذا الملف يحتوي على قائمة المالكين المعتمدين الذين لهم كافة الصلاحيات
 * 
 * ⚠️ تحذير: لا تقم بتعديل هذا الملف إلا من قبل المالكين المعتمدين
 * التغييرات في هذا الملف تؤثر على نظام الصلاحيات الكامل
 * 
 * 🔒 أمان: هذه القائمة مُحمية ومُتزامنة مع قاعدة البيانات
 */

// ============================================
// قائمة المالكين المعتمدين - ثابتة لا تتغير
// ============================================
export const AUTHORIZED_OWNER_EMAILS: readonly string[] = [
  'admin@uberfix.shop',
  'manager@uberfix.shop',
  'uberfix@alazab.com',
  'admin@alazab.com',
  'mohamed@alazab.com',
  'magdy@alazab.com',
  'azab68320@gmail.com',
  'ceo@alazab.com',
  'uf@alazab.com',
  'devops@alazab.com',
  'manager@alazab.com',
  'api@alazab.com',
  'erp@alazab.com',
  'db@alazab.com'
] as const;

// ============================================
// أنماط النطاقات المعتمدة (wildcard) — أي بريد ينتهي بهذه النطاقات يُعتبر مالك
// ============================================
export const AUTHORIZED_OWNER_DOMAINS: readonly string[] = [
  '@uberfix.shop'
] as const;

// ============================================
// أنواع الأدوار في النظام
// ============================================
export type AppRole = 
  | 'owner'      // المالك - صلاحيات كاملة بدون قيود
  | 'admin'      // المدير - صلاحيات إدارية عالية
  | 'manager'    // المشرف - صلاحيات إشرافية
  | 'staff'      // الموظف - صلاحيات تشغيلية
  | 'technician' // الفني - صلاحيات العمل الميداني
  | 'vendor'     // المورد - صلاحيات محدودة
  | 'customer'   // العميل - صلاحيات أساسية
  | 'dispatcher' // المُوزع - صلاحيات التوزيع
  | 'finance';   // المالية - صلاحيات مالية

// ============================================
// تسميات الأدوار بالعربية
// ============================================
export const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'المالك',
  admin: 'المدير',
  manager: 'المشرف',
  staff: 'الموظف',
  technician: 'الفني',
  vendor: 'المورد',
  customer: 'العميل',
  dispatcher: 'المُوزع',
  finance: 'المالية'
};

// ============================================
// ألوان الأدوار للواجهة
// ============================================
export const ROLE_COLORS: Record<AppRole, string> = {
  owner: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  staff: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  technician: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  vendor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  customer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  dispatcher: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
};

// ============================================
// مستويات الصلاحيات (من الأعلى للأدنى)
// ============================================
export const ROLE_HIERARCHY: AppRole[] = [
  'owner',
  'admin',
  'manager',
  'finance',
  'dispatcher',
  'staff',
  'technician',
  'vendor',
  'customer'
];

// ============================================
// الأدوار الإدارية (لها صلاحيات عالية)
// ============================================
export const ADMIN_ROLES: AppRole[] = ['owner', 'admin', 'manager'];

// ============================================
// الأدوار التشغيلية
// ============================================
export const OPERATIONAL_ROLES: AppRole[] = ['staff', 'technician', 'dispatcher'];

// ============================================
// دوال المساعدة
// ============================================

/**
 * التحقق من أن البريد الإلكتروني هو مالك معتمد
 */
export function isAuthorizedOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (AUTHORIZED_OWNER_EMAILS.includes(normalized)) return true;
  return AUTHORIZED_OWNER_DOMAINS.some(domain => normalized.endsWith(domain.toLowerCase()));
}

/**
 * التحقق من أن الدور هو دور إداري
 */
export function isAdminRole(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * الحصول على مستوى الدور في التسلسل الهرمي
 */
export function getRoleLevel(role: AppRole): number {
  const index = ROLE_HIERARCHY.indexOf(role);
  return index === -1 ? ROLE_HIERARCHY.length : index;
}

/**
 * التحقق من أن دورًا أعلى من دور آخر
 */
export function isHigherRole(role1: AppRole, role2: AppRole): boolean {
  return getRoleLevel(role1) < getRoleLevel(role2);
}

/**
 * الحصول على تسمية الدور
 */
export function getRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role] || role;
}

/**
 * الحصول على لون الدور
 */
export function getRoleColor(role: AppRole): string {
  return ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
}
