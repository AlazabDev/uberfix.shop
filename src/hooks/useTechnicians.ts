import { useState, useEffect } from 'react';
import { supabase, supabaseReady } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Technician {
  id: string;
  name: string;
  email?: string | null;
  specialization: string;
  profile_image?: string | null;
  rating: number;
  total_reviews: number;
  status: 'online' | 'busy' | 'offline' | 'on_route';
  current_latitude?: number | null;
  current_longitude?: number | null;
  location_updated_at?: string | null;
  hourly_rate?: number | null;
  available_from?: string | null;
  available_to?: string | null;
  bio?: string | null;
  certifications?: any;
  service_area_radius?: number | null;
  is_active: boolean;
  is_verified: boolean;
}

export interface SpecializationIcon {
  id: string;
  name: string;
  name_ar: string;
  icon_path: string;
  color: string;
  sort_order: number;
}

export const useTechnicians = (filter?: { status?: string; specialization?: string }) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [specializationIcons, setSpecializationIcons] = useState<SpecializationIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // استخراج القيم من filter لتجنب infinite loop
  const filterStatus = filter?.status;
  const filterSpecialization = filter?.specialization;

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseReady) {
        setTechnicians([]);
        return;
      }

      const { data, error: dbError } = await supabase.rpc('get_public_technicians_for_map');

      if (dbError) throw dbError;

      const normalizedData: Technician[] = (((data as unknown as Omit<Technician, 'is_active'>[] | null) || [])
        .map((tech) => ({
          ...tech,
          is_active: true,
        })));

      const filteredData = normalizedData
        .filter((tech) => (filterStatus ? tech.status === filterStatus : true))
        .filter((tech) => (filterSpecialization ? tech.specialization === filterSpecialization : true))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));

      setTechnicians(filteredData);
    } catch (err) {
      console.error('Error fetching technicians:', err);
      setError(err as Error);
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecializationIcons = async () => {
    try {
      if (!supabaseReady) {
        setSpecializationIcons([]);
        return;
      }

      const { data, error: dbError } = await (supabase as any)
        .from('specialization_icons')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (dbError) throw dbError;
      setSpecializationIcons(data as SpecializationIcon[] || []);
    } catch (err) {
      console.error('Error fetching specialization icons:', err);
    }
  };

  useEffect(() => {
    fetchTechnicians();
    fetchSpecializationIcons();

    if (!supabaseReady) return;

    // إضافة realtime subscription
    const channel = supabase
      .channel('technicians-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'technicians' },
        () => {
          fetchTechnicians();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus, filterSpecialization]);

  return {
    technicians,
    specializationIcons,
    loading,
    error,
    refetch: fetchTechnicians,
  };
};
