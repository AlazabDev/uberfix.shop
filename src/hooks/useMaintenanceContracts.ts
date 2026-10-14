import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ContractRow = Database["public"]["Tables"]["maintenance_contracts"]["Row"];
type ContractInsert = Database["public"]["Tables"]["maintenance_contracts"]["Insert"];
type ContractUpdate = Database["public"]["Tables"]["maintenance_contracts"]["Update"];

export type MaintenanceContract = ContractRow;
export type ContractStatus = Database["public"]["Enums"]["contract_status"];
export type ContractBillingType = Database["public"]["Enums"]["contract_billing_type"];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "مسودة",
  active: "نشط",
  expired: "منتهي",
  suspended: "معلق",
  cancelled: "ملغي",
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success",
  expired: "bg-destructive/10 text-destructive",
  suspended: "bg-warning/15 text-warning-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export const BILLING_TYPE_LABELS: Record<ContractBillingType, string> = {
  per_request: "حسب الطلب",
  monthly: "شهري",
  quarterly: "ربع سنوي",
  semi_annual: "نصف سنوي",
  annual: "سنوي",
};

export function useMaintenanceContracts() {
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setContracts([]); return; }

      const { data, error } = await supabase
        .from("maintenance_contracts")
        .select("*")
        .order("created_at", { ascending: false }).limit(1000);

      if (error) throw error;
      setContracts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل العقود");
      toast.error("خطأ في تحميل العقود");
    } finally {
      setLoading(false);
    }
  };

  const createContract = async (data: Omit<ContractInsert, "company_id" | "created_by">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("يجب تسجيل الدخول");

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.company_id) throw new Error("لا يوجد شركة مرتبطة");

    const { data: result, error } = await supabase
      .from("maintenance_contracts")
      .insert({ ...data, company_id: profile.company_id, created_by: user.id })
      .select()
      .maybeSingle();

    if (error) throw error;
    toast.success("تم إنشاء العقد بنجاح");
    await fetchContracts();
    return result;
  };

  const updateContract = async (id: string, updates: ContractUpdate) => {
    const { error } = await supabase
      .from("maintenance_contracts")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    toast.success("تم تحديث العقد بنجاح");
    await fetchContracts();
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase
      .from("maintenance_contracts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    toast.success("تم حذف العقد بنجاح");
    await fetchContracts();
  };

  useEffect(() => {
    fetchContracts();

    const channel = supabase
      .channel("contracts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_contracts" }, () => {
        fetchContracts();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Computed stats
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === "active").length,
    expiringSoon: contracts.filter(c => {
      if (c.status !== "active") return false;
      const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft <= (c.renewal_reminder_days || 30) && daysLeft > 0;
    }).length,
    expired: contracts.filter(c => c.status === "expired").length,
    totalValue: contracts.filter(c => c.status === "active").reduce((sum, c) => sum + (c.contract_value || 0), 0),
  };

  return { contracts, loading, error, stats, createContract, updateContract, deleteContract, refetch: fetchContracts };
}
