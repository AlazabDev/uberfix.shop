import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, FileText, AlertTriangle, CheckCircle, Clock, XCircle, Filter, RefreshCw, X, ArrowLeft, Calendar, User } from "lucide-react";
import { useMaintenanceContracts, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, BILLING_TYPE_LABELS, type ContractStatus } from "@/hooks/useMaintenanceContracts";
import { ContractForm } from "@/components/contracts/ContractForm";
import { AppFooter } from "@/components/shared/AppFooter";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";

export default function ContractsList() {
  const navigate = useNavigate();
  const { contracts, loading, error, stats, refetch } = useMaintenanceContracts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filtered = contracts.filter(c => {
    const matchesSearch = !search || c.title.includes(search) || c.client_name.includes(search) || c.contract_number.includes(search);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus && (clientFilter === "all" || c.client_name === clientFilter) && (billingFilter === "all" || c.billing_type === billingFilter);
  });

  const getDaysLeft = (endDate: string) => differenceInDays(new Date(endDate), new Date());

  if (loading && !contracts.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-s-4 border-s-primary">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">إجمالي العقود</div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-success">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
            <div className="text-sm text-muted-foreground">نشط</div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{stats.expiringSoon}</span>
            </div>
            <div className="text-sm text-muted-foreground">قرب الانتهاء</div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{stats.expired}</span>
            </div>
            <div className="text-sm text-muted-foreground">منتهي</div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-primary">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">قيمة العقود النشطة</div>
          </CardContent>
        </Card>
      </div>

      {error && <div role="alert" className="border border-destructive/30 text-destructive p-4 rounded-md">تعذر تحميل العقود: {error}<Button variant="outline" onClick={refetch} className="ms-3">إعادة المحاولة</Button></div>}
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">عقود الصيانة</h1>
        <div className="flex gap-2"><Button variant="outline" size="icon" title="تحديث العقود" aria-label="تحديث العقود" disabled={loading} onClick={refetch}><RefreshCw className="h-4 w-4" /></Button><Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          عقد جديد
        </Button></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 border-y py-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالعنوان أو اسم العميل أو رقم العقد..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={clientFilter} onValueChange={setClientFilter}><SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="العميل" /></SelectTrigger><SelectContent><SelectItem value="all">جميع العملاء</SelectItem>{[...new Set(contracts.map(c => c.client_name).filter(Boolean))].map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select>
        <Select value={billingFilter} onValueChange={setBillingFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="نوع الفوترة" /></SelectTrigger><SelectContent><SelectItem value="all">جميع أنواع الفوترة</SelectItem>{Object.entries(BILLING_TYPE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
        <span className="text-sm text-muted-foreground">{filtered.length} عقد</span>
        {(search || statusFilter !== "all" || clientFilter !== "all" || billingFilter !== "all") && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setClientFilter("all"); setBillingFilter("all"); }}><X className="h-4 w-4 me-1" />مسح الفلاتر</Button>}
      </div>
      {/* Contracts List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد عقود {statusFilter !== "all" ? "بهذه الحالة" : ""}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(contract => {
            const daysLeft = getDaysLeft(contract.end_date);
            const isExpiringSoon = contract.status === "active" && daysLeft <= (contract.renewal_reminder_days || 30) && daysLeft > 0;

            return (
              <Card
                key={contract.id}
                className="hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{contract.title}</h3>
                        <Badge className={CONTRACT_STATUS_COLORS[contract.status]}>
                          {CONTRACT_STATUS_LABELS[contract.status]}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="border-warning text-warning-foreground gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            ينتهي خلال {daysLeft} يوم
                          </Badge>
                        )}
                        {contract.auto_renew && (
                          <Badge variant="outline" className="text-primary border-primary/30">تجديد تلقائي</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>رقم: {contract.contract_number}</span>
                        <span>العميل: {contract.client_name}</span>
                        <span>النوع: {BILLING_TYPE_LABELS[contract.billing_type]}</span>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="font-bold text-lg">{(contract.contract_value || 0).toLocaleString()} ج.م</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(contract.start_date), "d MMM yyyy", { locale: ar })} — {format(new Date(contract.end_date), "d MMM yyyy", { locale: ar })}
                      </div>
                      {contract.max_requests && (
                        <div className="text-xs text-muted-foreground">
                          الطلبات: {contract.used_requests || 0} / {contract.max_requests}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 justify-between" onClick={() => navigate(`/contracts/${contract.id}`)}>عرض تفاصيل العقد<ArrowLeft className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Contract Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء عقد صيانة جديد</DialogTitle>
          </DialogHeader>
          <ContractForm onSuccess={() => { setIsFormOpen(false); void refetch(); }} />
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
