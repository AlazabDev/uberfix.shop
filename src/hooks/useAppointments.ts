import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLegacy } from '@/integrations/supabase/client';

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  property_id?: string;
  vendor_id?: string;
  maintenance_request_id?: string;
  location?: string;
  notes?: string;
  reminder_sent: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Related data
  properties?: { name: string; address: string };
  vendors?: { name: string; specialization: string[] };
}

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      // استخدم View آمن لتجنب إرجاع أعمدة حساسة/غير لازمة (مثل *_enc)
      const { data, error} = await supabaseLegacy.from('appointments_safe')
        .select(`
          id,
          title,
          description,
          customer_name,
          customer_phone,
          customer_email,
          appointment_date,
          appointment_time,
          duration_minutes,
          status,
          property_id,
          vendor_id,
          maintenance_request_id,
          location,
          notes,
          reminder_sent,
          created_by,
          created_at,
          updated_at,
          property_name,
          property_address,
          vendor_name,
          vendor_specialization
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      const mapped = (data || []).map((row: any) => {
        const appointment: Appointment = {
          id: row.id,
          title: row.title,
          description: row.description ?? undefined,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone ?? undefined,
          customer_email: row.customer_email ?? undefined,
          appointment_date: row.appointment_date,
          appointment_time: row.appointment_time,
          duration_minutes: row.duration_minutes,
          status: row.status,
          property_id: row.property_id ?? undefined,
          vendor_id: row.vendor_id ?? undefined,
          maintenance_request_id: row.maintenance_request_id ?? undefined,
          location: row.location ?? undefined,
          notes: row.notes ?? undefined,
          reminder_sent: !!row.reminder_sent,
          created_by: row.created_by ?? undefined,
          created_at: row.created_at,
          updated_at: row.updated_at,
          properties: row.property_name
            ? { name: row.property_name, address: row.property_address || '' }
            : undefined,
          vendors: row.vendor_name
            ? { name: row.vendor_name, specialization: row.vendor_specialization || [] }
            : undefined,
        };

        return appointment;
      });

      setAppointments(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'properties' | 'vendors'>) => {
    try {
      const { data, error } = await supabaseLegacy.from('appointments')
        .insert([appointmentData])
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطأ في إضافة الموعد' };
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const { data, error } = await supabaseLegacy.from('appointments')
        .update(updates as any)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطأ في تحديث الموعد' };
    }
  };

  return { appointments, loading, error, addAppointment, updateAppointment, refetch: fetchAppointments };
};
