import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminDataTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, MapPin, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { exportTablePdf, exportTableCsv } from "@/lib/exportUtils";

export default function StoresDirectory() {
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const categories = [...new Set(stores.map((s: any) => s.category).filter(Boolean))];

  const columns: ColumnDef<any>[] = [
    {
      key: "name",
      header: "اسم الفرع",
      sortable: true,
      render: (row) => <span className="font-semibold text-sm">{row.name}</span>,
    },
    {
      key: "location",
      header: "الموقع",
      render: (row) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1 max-w-[280px] truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          {row.location || "-"}
        </span>
      ),
    },
    {
      key: "category",
      header: "التصنيف",
      sortable: true,
      render: (row) => <Badge variant="outline" className="text-xs">{row.category || "عام"}</Badge>,
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => (
        <Badge variant={row.status === "active" ? "default" : "secondary"} className="text-xs gap-1">
          {row.status === "active" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {row.status === "active" ? "نشط" : "غير نشط"}
        </Badge>
      ),
    },
    {
      key: "phone",
      header: "الهاتف",
      render: (row) => <span className="text-sm font-mono">{row.phone || "-"}</span>,
    },
    {
      key: "map_url",
      header: "خريطة",
      className: "text-center w-16",
      render: (row) =>
        row.map_url ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a href={row.map_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null,
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "category",
      label: "التصنيف",
      options: categories.map((c) => ({ value: c as string, label: c as string })),
    },
    {
      key: "status",
      label: "الحالة",
      options: [
        { value: "active", label: "نشط" },
        { value: "inactive", label: "غير نشط" },
      ],
    },
  ];

  const statusTabs = [
    { key: "active", label: "نشط", count: stores.filter((s: any) => s.status === "active").length },
    { key: "inactive", label: "غير نشط", count: stores.filter((s: any) => s.status !== "active").length },
  ];

  const stats = [
    { label: "إجمالي الفروع", value: stores.length, color: "text-primary", icon: <Store className="h-4 w-4 text-primary" /> },
    { label: "نشط", value: stores.filter((s: any) => s.status === "active").length, color: "text-green-600", icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
    { label: "غير نشط", value: stores.filter((s: any) => s.status !== "active").length, color: "text-muted-foreground", icon: <XCircle className="h-4 w-4 text-muted-foreground" /> },
    { label: "التصنيفات", value: categories.length, color: "text-amber-600" },
  ];

  const handleExportPdf = async (data: any[]) => {
    const headers = ["الاسم", "الموقع", "التصنيف", "الحالة", "الهاتف"];
    const rows = data.map((s) => [s.name || "", s.location || "", s.category || "عام", s.status === "active" ? "نشط" : "غير نشط", s.phone || ""]);
    await exportTablePdf("دليل الفروع والمتاجر", headers, rows, "stores-directory.pdf");
  };

  const handleExportCsv = (data: any[]) => {
    const headers = ["الاسم", "الموقع", "التصنيف", "الحالة", "الهاتف", "البريد"];
    const rows = data.map((s) => [s.name || "", s.location || "", s.category || "", s.status || "", s.phone || "", s.email || ""]);
    exportTableCsv(headers, rows, "stores-directory.csv");
  };

  return (
    <div className="container mx-auto p-6">
      <AdminDataTable
        data={stores}
        columns={columns}
        isLoading={isLoading}
        title="دليل الفروع والمتاجر"
        subtitle={`${stores.length} فرع مسجل`}
        icon={<Store className="h-5 w-5" />}
        searchPlaceholder="بحث بالاسم أو الموقع..."
        searchKeys={["name", "location", "phone"]}
        filters={filters}
        statusTabs={statusTabs}
        statusKey="status"
        stats={stats}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
      />
    </div>
  );
}
