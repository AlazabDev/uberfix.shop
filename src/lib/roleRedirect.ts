/**
 * Role-Based Redirect Logic
 * 
 * المعمارية الصحيحة لـ OAuth:
 * 1. Identity First: المستخدم يسجل دخول (بدون role)
 * 2. Detect Role: نجلب الدور من DB
 * 3. Smart Redirect: نوجه للـ dashboard المناسب
 */

import { supabase } from '@/integrations/supabase/client';
import { isAuthorizedOwner } from '@/config/owners';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'owner' | 'admin' | 'manager' | 'technician' | 'vendor' | 'customer' | 'staff' | 'dispatcher' | 'finance';
type OAuthIntent = 'login' | 'signup';

const OAUTH_CONTEXT_KEY = 'uberfix.oauth.context';

// خريطة التوجيه حسب الدور
const ROLE_DASHBOARDS: Record<UserRole, string> = {
  owner: '/dashboard',
  admin: '/dashboard',
  manager: '/dashboard',
  technician: '/technicians/dashboard',
  vendor: '/dashboard',
  customer: '/dashboard',
  staff: '/dashboard',
  dispatcher: '/dashboard',
  finance: '/dashboard',
};

// الصفحة الافتراضية للمستخدمين الجدد
const DEFAULT_DASHBOARD = '/dashboard';

// صفحة اختيار الدور للمستخدمين الجدد
export const ROLE_SELECTION_PATH = '/auth/confirm-role';

export interface DetectedUserRole {
  roles: UserRole[];
  primaryRole: UserRole | null;
  isNewUser: boolean;
  redirectPath: string;
}

interface PendingOAuthContext {
  intent: OAuthIntent;
  requestedRole?: string;
  createdAt: number;
}

const ALLOWED_PUBLIC_ROLES: UserRole[] = ['customer', 'technician', 'vendor'];

function normalizeRequestedRole(value?: string | null): UserRole | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (normalized === 'user' || normalized === 'business' || normalized === 'company') {
    return 'customer';
  }

  return ALLOWED_PUBLIC_ROLES.includes(normalized as UserRole)
    ? (normalized as UserRole)
    : null;
}

function buildResolvedRole(role: UserRole): DetectedUserRole {
  return {
    roles: [role],
    primaryRole: role,
    isNewUser: false,
    redirectPath: ROLE_DASHBOARDS[role] || DEFAULT_DASHBOARD,
  };
}

function getSafeProfileName(user: User, fallbackEmail?: string): string {
  const rawName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    fallbackEmail ||
    'UberFix User';

  return String(rawName).trim().slice(0, 120);
}

export async function ensureAuthenticatedUserOnboarding(
  requestedRole: UserRole = 'customer',
): Promise<DetectedUserRole> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError || new Error('Authentication required');
  }

  const safeRequestedRole = normalizeRequestedRole(requestedRole) || 'customer';
  const { data, error } = await (supabase as any).rpc('ensure_current_user_onboarding', {
    p_requested_role: safeRequestedRole,
    p_full_name: getSafeProfileName(user, user.email),
    p_phone: typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : null,
    p_avatar_url:
      typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : typeof user.user_metadata?.picture === 'string'
          ? user.user_metadata.picture
          : null,
  });

  if (error) throw error;

  const firstRow = Array.isArray(data) ? data[0] : data;
  const roles = ((firstRow?.roles || []) as string[]).filter(Boolean) as UserRole[];
  const primaryRole = (firstRow?.primary_role as UserRole | undefined) || determinePrimaryRole(roles);

  return {
    roles: roles.length ? roles : [primaryRole || 'customer'],
    primaryRole: primaryRole || 'customer',
    isNewUser: Boolean(firstRow?.is_new_user),
    redirectPath: ROLE_DASHBOARDS[primaryRole || 'customer'] || DEFAULT_DASHBOARD,
  };
}

function readPendingOAuthContext(): PendingOAuthContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.sessionStorage.getItem(OAUTH_CONTEXT_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as PendingOAuthContext;
    if (!parsed?.intent || !parsed?.createdAt) return null;

    if (Date.now() - parsed.createdAt > 10 * 60 * 1000) {
      window.sessionStorage.removeItem(OAUTH_CONTEXT_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function savePendingOAuthContext(intent: OAuthIntent, requestedRole?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: PendingOAuthContext = {
      intent,
      requestedRole,
      createdAt: Date.now(),
    };
    window.sessionStorage.setItem(OAUTH_CONTEXT_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save OAuth context:', error);
  }
}

export function clearPendingOAuthContext(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(OAUTH_CONTEXT_KEY);
  } catch (_e) { /* safe to ignore */ }
}

/**
 * اكتشاف دور المستخدم من قاعدة البيانات
 * يُستدعى بعد نجاح المصادقة
 */
export async function detectUserRole(userId: string, userEmail?: string): Promise<DetectedUserRole> {
  // التحقق من المالك المصرح له
  if (userEmail && isAuthorizedOwner(userEmail.toLowerCase())) {
    return {
      roles: ['owner'],
      primaryRole: 'owner',
      isNewUser: false,
      redirectPath: ROLE_DASHBOARDS.owner,
    };
  }

  try {
    // جلب الأدوار من جدول user_roles
    const { data: userRolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!rolesError && userRolesData && userRolesData.length > 0) {
      const roles = userRolesData.map(r => r.role as UserRole);
      const primaryRole = determinePrimaryRole(roles);
      
      return {
        roles,
        primaryRole,
        isNewUser: false,
        redirectPath: ROLE_DASHBOARDS[primaryRole] || DEFAULT_DASHBOARD,
      };
    }

    // لا نقرأ الأدوار من profiles نهائياً: user_roles هو المصدر الأمني الوحيد.
    return {
      roles: [],
      primaryRole: null,
      isNewUser: true,
      redirectPath: ROLE_SELECTION_PATH,
    };

  } catch (error) {
    console.error('Error detecting user role:', error);
    // في حالة الخطأ، نعتبره مستخدم جديد
    return {
      roles: [],
      primaryRole: null,
      isNewUser: true,
      redirectPath: ROLE_SELECTION_PATH,
    };
  }
}

/** مسار شاشة اختيار فئة الحساب (مرة واحدة فقط عند أول تسجيل) */
export const ONBOARDING_PATH = '/auth/confirm-role';

export interface OnboardingState {
  roles: UserRole[];
  primaryRole: UserRole;
  needsRoleSelection: boolean;
}

/** حالة الإعداد الأول للمستخدم الحالي — تُقرأ من الخادم (لا يُعتمد على التخزين المحلي) */
export async function getMyOnboardingState(): Promise<OnboardingState> {
  const { data, error } = await (supabase as any).rpc('get_my_onboarding_state');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const roles = ((row?.roles || []) as string[]).filter(Boolean) as UserRole[];
  return {
    roles,
    primaryRole: (row?.primary_role as UserRole) || determinePrimaryRole(roles),
    needsRoleSelection: Boolean(row?.needs_role_selection),
  };
}

/** إتمام اختيار الفئة لأول مرة (customer | technician | vendor). آمن للاستدعاء المتكرر — لا يغيّر شيئًا بعد أول مرة. */
export async function completeFirstTimeOnboarding(requestedRole: UserRole = 'customer'): Promise<DetectedUserRole> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const safeRole = normalizeRequestedRole(requestedRole) || 'customer';
  const { data, error } = await (supabase as any).rpc('complete_first_time_onboarding', {
    p_requested_role: safeRole,
    p_full_name: getSafeProfileName(user, user.email),
    p_phone: typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : (user.phone || null),
    p_avatar_url:
      typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : typeof user.user_metadata?.picture === 'string' ? user.user_metadata.picture : null,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  const roles = ((row?.roles || []) as string[]).filter(Boolean) as UserRole[];
  const primary = (row?.primary_role as UserRole) || determinePrimaryRole(roles);
  clearPendingOAuthContext();
  return {
    roles: roles.length ? roles : [primary],
    primaryRole: primary,
    isNewUser: Boolean(row?.is_new_user),
    redirectPath: ROLE_DASHBOARDS[primary] || DEFAULT_DASHBOARD,
  };
}

/** الفئة المطلوبة عند التسجيل (من جلسة OAuth/WhatsApp المعلّقة أو من user_metadata لتسجيل البريد) */
async function readRequestedRoleForSignup(): Promise<UserRole | null> {
  const pending = readPendingOAuthContext();
  const fromPending = pending?.intent === 'signup' ? normalizeRequestedRole(pending.requestedRole) : null;
  if (fromPending) return fromPending;

  const { data: { user } } = await supabase.auth.getUser();
  return normalizeRequestedRole(user?.user_metadata?.requested_role as string | undefined);
}

/**
 * الوجهة الواحدة بعد أي مصادقة (بريد / OAuth / WhatsApp):
 * - المالك المصرّح → لوحة التحكم مباشرة.
 * - مستخدم أكمل الإعداد → لوحة دوره (لا يُسأل عن الفئة مجددًا).
 * - أول دخول + فئة معروفة من التسجيل → تُحفظ تلقائيًا ثم توجيه.
 * - أول دخول بدون فئة → شاشة اختيار الفئة (مرة واحدة).
 */
export async function resolveUserRedirectAfterAuth(
  userId: string,
  userEmail?: string,
): Promise<DetectedUserRole> {
  if (userEmail && isAuthorizedOwner(userEmail.toLowerCase())) {
    clearPendingOAuthContext();
    return buildResolvedRole('owner');
  }

  let state: OnboardingState;
  try {
    state = await getMyOnboardingState();
  } catch (error) {
    console.error('Failed to read onboarding state:', error);
    const detected = await detectUserRole(userId, userEmail);
    return detected.isNewUser ? { ...detected, redirectPath: ONBOARDING_PATH } : detected;
  }

  if (!state.needsRoleSelection) {
    // تحديث بيانات الملف (اسم/صورة) دون تغيير الدور
    ensureAuthenticatedUserOnboarding(state.primaryRole).catch(() => undefined);
    clearPendingOAuthContext();
    return {
      roles: state.roles,
      primaryRole: state.primaryRole,
      isNewUser: false,
      redirectPath: ROLE_DASHBOARDS[state.primaryRole] || DEFAULT_DASHBOARD,
    };
  }

  const requested = await readRequestedRoleForSignup();
  if (requested) {
    try {
      return await completeFirstTimeOnboarding(requested);
    } catch (error) {
      console.error('Failed to complete first-time onboarding:', error);
    }
  }

  return { roles: state.roles, primaryRole: null, isNewUser: true, redirectPath: ONBOARDING_PATH };
}

/**
 * تحديد الدور الرئيسي من قائمة الأدوار
 * الأولوية: owner > admin > manager > technician > vendor > customer
 */
function determinePrimaryRole(roles: UserRole[]): UserRole {
  const priority: UserRole[] = ['owner', 'admin', 'manager', 'dispatcher', 'finance', 'staff', 'technician', 'vendor', 'customer'];
  
  for (const role of priority) {
    if (roles.includes(role)) {
      return role;
    }
  }
  
  return roles[0] || 'customer';
}

/**
 * الحصول على مسار التوجيه للدور المحدد
 */
export function getRoleRedirectPath(role: UserRole | null): string {
  if (!role) return DEFAULT_DASHBOARD;
  return ROLE_DASHBOARDS[role] || DEFAULT_DASHBOARD;
}

/**
 * التحقق مما إذا كان المسار يتطلب دور معين
 */
export function isRoleAllowedForPath(path: string, userRoles: UserRole[]): boolean {
  // المسارات العامة متاحة للجميع
  const publicPaths = ['/dashboard', '/profile', '/settings'];
  if (publicPaths.some(p => path.startsWith(p))) return true;
  
  // التحقق من المسارات الخاصة بالأدوار
  if (path.startsWith('/technician') && !userRoles.includes('technician') && !userRoles.includes('owner') && !userRoles.includes('admin')) {
    return false;
  }
  if (path.startsWith('/vendor') && !userRoles.includes('vendor') && !userRoles.includes('owner') && !userRoles.includes('admin')) {
    return false;
  }
  if (path.startsWith('/customer') && !userRoles.includes('customer') && !userRoles.includes('owner') && !userRoles.includes('admin')) {
    return false;
  }
  
  return true;
}
