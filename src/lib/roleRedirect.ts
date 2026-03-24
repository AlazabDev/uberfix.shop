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
export const ROLE_SELECTION_PATH = '/role-selection';

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

function getSafeProfileEmail(user: User, fallbackEmail?: string): string {
  return user.email || fallbackEmail || `${user.id}@oauth.local`;
}

async function ensureProfileForAuthenticatedUser(
  user: User,
  fallbackEmail: string | undefined,
  role: UserRole,
): Promise<DetectedUserRole> {
  const fullName = getSafeProfileName(user, fallbackEmail);
  const email = getSafeProfileEmail(user, fallbackEmail);
  const phone =
    typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : null;
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === 'string'
        ? user.user_metadata.picture
        : null;

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email,
        name: fullName,
        full_name: fullName,
        phone,
        avatar_url: avatarUrl,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (error) {
    console.error('Failed to ensure profile after OAuth:', error);
  }

  return buildResolvedRole(role);
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

    // إذا لم يوجد في user_roles، تحقق من profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.role && profile.role !== 'owner') {
      const role = profile.role as UserRole;
      return {
        roles: [role],
        primaryRole: role,
        isNewUser: false,
        redirectPath: ROLE_DASHBOARDS[role] || DEFAULT_DASHBOARD,
      };
    }

    // مستخدم جديد بدون دور - يحتاج اختيار الدور
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

export async function resolveUserRedirectAfterAuth(
  userId: string,
  userEmail?: string,
): Promise<DetectedUserRole> {
  const detectedRole = await detectUserRole(userId, userEmail);
  if (!detectedRole.isNewUser) {
    clearPendingOAuthContext();
    return detectedRole;
  }

  const pendingContext = readPendingOAuthContext();
  const shouldAutoProvision =
    pendingContext?.intent === 'login' || !!normalizeRequestedRole(pendingContext?.requestedRole);

  if (!shouldAutoProvision) {
    return detectedRole;
  }

  const preferredRole = normalizeRequestedRole(pendingContext?.requestedRole) || 'customer';

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.id === userId) {
      const ensuredRole = await ensureProfileForAuthenticatedUser(user, userEmail, preferredRole);
      clearPendingOAuthContext();
      return ensuredRole;
    }
  } catch (error) {
    console.error('Failed to resolve OAuth onboarding:', error);
  }

  clearPendingOAuthContext();
  return buildResolvedRole(preferredRole);
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
