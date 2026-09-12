import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MrStatus } from "@/types/maintenance";

export interface RequestsCounts {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
}

const countBy = async (status?: MrStatus) => {
  let q = supabase
    .from("maintenance_requests")
    .select("id", { count: "exact", head: true });
  if (status) q = q.eq("status", status);
  const { count } = await q;
  return count || 0;
};

/**
 * أعداد الطلبات فقط (بدون تحميل الصفوف) — خفيف جداً ومناسب للشريط الجانبي والإحصائيات
 */
export function useRequestsCounts(withBreakdown = false) {
  const [counts, setCounts] = useState<RequestsCounts>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [total, open, inProgress, completed] = await Promise.all([
          countBy(),
          withBreakdown ? countBy("Open") : Promise.resolve(0),
          withBreakdown ? countBy("In Progress") : Promise.resolve(0),
          withBreakdown ? countBy("Completed") : Promise.resolve(0),
        ]);
        if (!active) return;
        setCounts({ total, open, inProgress, completed });
      } catch (err) {
        console.error("Error counting requests:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [withBreakdown]);

  return { counts, loading };
}
