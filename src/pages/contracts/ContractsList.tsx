import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, FileText, AlertTriangle, CheckCircle, Clock, XCircle, Filter } from "lucide-react";
import { useMaintenanceContracts, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, BILLING_TYPE_LABELS, type ContractStatus } from "@/hooks/useMaintenanceContracts";
import { ContractForm } from "@/components/contracts/ContractForm";
import { AppFooter } from "@/components/shared/AppFooter";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";

export default function ContractsList() {
  const navigate = useNavigate();
  const { contracts, loading, stats } = useMaintenanceContracts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filtered = contracts.filter(c => {
    const matchesSearch = !search || c.title.includes(search) || c.client_name.includes(search) || c.contract_number.includes(search);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDaysLeft = (endDate: string) => differenceInDays(new Date(endDate), new Date());

  if (loading) {
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
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">إجمالي العقود</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
            <div className="text-sm text-muted-foreground">نشط</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.expiringSoon}</span>
            </div>
            <div className="text-sm text-muted-foreground">قرب الانتهاء</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats.expired}</span>
            </div>
            <div className="text-sm text-muted-foreground">منتهي</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">قيمة العقود النشطة</div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">عقود الصيانة</h1>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          عقد جديد
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
          <SelectTrigger className="w-[180px]">
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

      {/* Contracts List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد عقود {statusFilter !== "all" ? "بهذه الحالة" : ""}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(contract => {
            const daysLeft = getDaysLeft(contract.end_date);
            const isExpiringSoon = contract.status === "active" && daysLeft <= (contract.renewal_reminder_days || 30) && daysLeft > 0;

            return (
              <Card
                key={contract.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/contracts/${contract.id}`)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{contract.title}</h3>
                        <Badge className={CONTRACT_STATUS_COLORS[contract.status]}>
                          {CONTRACT_STATUS_LABELS[contract.status]}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            ينتهي خلال {daysLeft} يوم
                          </Badge>
                        )}
                        {contract.auto_renew && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">تجديد تلقائي</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>رقم: {contract.contract_number}</span>
                        <span>العميل: {contract.client_name}</span>
                        <span>النوع: {BILLING_TYPE_LABELS[contract.billing_type]}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right space-y-1">
                      <div className="font-bold text-lg">{(contract.contract_value || 0).toLocaleString()} ج.م</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(contract.start_date), "d MMM yyyy", { locale: ar })} → {format(new Date(contract.end_date), "d MMM yyyy", { locale: ar })}
                      </div>
                      {contract.max_requests && (
                        <div className="text-xs text-muted-foreground">
                          الطلبات: {contract.used_requests || 0} / {contract.max_requests}
                        </div>
                      )}
                    </div>
                  </div>
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
          <ContractForm onSuccess={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
