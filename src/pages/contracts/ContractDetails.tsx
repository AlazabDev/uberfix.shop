import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, FileText, Settings, Calendar, DollarSign, ClipboardList, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useMaintenanceContracts, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, BILLING_TYPE_LABELS } from "@/hooks/useMaintenanceContracts";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { ContractForm } from "@/components/contracts/ContractForm";
import { AppFooter } from "@/components/shared/AppFooter";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ContractDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contracts, loading, deleteContract } = useMaintenanceContracts();
  const { requests } = useMaintenanceRequests();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const contract = useMemo(() => contracts.find(c => c.id === id) || null, [id, contracts]);

  const linkedRequests = useMemo(() => {
    if (!contract) return [];
    return requests.filter((r: any) => r.contract_id === contract.id);
  }, [contract, requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">لم يتم العثور على العقد</p>
          <Button onClick={() => navigate("/contracts")} className="mt-4 gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة للعقود
          </Button>
        </Card>
      </div>
    );
  }

  const daysLeft = differenceInDays(new Date(contract.end_date), new Date());
  const totalDays = differenceInDays(new Date(contract.end_date), new Date(contract.start_date));
  const progressPercent = totalDays > 0 ? Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100)) : 100;
  const requestUsagePercent = contract.max_requests ? ((contract.used_requests || 0) / contract.max_requests) * 100 : 0;

  const handleDelete = async () => {
    await deleteContract(contract.id);
    navigate("/contracts");
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="outline" onClick={() => navigate("/contracts")} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة للعقود
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            تعديل
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد من حذف هذا العقد؟</AlertDialogTitle>
                <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Contract Title + Status */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{contract.title}</h1>
          <Badge className={CONTRACT_STATUS_COLORS[contract.status]}>
            {CONTRACT_STATUS_LABELS[contract.status]}
          </Badge>
          {daysLeft <= (contract.renewal_reminder_days || 30) && daysLeft > 0 && contract.status === "active" && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1">
              <AlertTriangle className="h-3 w-3" />
              ينتهي خلال {daysLeft} يوم
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">رقم العقد: {contract.contract_number}</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1 text-xs sm:text-sm">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">الطلبات ({linkedRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">المالي</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">الإعدادات</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">بيانات العميل</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الاسم:</span><span>{contract.client_name}</span></div>
                {contract.client_phone && <div className="flex justify-between"><span className="text-muted-foreground">الهاتف:</span><span dir="ltr">{contract.client_phone}</span></div>}
                {contract.client_email && <div className="flex justify-between"><span className="text-muted-foreground">البريد:</span><span dir="ltr">{contract.client_email}</span></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">مدة العقد</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">من:</span>
                  <span>{format(new Date(contract.start_date), "d MMMM yyyy", { locale: ar })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">إلى:</span>
                  <span>{format(new Date(contract.end_date), "d MMMM yyyy", { locale: ar })}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>التقدم الزمني</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} />
                </div>
                {daysLeft > 0 ? (
                  <p className="text-sm text-muted-foreground">متبقي {daysLeft} يوم</p>
                ) : (
                  <p className="text-sm text-destructive font-medium">منتهي منذ {Math.abs(daysLeft)} يوم</p>
                )}
              </CardContent>
            </Card>

            {contract.max_requests && (
              <Card>
                <CardHeader><CardTitle className="text-base">استهلاك الطلبات</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المستخدم / الحد الأقصى:</span>
                    <span className="font-bold">{contract.used_requests || 0} / {contract.max_requests}</span>
                  </div>
                  <Progress value={requestUsagePercent} className={requestUsagePercent > 80 ? "[&>div]:bg-destructive" : ""} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">SLA</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">وقت الاستجابة:</span>
                  <span>{contract.sla_response_hours} ساعة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">وقت الحل:</span>
                  <span>{contract.sla_resolution_hours} ساعة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">يشمل قطع الغيار:</span>
                  <span>{contract.includes_parts ? "نعم" : "لا"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {contract.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">الوصف</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{contract.description}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {linkedRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد طلبات مرتبطة بهذا العقد بعد</p>
              <p className="text-xs text-muted-foreground mt-1">سيتم ربط الطلبات تلقائياً عند إنشائها ضمن هذا العقد</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedRequests.map((req: any) => (
                <Card key={req.id} className="hover:shadow-sm cursor-pointer" onClick={() => navigate(`/requests/${req.id}`)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{req.title}</p>
                      <p className="text-sm text-muted-foreground">{req.client_name} · {format(new Date(req.created_at), "d MMM yyyy", { locale: ar })}</p>
                    </div>
                    <Badge>{req.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{(contract.contract_value || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">قيمة العقد (ج.م)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{contract.discount_percentage || 0}%</div>
                <div className="text-sm text-muted-foreground">نسبة الخصم</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{BILLING_TYPE_LABELS[contract.billing_type]}</div>
                <div className="text-sm text-muted-foreground">نوع الفوترة</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">إعدادات التجديد</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">تجديد تلقائي:</span>
                <span>{contract.auto_renew ? "مفعل" : "معطل"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تنبيه قبل الانتهاء:</span>
                <span>{contract.renewal_reminder_days} يوم</span>
              </div>
            </CardContent>
          </Card>
          {contract.terms_and_conditions && (
            <Card>
              <CardHeader><CardTitle className="text-base">الشروط والأحكام</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{contract.terms_and_conditions}</p></CardContent>
            </Card>
          )}
          {contract.internal_notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">ملاحظات داخلية</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{contract.internal_notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل العقد</DialogTitle>
          </DialogHeader>
          <ContractForm contract={contract} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
