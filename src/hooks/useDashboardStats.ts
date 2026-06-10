import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateDashboardStats } from "@/lib/dashboardStats";

export interface DashboardStats {
  pending_requests: number;
  today_requests: number;
  completed_requests: number;
  total_requests: number;
  this_month_requests: number;
  total_budget: number;
  actual_cost: number;
  completion_rate: number;
  avg_completion_days: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  submitted_count: number;
  assigned_count: number;
  in_progress_count: number;
  workflow_completed_count: number;
  last_updated: string;
}


/**
 * Hook to calculate dashboard statistics from maintenance_requests
 */

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);


      // Fetch all maintenance requests with pagination to avoid 1000 row limit
      let allRequests: any[] = [];
      let page = 0;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data: batch, error: fetchError } = await supabase
          .from('maintenance_requests')
          .select('id, status, workflow_stage, priority, estimated_cost, actual_cost, created_at')
          .range(from, to);

        if (fetchError) throw fetchError;
        if (batch && batch.length > 0) {
          allRequests.push(...batch);
          hasMore = batch.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      const requests = allRequests;
      const calculatedStats = calculateDashboardStats(requests || []);

      setStats({
        ...calculatedStats,
        last_updated: new Date().toISOString(),
      });


    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err as Error);
      // Set zeroed stats so the dashboard still renders gracefully for
      // users who don't have permission to read maintenance_requests
      // (e.g. customers). Avoid noisy toast on RLS-filtered queries.
      setStats({
        pending_requests: 0,
        today_requests: 0,
        completed_requests: 0,
        total_requests: 0,
        this_month_requests: 0,
        total_budget: 0,
        actual_cost: 0,
        completion_rate: 0,
        avg_completion_days: 0,
        high_priority_count: 0,
        medium_priority_count: 0,
        low_priority_count: 0,
        submitted_count: 0,
        assigned_count: 0,
        in_progress_count: 0,
        workflow_completed_count: 0,
        last_updated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();


    // Refresh stats when maintenance requests change


    const channel = supabase
      .channel('dashboard-stats-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
