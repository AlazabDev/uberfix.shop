import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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


      // Fetch all maintenance requests
      const { data: requests, error: fetchError } = await supabase
        .from('maintenance_requests')
        .select('id, status, workflow_stage, priority, estimated_cost, actual_cost, created_at');

      if (fetchError) throw fetchError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const requestsArray = requests || [];

      // Calculate statistics
      const totalRequests = requestsArray.length;
      const pendingRequests = requestsArray.filter(r => 
        r.status === 'Open' || r.status === 'On Hold' || r.status === 'Waiting' || r.workflow_stage === 'submitted'
      ).length;
      const completedRequests = requestsArray.filter(r => 
        r.status === 'Completed' || r.workflow_stage === 'completed'
      ).length;
      const todayRequests = requestsArray.filter(r => new Date(r.created_at) >= today).length;
      const monthRequests = requestsArray.filter(r => new Date(r.created_at) >= monthStart).length;

      const highPriority = requestsArray.filter(r => r.priority === 'high' || r.priority === 'urgent').length;
      const mediumPriority = requestsArray.filter(r => r.priority === 'medium').length;
      const lowPriority = requestsArray.filter(r => r.priority === 'low').length;

      const submitted = requestsArray.filter(r => r.workflow_stage === 'submitted').length;
      const assigned = requestsArray.filter(r => r.workflow_stage === 'assigned').length;
      const inProgress = requestsArray.filter(r => r.workflow_stage === 'in_progress').length;
      const workflowCompleted = requestsArray.filter(r => r.workflow_stage === 'completed').length;

      const totalBudget = requestsArray.reduce((sum, r) => sum + (Number(r.estimated_cost) || 0), 0);
      const actualCost = requestsArray.reduce((sum, r) => sum + (Number(r.actual_cost) || 0), 0);
      const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

      setStats({
        pending_requests: pendingRequests,
        today_requests: todayRequests,
        completed_requests: completedRequests,
        total_requests: totalRequests,
        this_month_requests: monthRequests,
        total_budget: totalBudget,
        actual_cost: actualCost,
        completion_rate: Math.round(completionRate),
        avg_completion_days: 0,
        high_priority_count: highPriority,
        medium_priority_count: mediumPriority,
        low_priority_count: lowPriority,
        submitted_count: submitted,
        assigned_count: assigned,
        in_progress_count: inProgress,
        workflow_completed_count: workflowCompleted,
        last_updated: new Date().toISOString(),
      });


    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err as Error);
      toast({
        title: "خطأ في تحميل الإحصائيات",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
        variant: "destructive",
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
