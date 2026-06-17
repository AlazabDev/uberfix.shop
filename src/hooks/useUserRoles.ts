import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  type AppRole, 
  AUTHORIZED_OWNER_EMAILS, 
  isAuthorizedOwner 
} from '@/config/owners';

export type { AppRole };

interface UserRoles {
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isTechnician: boolean;
  isVendor: boolean;
  isCustomer: boolean;
  isDispatcher: boolean;
  isFinance: boolean;
  isOwner: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasPermission: (resource: string, action: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useUserRoles = (): UserRoles => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      // Check if user is authorized owner using auth email directly (more reliable)
      const userEmail = user.email?.toLowerCase();
      
      if (isAuthorizedOwner(userEmail)) {
        setRoles(['owner']);
        setLoading(false);
        return;
      }

      // استخدام جدول user_roles بدلاً من profiles.role - أكثر أماناً
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!rolesError && userRolesData && userRolesData.length > 0) {
        // تحويل الأدوار وتصفية owner للمستخدمين غير المصرح لهم
        const fetchedRoles = userRolesData
          .map(r => r.role as AppRole)
          .filter(role => role !== 'owner'); // فقط المالكون المصرح لهم يحصلون على owner
        
        if (fetchedRoles.length > 0) {
          setRoles(fetchedRoles);
          setLoading(false);
          return;
        }
      }

      // user_roles هو مصدر الصلاحيات الوحيد؛ أي مستخدم جديد يبدأ كعميل فقط.
      setRoles(['customer']);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setRoles(['customer']);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserRoles();

    // الاستماع لتغييرات جدول user_roles
    const channel = supabase
      .channel('user-roles-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_roles'
        },
        () => {
          fetchUserRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUserRoles]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return checkRoles.some(role => roles.includes(role));
  };

  const hasPermission = async (resource: string, action: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const activeRoles = isAuthorizedOwner(user.email?.toLowerCase()) ? ['owner' as AppRole] : roles;
      if (!activeRoles.length) return false;

      const { data, error } = await supabase
        .from('role_permissions')
        .select('resource, action')
        .in('role', activeRoles)
        .eq('resource', resource)
        .eq('action', action);

      if (error) return false;
      return (data && data.length > 0) || false;
    } catch (error) {
      return false;
    }
  };

  return {
    roles,
    loading,
    isAdmin: hasRole('admin'),
    isManager: hasRole('manager'),
    isStaff: hasRole('staff'),
    isTechnician: hasRole('technician'),
    isVendor: hasRole('vendor'),
    isCustomer: hasRole('customer'),
    isDispatcher: hasRole('dispatcher'),
    isFinance: hasRole('finance'),
    isOwner: hasRole('owner'),
    hasRole,
    hasAnyRole,
    hasPermission,
    refetch: fetchUserRoles
  };
};
