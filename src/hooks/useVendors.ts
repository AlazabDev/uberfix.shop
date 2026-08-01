import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLegacy } from '@/integrations/supabase/client';

export interface Vendor {
  id: string;
  name: string;
  company_name?: string;
  specialization?: string[];
  phone?: string;
  email?: string;
  address?: string;
  rating?: number;
  status?: string;
  unit_rate?: number;
  experience_years?: number;
  profile_image?: string;
  total_jobs?: number;
  created_at: string;
  updated_at: string;
}

export const useVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('vendors-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vendors' },
        () => {
          fetchVendors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVendors = async () => {
    try {
      // RLS policies handle access control - no client-side filtering needed
      const { data, error } = await supabaseLegacy.from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors((data || []) as Vendor[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const addVendor = async (vendorData: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabaseLegacy.from('vendors')
        .insert([vendorData])
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطأ في إضافة المورد' };
    }
  };

  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    try {
      const { data, error } = await supabaseLegacy.from('vendors')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطأ في تحديث المورد' };
    }
  };

  return { vendors, loading, error, addVendor, updateVendor, refetch: fetchVendors };
};
