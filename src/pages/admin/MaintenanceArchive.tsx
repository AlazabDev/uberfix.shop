import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminDataTable, type ColumnDef, type RangeFilterDef } from "@/components/admin/AdminDataTable";
import { Archive, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { exportTablePdf, exportTableCsv } from "@/lib/exportUtils";

// Fetch ALL rows using pagination to bypass 1000-row limit
async function fetchAllArchive() {
  const allData: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("maintenance_requests_archive")
      .select("*")
      .eq("is_deleted", false)
      .order("scheduled_date", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allData.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

export default function MaintenanceArchive() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["maintenance-archive-full"],
    queryFn: fetchAllArchive,
  });

  const totalCost = records.reduce((s: number, r: any) => s + (r.actual_cost || 0), 0);
  const completed = records.filter((r: any) => r.status === "completed").length;

  const columns: ColumnDef<any>[] = [
    {
      key: "description",
      header: "الوصف",
      sortable: true,
      render: (row) => (
        <div className="max-w-[350px]">
          <p className="text-sm truncate font-medium">{row.description || row.title || "-"}</p>
        </div>
      ),
    },
    {
      key: "actual_cost",
      header: "التكلفة الفعلية",
      sortable: true,
      className: "text-left whitespace-nowrap",
      render: (row) => (
        <span className="font-mono text-sm font-bold text-primary">
          {(row.actual_cost || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
        </span>
      ),
    },
    {
      key: "estimated_cost",
      header: "التكلفة التقديرية",
      sortable: true,
      className: "text-left whitespace-nowrap",
      render: (row) => (
        <span className="font-mono text-sm text-muted-foreground">
          {(row.estimated_cost || 0).toLocaleString()} ج.م
        </span>
      ),
    },
    {
      key: "scheduled_date",
      header: "تاريخ الجدولة",
      sortable: true,
      render: (row) => (
        <span className="text-xs whitespace-nowrap">
          {row.scheduled_date ? format(new Date(row.scheduled_date), "dd MMM yyyy", { locale: ar }) : "-"}
        </span>
      ),
    },
    {
      key: "completion_date",
      header: "تاريخ الإتمام",
      sortable: true,
      render: (row) => (
        <span className="text-xs whitespace-nowrap">
          {row.completion_date ? format(new Date(row.completion_date), "dd MMM yyyy", { locale: ar }) : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {row.status === "completed" ? "مكتمل" : row.status}
        </span>
      ),
    },
  ];

  // Range filters for meaningful filtering
  const rangeFilters: RangeFilterDef[] = [
    {
      key: "actual_cost",
      label: "نطاق التكلفة الفعلية (ج.م)",
      type: "number",
      placeholderFrom: "الحد الأدنى",
      placeholderTo: "الحد الأقصى",
    },
    {
      key: "scheduled_date",
      label: "نطاق تاريخ الجدولة",
      type: "date",
    },
    {
      key: "completion_date",
      label: "نطاق تاريخ الإتمام",
      type: "date",
    },
  ];

  const stats = [
    { label: "إجمالي الطلبات", value: records.length.toLocaleString(), color: "text-primary", icon: <Archive className="h-4 w-4 text-primary" /> },
    { label: "مكتملة", value: completed.toLocaleString(), color: "text-green-600", icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
    { label: "التكلفة الفعلية", value: `${totalCost.toLocaleString()} ج.م`, color: "text-amber-600", icon: <DollarSign className="h-4 w-4 text-amber-600" /> },
    { label: "متوسط التكلفة", value: `${records.length ? Math.round(totalCost / records.length).toLocaleString() : 0} ج.م`, color: "text-muted-foreground", icon: <Clock className="h-4 w-4 text-muted-foreground" /> },
  ];

  const handleExportPdf = async (data: any[]) => {
    const headers = ["#", "الوصف", "التكلفة الفعلية", "التكلفة التقديرية", "تاريخ الجدولة", "تاريخ الإتمام"];
    const rows = data.map((r, i) => [
      String(i + 1),
      (r.description || r.title || "").slice(0, 50),
      `${r.actual_cost || 0}`,
      `${r.estimated_cost || 0}`,
      r.scheduled_date ? format(new Date(r.scheduled_date), "dd/MM/yyyy") : "",
      r.completion_date ? format(new Date(r.completion_date), "dd/MM/yyyy") : "",
    ]);
    await exportTablePdf(`أرشيف طلبات الصيانة (${data.length} طلب)`, headers, rows, "maintenance-archive.pdf");
  };

  const handleExportCsv = (data: any[]) => {
    const headers = ["الوصف", "التكلفة الفعلية", "التكلفة التقديرية", "الحالة", "تاريخ الجدولة", "تاريخ الإتمام"];
    const rows = data.map((r) => [
      r.description || r.title || "",
      String(r.actual_cost || 0),
      String(r.estimated_cost || 0),
      r.status || "",
      r.scheduled_date || "",
      r.completion_date || "",
    ]);
    exportTableCsv(headers, rows, "maintenance-archive.csv");
  };

  return (
    <div className="container mx-auto p-6">
      <AdminDataTable
        data={records}
        columns={columns}
        isLoading={isLoading}
        title="أرشيف طلبات الصيانة"
        subtitle={`${records.length.toLocaleString()} طلب مؤرشف — التكلفة الإجمالية: ${totalCost.toLocaleString()} ج.م`}
        icon={<Archive className="h-5 w-5" />}
        searchPlaceholder="بحث في الوصف..."
        searchKeys={["description", "title"]}
        rangeFilters={rangeFilters}
        stats={stats}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        pageSize={50}
      />
    </div>
  );
}
