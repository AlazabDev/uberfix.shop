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

  const fetchAll = useCallback(async () => {
    const [techRes, brRes, prRes, reqRes] = await Promise.all([
      supabase.rpc('get_public_technicians_for_map'),
      supabase.from('branch_locations').select('*').order('branch'),
      supabase.from('v_properties_for_map').select('*'),
      supabase.rpc('get_active_requests_for_map'),
    ]);
    setTechnicians((techRes.data as any[]) || []);
    setBranches(((brRes.data as any[]) || []).filter(b => b.latitude && b.longitude));
    setProperties((prRes.data as any[]) || []);
    setRequests((reqRes.data as any[]) || []);
    setLoading(false);
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

  return { technicians, branches, properties, requests, loading, refetch: fetchAll };
}
