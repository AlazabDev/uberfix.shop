import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MapTechnician {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  status: string;
  current_latitude: number | null;
  current_longitude: number | null;
  location_updated_at?: string | null;
  phone?: string | null;
}

export interface MapBranch {
  id: string;
  branch: string;
  address: string | null;
  district: string | null;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
}

export interface MapProperty {
  id: string;
  code: string | null;
  name: string;
  type: string;
  status: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MapActiveRequest {
  id: string;
  request_number: string;
  workflow_stage: string;
  priority: string;
  latitude: number;
  longitude: number;
  customer_display: string;
  assigned_technician_id: string | null;
  branch_id: string | null;
  property_id: string | null;
  sla_due_date: string | null;
  is_sla_breached: boolean;
  created_at: string;
}

export function useServiceMapData() {
  const [technicians, setTechnicians] = useState<MapTechnician[]>([]);
  const [branches, setBranches] = useState<MapBranch[]>([]);
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [requests, setRequests] = useState<MapActiveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const queries = [
      supabase.rpc('get_public_technicians_for_map'),
      supabase.from('branch_locations').select('*').order('branch'),
      supabase.from('v_properties_for_map').select('*'),
      user ? supabase.rpc('get_active_requests_for_map') : Promise.resolve({ data: [], error: null }),
    ];

    try {
      const [techRes, brRes, prRes, reqRes] = await Promise.all(queries);
      const failures = [techRes.error, brRes.error, prRes.error, reqRes.error]
        .filter(Boolean)
        .map((error) => error?.message || 'تعذر تحميل إحدى طبقات الخريطة');

      setTechnicians((techRes.data as MapTechnician[] | null) || []);
      setBranches(((brRes.data as MapBranch[] | null) || []).filter((branch) =>
        Number.isFinite(Number(branch.latitude)) && Number.isFinite(Number(branch.longitude))
      ));
      setProperties(((prRes.data as MapProperty[] | null) || []).filter((property) =>
        Number.isFinite(Number(property.latitude)) && Number.isFinite(Number(property.longitude))
      ));
      setRequests(((reqRes.data as MapActiveRequest[] | null) || []).filter((request) =>
        Number.isFinite(Number(request.latitude)) && Number.isFinite(Number(request.longitude))
      ));
      setErrors(failures);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('service-map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technicians' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_requests' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  return { technicians, branches, properties, requests, loading, errors, refetch: fetchAll };
}
