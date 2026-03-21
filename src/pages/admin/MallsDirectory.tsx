import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminDataTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminDataTable";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";
import { exportTablePdf, exportTableCsv } from "@/lib/exportUtils";

export default function MallsDirectory() {
  const { data: malls = [], isLoading } = useQuery({
    queryKey: ["malls"],
    queryFn: async () => {
      const { data, error } = await supabase.from("malls").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const types = [...new Set(malls.map((m: any) => m.type).filter(Boolean))];
  const typeCounts = types.reduce((acc, t) => {
    acc[t as string] = malls.filter((m: any) => m.type === t).length;
    return acc;
  }, {} as Record<string, number>);

  const columns: ColumnDef<any>[] = [
    {
      key: "name",
      header: "اسم المول",
      sortable: true,
      render: (row) => <span className="font-semibold text-sm">{row.name}</span>,
    },
    {
      key: "location",
      header: "الموقع",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1 max-w-[350px] truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          {row.location || "غير محدد"}
        </span>
      ),
    },
    {
      key: "type",
      header: "النوع",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className="text-xs">{row.type || "مول"}</Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "type",
      label: "النوع",
      options: types.map((t) => ({ value: t as string, label: `${t} (${typeCounts[t as string]})` })),
    },
  ];

  const statusTabs = types.slice(0, 8).map((t) => ({
    key: t as string,
    label: t as string,
    count: typeCounts[t as string],
  }));

  const stats = [
    { label: "إجمالي المولات", value: malls.length, color: "text-primary", icon: <Building2 className="h-4 w-4 text-primary" /> },
    { label: "أنواع التصنيف", value: types.length, color: "text-amber-600" },
  ];

  const handleExportPdf = async (data: any[]) => {
    const headers = ["الاسم", "الموقع", "النوع"];
    const rows = data.map((m) => [m.name || "", m.location || "", m.type || ""]);
    await exportTablePdf("دليل المولات والمراكز التجارية", headers, rows, "malls-directory.pdf");
  };

  const handleExportCsv = (data: any[]) => {
    const headers = ["الاسم", "الموقع", "النوع"];
    const rows = data.map((m) => [m.name || "", m.location || "", m.type || ""]);
    exportTableCsv(headers, rows, "malls-directory.csv");
  };

  return (
    <div className="container mx-auto p-6">
      <AdminDataTable
        data={malls}
        columns={columns}
        isLoading={isLoading}
        title="دليل المولات والمراكز التجارية"
        subtitle={`${malls.length} مول مسجل`}
        icon={<Building2 className="h-5 w-5" />}
        searchPlaceholder="بحث بالاسم أو الموقع..."
        searchKeys={["name", "location"]}
        filters={filters}
        statusTabs={statusTabs}
        statusKey="type"
        stats={stats}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
      />
    </div>
  );
}
