import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, RefreshCw, Eye, Users } from "lucide-react";
import { AdminDataTable, type ColumnDef } from "@/components/admin/AdminDataTable";
import { NewVendorForm } from "@/components/forms/NewVendorForm";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { AppFooter } from "@/components/shared/AppFooter";

const statusLabels: Record<string, string> = { active: "نشط", available: "متاح", busy: "مشغول", offline: "غير متاح", suspended: "موقوف", pending: "قيد المراجعة" };
export default function Vendors() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { vendors, loading, error, refetch } = useVendors();
  const data = useMemo(() => vendors.map(v => ({ ...v, specialty: v.specialization?.join("، ") || "غير محدد" })), [vendors]);
  const columns: ColumnDef<Vendor>[] = [
    { key: "name", header: "الاسم", sortable: true, render: v => <span className="font-semibold">{v.name}</span> },
    { key: "company_name", header: "الشركة", sortable: true },
    { key: "specialty", header: "التخصص", sortable: true },
    { key: "phone", header: "الهاتف", render: v => <span dir="ltr">{v.phone || "—"}</span> },
    { key: "email", header: "البريد الإلكتروني", render: v => <span className="break-all" dir="ltr">{v.email || "—"}</span> },
    { key: "status", header: "الحالة", render: v => <Badge variant="outline" className={v.status === "active" || v.status === "available" ? "text-success border-success/30 bg-success/10" : "text-muted-foreground"}>{statusLabels[v.status || ""] || v.status || "غير محدد"}</Badge> },
    { key: "actions", header: "الإجراءات", render: v => <Button variant="ghost" size="icon" aria-label="عرض المورد" title="عرض المورد" onClick={e => { e.stopPropagation(); navigate(`/vendors/${v.id}`); }}><Eye className="h-4 w-4" /></Button> },
  ];
  return <div className="space-y-4 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="icon" aria-label="تحديث الموردين" title="تحديث الموردين" disabled={loading} onClick={refetch}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>
      <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />إضافة مورد</Button>
    </div>
    {error && <Alert variant="destructive"><AlertDescription>تعذر تحميل الموردين. {error}</AlertDescription></Alert>}
    <AdminDataTable data={data} columns={columns} title="الموردون" icon={<Users className="h-5 w-5" />} isLoading={loading} searchPlaceholder="بحث بالاسم أو الشركة أو التخصص..." searchKeys={["name", "company_name", "specialty", "phone", "email"]} filters={[
      { key: "specialty", label: "التخصص", options: [...new Set(data.map(v => v.specialty))].map(v => ({ value: v, label: v })) },
      { key: "status", label: "الحالة", options: [...new Set(data.map(v => v.status).filter((v): v is string => !!v))].map(v => ({ value: v, label: statusLabels[v] || v })) },
    ]} onRowClick={v => navigate(`/vendors/${v.id}`)} />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>إضافة مورد</DialogTitle></DialogHeader><NewVendorForm onClose={() => setOpen(false)} onSuccess={() => { setOpen(false); void refetch(); }} /></DialogContent></Dialog>
    <AppFooter />
  </div>;
}
