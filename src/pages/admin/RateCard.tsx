import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminDataTable, type ColumnDef } from "@/components/admin/AdminDataTable";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { exportTablePdf, exportTableCsv } from "@/lib/exportUtils";

const TRADE_NAMES: Record<number, string> = {
  1: "كهرباء عامة", 2: "سباكة", 3: "نجارة", 4: "ألمونيوم وزجاج",
  5: "تكييف وتبريد", 6: "غسالات/ثلاجات", 7: "مولدات وUPS", 8: "أنظمة أمنية",
  9: "أسقف معلقة", 10: "دهانات", 11: "أرضيات", 12: "حدادة",
  13: "لافتات إعلانية", 14: "تشطيبات", 15: "أعمال مدنية", 16: "عزل مائي وحراري",
  17: "أبواب أوتوماتيك", 18: "السلامة والحريق", 19: "هاند مان", 20: "صيانة وقائية",
};

export default function RateCard() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["rate-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rate_items").select("*").order("trade_id");
      if (error) throw error;
      return data;
    },
  });

  const avgHourly = items.length
    ? Math.round(items.reduce((s: number, i: any) => s + (i.normal_hourly || 0), 0) / items.length)
    : 0;

  const columns: ColumnDef<any>[] = [
    {
      key: "trade_id",
      header: "التخصص",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-sm">{TRADE_NAMES[row.trade_id] || `تخصص ${row.trade_id}`}</p>
          <p className="text-xs text-muted-foreground font-mono">#{row.trade_id}</p>
        </div>
      ),
    },
    {
      key: "notes",
      header: "ملاحظات",
      render: (row) => (
        <span className="text-xs text-muted-foreground max-w-[180px] truncate block">
          {row.notes || "-"}
        </span>
      ),
    },
    {
      key: "normal_hourly",
      header: "سعر الساعة",
      sortable: true,
      className: "text-center",
      render: (row) => (
        <span className="font-mono font-bold text-primary text-sm">{row.normal_hourly} ج.م</span>
      ),
    },
    {
      key: "after_hours_hourly",
      header: "بعد الدوام",
      sortable: true,
      className: "text-center",
      render: (row) => (
        <span className="font-mono text-amber-600 text-sm">{row.after_hours_hourly} ج.م</span>
      ),
    },
    {
      key: "min_billable_hours",
      header: "أقل ساعات",
      className: "text-center",
      render: (row) => <span className="text-sm">{row.min_billable_hours} ساعة</span>,
    },
    {
      key: "trip_charge",
      header: "رسم الانتقال",
      className: "text-center",
      render: (row) => <span className="font-mono text-sm">{row.trip_charge} ج.م</span>,
    },
    {
      key: "min_invoice",
      header: "أقل فاتورة",
      className: "text-center",
      render: (row) => (
        <Badge variant="secondary" className="font-mono text-xs">{row.min_invoice} ج.م</Badge>
      ),
    },
  ];

  const stats = [
    { label: "عدد التخصصات", value: items.length, color: "text-primary", icon: <DollarSign className="h-4 w-4 text-primary" /> },
    { label: "متوسط سعر الساعة", value: `${avgHourly} ج.م`, color: "text-amber-600" },
  ];

  const handleExportPdf = async (data: any[]) => {
    const headers = ["التخصص", "سعر الساعة", "بعد الدوام", "أقل ساعات", "رسم الانتقال", "أقل فاتورة"];
    const rows = data.map((i) => [
      TRADE_NAMES[i.trade_id] || `#${i.trade_id}`,
      `${i.normal_hourly} ج.م`, `${i.after_hours_hourly} ج.م`,
      `${i.min_billable_hours}`, `${i.trip_charge} ج.م`, `${i.min_invoice} ج.م`,
    ]);
    await exportTablePdf("بطاقة الأسعار", headers, rows, "rate-card.pdf");
  };

  const handleExportCsv = (data: any[]) => {
    const headers = ["التخصص", "سعر الساعة", "بعد الدوام", "أقل ساعات", "رسم الانتقال", "أقل فاتورة", "ملاحظات"];
    const rows = data.map((i) => [
      TRADE_NAMES[i.trade_id] || `#${i.trade_id}`,
      String(i.normal_hourly), String(i.after_hours_hourly),
      String(i.min_billable_hours), String(i.trip_charge), String(i.min_invoice), i.notes || "",
    ]);
    exportTableCsv(headers, rows, "rate-card.csv");
  };

  return (
    <div className="container mx-auto p-6">
      <AdminDataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        title="بطاقة الأسعار"
        subtitle="أسعار الخدمات حسب التخصص"
        icon={<DollarSign className="h-5 w-5" />}
        searchPlaceholder="بحث بالتخصص..."
        searchKeys={["notes"]}
        stats={stats}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        pageSize={50}
      />
    </div>
  );
}
