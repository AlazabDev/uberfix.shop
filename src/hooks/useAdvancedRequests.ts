import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MaintenanceRequest, MrStatus } from "@/types/maintenance";

export interface AdvancedRequestFiltersState {
  search: string;
  status: string;
  stage: string;
  priority: string;
  serviceType: string;
  categoryId: string;
  branchId: string;
  technicianId: string;
  location: string;
  dateFrom?: string;
  dateTo?: string;
  minCost: string;
  maxCost: string;
  rating: string;
  unpriced: boolean;
}

export const ALL_OPTION = "all";

export const emptyFilters: AdvancedRequestFiltersState = {
  search: "",
  status: ALL_OPTION,
  stage: ALL_OPTION,
  priority: ALL_OPTION,
  serviceType: ALL_OPTION,
  categoryId: ALL_OPTION,
  branchId: ALL_OPTION,
  technicianId: ALL_OPTION,
  location: "",
  dateFrom: undefined,
  dateTo: undefined,
  minCost: "",
  maxCost: "",
  rating: ALL_OPTION,
  unpriced: false,
};

const sel = (s: string): string => s;

interface Options {
  pageSize?: number;
}

/**
 * جلب طلبات الصيانة بفلترة وترقيم صفحات على الخادم
 * (يمنع تحميل آلاف الصفوف في المتصفح)
 */
export function useAdvancedRequests(
  filters: AdvancedRequestFiltersState,
  options: Options = {}
) {
  const pageSize = options.pageSize ?? 25;
  const [rows, setRows] = useState<MaintenanceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const filtersKey = JSON.stringify(filters);
  const requestId = useRef(0);

  useEffect(() => {
    setPage(0);
  }, [filtersKey]);

  const fetchRows = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try {
      let q = supabase
        .from("maintenance_requests")
        .select(sel("*"), { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (filters.status !== ALL_OPTION) q = q.eq("status", filters.status as MrStatus);
      if (filters.stage !== ALL_OPTION) q = q.eq("workflow_stage", filters.stage as never);
      if (filters.priority !== ALL_OPTION) q = q.eq("priority", filters.priority);
      if (filters.serviceType !== ALL_OPTION) q = q.eq("service_type", filters.serviceType);
      if (filters.categoryId !== ALL_OPTION) q = q.eq("category_id", filters.categoryId);
      if (filters.branchId !== ALL_OPTION) q = q.eq("branch_id", filters.branchId);
      if (filters.technicianId !== ALL_OPTION)
        q = q.eq("assigned_technician_id", filters.technicianId);
      if (filters.location.trim()) q = q.ilike("location", `%${filters.location.trim()}%`);
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo) q = q.lte("created_at", `${filters.dateTo.slice(0, 10)}T23:59:59`);
      if (filters.minCost) q = q.gte("actual_cost", Number(filters.minCost));
      if (filters.maxCost) q = q.lte("actual_cost", Number(filters.maxCost));
      if (filters.rating !== ALL_OPTION) q = q.gte("rating", Number(filters.rating));
      if (filters.unpriced) q = q.or("actual_cost.is.null,actual_cost.eq.0");
      if (filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        q = q.or(
          `request_number.ilike.${term},title.ilike.${term},description.ilike.${term},client_name.ilike.${term},client_phone.ilike.${term}`
        );
      }

      const { data, error: fetchError, count } = await q.returns<MaintenanceRequest[]>();
      if (current !== requestId.current) return;
      if (fetchError) throw fetchError;
      setRows(data || []);
      setTotal(count || 0);
      setError(null);
    } catch (err) {
      if (current !== requestId.current) return;
      console.error("Error fetching requests:", err);
      setError(err as Error);
      setRows([]);
      setTotal(0);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [filtersKey, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(fetchRows, 250);
    return () => clearTimeout(timer);
  }, [fetchRows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return useMemo(
    () => ({
      rows,
      total,
      page,
      totalPages,
      pageSize,
      loading,
      error,
      setPage,
      refetch: fetchRows,
    }),
    [rows, total, page, totalPages, pageSize, loading, error, fetchRows]
  );
}
