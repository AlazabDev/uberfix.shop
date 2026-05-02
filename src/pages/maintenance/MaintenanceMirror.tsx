import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminDataTable, type ColumnDef, type FilterDef, type RangeFilterDef, type StatusTab } from "@/components/admin/AdminDataTable";
import { Eye, Activity, AlertTriangle, Archive, CheckCircle2, Clock, DollarSign, Star, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { exportTablePdf, exportTableCsv } from "@/lib/exportUtils";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

/**
 * 🪞 Maintenance Mirror Dashboard
 * مرآة مركز النظام — جدول واحد ضخم بفلاتر متقدمة
 * يعرض جميع طلبات الصيانة (نشطة + مؤرشفة + تاريخية)
 */

interface MirrorRow {
  id: string;
  request_number: string | null;
  title: string;
  description: string | null;
  status: string;
  workflow_stage: string | null;
  priority: string | null;
  service_type: string | null;
  channel: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  location: string | null;
  company_id: string | null;
  branch_id: string | null;
  assigned_vendor_id: string | null;
  assigned_technician_id: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  rating: number | null;
  created_at: string;
  updated_at: string | null;
  archived_at: string | null;
  sla_due_date: string | null;
  legacy_store_id: string | null;
  legacy_source: string | null;
  is_archived: boolean;
  is_sla_breached: boolean;
  is_legacy: boolean;
  age_days: number;
  branch_name: string | null;
  company_name: string | null;
}

const PAGE_BATCH = 1000;

async function fetchAllMirror(): Promise<MirrorRow[]> {
  const all: MirrorRow[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await (supabase as any)
      .from("v_maintenance_mirror")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_BATCH - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...(data as MirrorRow[]));
      offset += PAGE_BATCH;
      hasMore = data.length === PAGE_BATCH;
    } else {
      hasMore = false;
    }
  }
  return all;
}

const STAGE_LABELS: Record<string, string> = {
  submitted: "مُستلم",
  triaged: "تم الفرز",
  assigned: "مُعيَّن",
  accepted: "مقبول",
  en_route: "في الطريق",
  arrived: "وصل الفني",
  in_progress: "قيد التنفيذ",
  parts_needed: "بانتظار قطع غيار",
  completed: "مُنجز",
  handover_to_admin: "تسليم للإدارة",
  rated: "تم التقييم",
  closed: "مغلق",
  cancelled: "ملغى",
  on_hold: "معلق",
  reopened: "أعيد فتحه",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function MaintenanceMirror() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["maintenance-mirror-all"],
    queryFn: fetchAllMirror,
    staleTime: 30_000,
  });

  // Realtime updates on the underlying table
  useEffect(() => {
    const channel = supabase
      .channel("mirror-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests" }, () => {
        refetch();
      })
      .subscribe();
    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel));
    };
  }, [refetch]);

  // Build filter options dynamically from data
  const branchOptions = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((r) => {
      if (r.branch_id && r.branch_name) set.set(r.branch_id, r.branch_name);
    });
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const companyOptions = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((r) => {
      if (r.company_id && r.company_name) set.set(r.company_id, r.company_name);
    });
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const technicianOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.assigned_technician_id) set.add(r.assigned_technician_id); });
    return Array.from(set).map((id) => ({ value: id, label: id.slice(0, 8) }));
  }, [rows]);

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.channel) set.add(r.channel); });
    return Array.from(set).map((c) => ({ value: c, label: c }));
  }, [rows]);

  // KPIs
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => !r.is_archived).length;
    const archived = rows.filter((r) => r.is_archived).length;
    const breached = rows.filter((r) => r.is_sla_breached).length;
    const totalCost = rows.reduce((s, r) => s + (r.actual_cost || 0), 0);
    const ratedCount = rows.filter((r) => r.rating != null).length;
    const avgRating = ratedCount > 0
      ? (rows.reduce((s, r) => s + (r.rating || 0), 0) / ratedCount).toFixed(1)
      : "—";
    const legacy = rows.filter((r) => r.is_legacy).length;
    return [
      { label: "إجمالي الطلبات", value: total.toLocaleString(), color: "text-primary", icon: <Activity className="h-4 w-4 text-primary" /> },
      { label: "نشطة", value: active.toLocaleString(), color: "text-green-600", icon: <TrendingUp className="h-4 w-4 text-green-600" /> },
      { label: "مؤرشفة", value: archived.toLocaleString(), color: "text-slate-600", icon: <Archive className="h-4 w-4 text-slate-600" /> },
      { label: "تجاوز SLA", value: breached.toLocaleString(), color: "text-red-600", icon: <AlertTriangle className="h-4 w-4 text-red-600" /> },
      { label: "بيانات تاريخية", value: legacy.toLocaleString(), color: "text-amber-600", icon: <Clock className="h-4 w-4 text-amber-600" /> },
      { label: "إجمالي التكلفة", value: `${totalCost.toLocaleString()} ج.م`, color: "text-emerald-600", icon: <DollarSign className="h-4 w-4 text-emerald-600" /> },
      { label: "متوسط التقييم", value: String(avgRating), color: "text-yellow-600", icon: <Star className="h-4 w-4 text-yellow-600" /> },
      { label: "تم تقييمه", value: ratedCount.toLocaleString(), color: "text-purple-600", icon: <CheckCircle2 className="h-4 w-4 text-purple-600" /> },
    ];
  }, [rows]);

  // Status tabs (workflow stages grouped)
  const statusTabs: StatusTab[] = useMemo(() => {
    const counts = {
      all: rows.length,
      active: rows.filter((r) => !r.is_archived && r.workflow_stage !== "closed" && r.workflow_stage !== "cancelled").length,
      in_progress: rows.filter((r) => ["assigned", "accepted", "en_route", "arrived", "in_progress", "parts_needed"].includes(r.workflow_stage || "")).length,
      completed: rows.filter((r) => ["completed", "handover_to_admin", "rated"].includes(r.workflow_stage || "")).length,
      archived: rows.filter((r) => r.is_archived).length,
      sla_breach: rows.filter((r) => r.is_sla_breached).length,
      legacy: rows.filter((r) => r.is_legacy).length,
    };
    return [
      { key: "all", label: "الكل", count: counts.all },
      { key: "active", label: "نشط", count: counts.active },
      { key: "in_progress", label: "قيد التنفيذ", count: counts.in_progress },
      { key: "completed", label: "مكتمل", count: counts.completed },
      { key: "archived", label: "مؤرشف", count: counts.archived },
      { key: "sla_breach", label: "⚠ تجاوز SLA", count: counts.sla_breach },
      { key: "legacy", label: "تاريخي", count: counts.legacy },
    ];
  }, [rows]);

  // We add a virtual "_tab" field per row matching the active tab
  const enriched = useMemo(() => {
    return rows.map((r) => {
      let tab = "all";
      if (r.is_legacy) tab = "legacy";
      else if (r.is_sla_breached) tab = "sla_breach";
      else if (r.is_archived) tab = "archived";
      else if (["completed", "handover_to_admin", "rated"].includes(r.workflow_stage || "")) tab = "completed";
      else if (["assigned", "accepted", "en_route", "arrived", "in_progress", "parts_needed"].includes(r.workflow_stage || "")) tab = "in_progress";
      else tab = "active";
      return { ...r, _tab: tab };
    });
  }, [rows]);

  // Custom: AdminDataTable filters by exact equality on statusKey,
  // so we use a wrapper "_tab_all" that returns true for "all"
  // by injecting both the real tab and "all"
  const dataForTable = useMemo(() => enriched, [enriched]);

  const filters: FilterDef[] = [
    { key: "workflow_stage", label: "المرحلة", options: Object.entries(STAGE_LABELS).map(([v, l]) => ({ value: v, label: l })), allLabel: "كل المراحل" },
    { key: "priority", label: "الأولوية", options: Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l })), allLabel: "كل الأولويات" },
    { key: "branch_id", label: "الفرع", options: branchOptions, allLabel: "كل الفروع" },
    { key: "company_id", label: "الشركة", options: companyOptions, allLabel: "كل الشركات" },
    { key: "channel", label: "القناة", options: channelOptions.length > 0 ? channelOptions : [{ value: "web", label: "ويب" }], allLabel: "كل القنوات" },
    { key: "assigned_technician_id", label: "الفني", options: technicianOptions, allLabel: "كل الفنيين" },
  ];

  const rangeFilters: RangeFilterDef[] = [
    { key: "created_at", label: "نطاق تاريخ الإنشاء", type: "date" },
    { key: "actual_cost", label: "نطاق التكلفة الفعلية (ج.م)", type: "number", placeholderFrom: "أدنى", placeholderTo: "أعلى" },
    { key: "rating", label: "نطاق التقييم (1-5)", type: "number", placeholderFrom: "1", placeholderTo: "5" },
  ];

  const columns: ColumnDef<MirrorRow & { _tab: string }>[] = [
    {
      key: "request_number",
      header: "رقم الطلب",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-bold text-primary">{row.request_number || "—"}</span>
          {row.is_legacy && <Badge variant="outline" className="text-[10px] w-fit">تاريخي</Badge>}
        </div>
      ),
    },
    {
      key: "title",
      header: "العنوان / الوصف",
      render: (row) => (
        <div className="max-w-[300px]">
          <p className="text-sm font-medium truncate">{row.title}</p>
          {row.description && <p className="text-xs text-muted-foreground truncate">{row.description}</p>}
        </div>
      ),
    },
    {
      key: "client_name",
      header: "العميل",
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium">{row.client_name || "—"}</div>
          {row.client_phone && <div className="text-muted-foreground font-mono">{row.client_phone}</div>}
        </div>
      ),
    },
    {
      key: "branch_name",
      header: "الفرع",
      render: (row) => <span className="text-xs">{row.branch_name || "—"}</span>,
    },
    {
      key: "workflow_stage",
      header: "المرحلة",
      render: (row) => (
        <Badge variant="secondary" className="text-[11px]">
          {STAGE_LABELS[row.workflow_stage || ""] || row.workflow_stage || "—"}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "الأولوية",
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${PRIORITY_COLORS[row.priority || "medium"]}`}>
          {PRIORITY_LABELS[row.priority || "medium"]}
        </span>
      ),
    },
    {
      key: "actual_cost",
      header: "التكلفة",
      sortable: true,
      className: "text-left whitespace-nowrap",
      render: (row) => (
        <span className="font-mono text-xs font-bold">
          {(row.actual_cost || row.estimated_cost || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">ج.م</span>
        </span>
      ),
    },
    {
      key: "rating",
      header: "التقييم",
      sortable: true,
      render: (row) => row.rating ? (
        <div className="flex items-center gap-0.5">
          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
          <span className="text-xs font-bold">{row.rating}</span>
        </div>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: "is_sla_breached",
      header: "SLA",
      render: (row) => row.is_sla_breached ? (
        <Badge variant="destructive" className="text-[10px]">⚠ تجاوز</Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">✓</Badge>
      ),
    },
    {
      key: "created_at",
      header: "تاريخ الإنشاء",
      sortable: true,
      render: (row) => (
        <span className="text-xs whitespace-nowrap">
          {row.created_at ? format(new Date(row.created_at), "dd MMM yyyy", { locale: ar }) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "إجراء",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/maintenance/requests/${row.id}`);
          }}
          className="p-1.5 rounded hover:bg-primary/10 text-primary"
          title="عرض التفاصيل"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const handleExportCsv = (data: MirrorRow[]) => {
    const headers = ["رقم الطلب", "العنوان", "العميل", "الهاتف", "الفرع", "المرحلة", "الأولوية", "التكلفة", "التقييم", "تاريخ الإنشاء", "تاريخ الأرشفة"];
    const out = data.map((r) => [
      r.request_number || "",
      r.title,
      r.client_name || "",
      r.client_phone || "",
      r.branch_name || "",
      STAGE_LABELS[r.workflow_stage || ""] || r.workflow_stage || "",
      PRIORITY_LABELS[r.priority || "medium"],
      String(r.actual_cost || r.estimated_cost || 0),
      r.rating != null ? String(r.rating) : "",
      r.created_at || "",
      r.archived_at || "",
    ]);
    exportTableCsv(headers, out, `maintenance-mirror-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const handleExportPdf = async (data: MirrorRow[]) => {
    const headers = ["#", "رقم", "العنوان", "العميل", "الفرع", "المرحلة", "التكلفة", "التاريخ"];
    const out = data.map((r, i) => [
      String(i + 1),
      r.request_number || "",
      (r.title || "").slice(0, 40),
      r.client_name || "",
      r.branch_name || "",
      STAGE_LABELS[r.workflow_stage || ""] || "",
      String(r.actual_cost || r.estimated_cost || 0),
      r.created_at ? format(new Date(r.created_at), "dd/MM/yyyy") : "",
    ]);
    await exportTablePdf(`مرآة طلبات الصيانة (${data.length} طلب)`, headers, out, `maintenance-mirror-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
          🪞 مرآة مركز النظام
        </h1>
        <p className="text-sm text-muted-foreground">
          جميع طلبات الصيانة (نشطة + مؤرشفة + تاريخية) في عرض موحد بفلاتر متقدمة وتحديث لحظي
        </p>
      </div>

      <AdminDataTable
        data={dataForTable}
        columns={columns}
        isLoading={isLoading}
        title="جميع طلبات الصيانة"
        subtitle={`${rows.length.toLocaleString()} طلب — مصدر واحد للحقيقة`}
        icon={<Activity className="h-5 w-5" />}
        searchPlaceholder="بحث برقم الطلب، العنوان، العميل، الهاتف..."
        searchKeys={["request_number", "title", "description", "client_name", "client_phone", "client_email", "location"]}
        filters={filters}
        rangeFilters={rangeFilters}
        statusTabs={statusTabs}
        statusKey="_tab"
        stats={stats}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        pageSize={50}
        onRowClick={(row) => navigate(`/maintenance/requests/${row.id}`)}
      />
    </div>
  );
}