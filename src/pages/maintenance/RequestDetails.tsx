import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, FileText, Settings, Package, CheckSquare, FileBarChart, Archive, AlertCircle, Clock, MessageCircle } from "lucide-react";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { MaintenanceRequestDetails } from "@/components/maintenance/MaintenanceRequestDetails";
import { RequestWorkflowControls } from "@/components/maintenance/RequestWorkflowControls";
import { WorkflowDiagram } from "@/components/workflow/WorkflowDiagram";
import { WorkflowTimeline } from "@/components/requests/WorkflowTimeline";
import { ApprovalManager } from "@/components/workflow/ApprovalManager";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppFooter } from "@/components/shared/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, loading, updateRequest, refetch } = useMaintenanceRequests();
  const [activeTab, setActiveTab] = useState("overview");
  const [lifecycleEvents, setLifecycleEvents] = useState<any[]>([]);
  const request = useMemo(() => {
    if (!id || requests.length === 0) return null;
    return requests.find(r => r.id === id) || null;
  }, [id, requests]);

  const handleArchive = async () => {
    if (!request) return;
    
    try {
      await updateRequest(request.id, {
        archived_at: new Date().toISOString(),
        workflow_stage: 'closed'
      });
      
      toast.success('تم أرشفة الطلب بنجاح');
      navigate('/requests');
    } catch (error) {
      toast.error('فشل في أرشفة الطلب');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل تفاصيل الطلب...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">لم يتم العثور على الطلب</p>
          <Button onClick={() => navigate('/requests')} className="mt-4">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة إلى الطلبات
          </Button>
        </Card>
      </div>
    );
  }

  const isArchived = !!request.archived_at;
  const canArchive = ['completed', 'cancelled', 'closed'].includes(request.workflow_stage || request.status);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate('/requests')}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للطلبات
        </Button>
        
        <div className="flex items-center gap-2">
          {isArchived && (
            <Badge variant="secondary" className="gap-1">
              <Archive className="h-3 w-3" />
              مؤرشف
            </Badge>
          )}
          {canArchive && !isArchived && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleArchive}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              أرشفة الطلب
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <Alert>
          <Archive className="h-4 w-4" />
          <AlertDescription>
            تم أرشفة هذا الطلب في {new Date(request.archived_at).toLocaleDateString('ar-EG')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 gap-1">
          <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="gap-1 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">دورة الحياة</span>
          </TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">سير العمل</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1 text-xs sm:text-sm">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">المواد</span>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1 text-xs sm:text-sm">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">الموافقات</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1 text-xs sm:text-sm">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">التقارير</span>
          </TabsTrigger>
          <TabsTrigger value="controls" className="gap-1 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">التحكم</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <MaintenanceRequestDetails request={request} />
            </div>
            <div>
              <Card className="p-6">
                <WorkflowTimeline 
                  currentStage={request.workflow_stage || 'submitted'} 
                />
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4">
          <LifecycleTab requestId={request.id} />
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <WorkflowDiagram 
                currentStage={request.workflow_stage || request.status}
                requestData={request}
              />
            </div>
            <div className="space-y-4">
              <RequestWorkflowControls request={request} onUpdate={refetch} />
              {request.assigned_vendor_id && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => navigate(`/inbox`)}
                >
                  <MessageCircle className="h-4 w-4" />
                  فتح محادثة مع الفني
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">إدارة المواد</h3>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                نظام طلبات المواد قيد التطوير حالياً
              </AlertDescription>
            </Alert>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ApprovalManager 
              requestId={request.id}
              approvalType="request"
            />
            <ApprovalManager 
              requestId={request.id}
              approvalType="materials"
            />
            <ApprovalManager 
              requestId={request.id}
              approvalType="completion"
            />
            <ApprovalManager 
              requestId={request.id}
              approvalType="billing"
            />
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">التقارير</h3>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                نظام إنشاء التقارير قيد التطوير حالياً
              </AlertDescription>
            </Alert>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RequestWorkflowControls request={request} onUpdate={refetch} />
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">إجراءات إضافية</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  طباعة التقرير
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Package className="h-4 w-4" />
                  تصدير البيانات
                </Button>
                {canArchive && !isArchived && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={handleArchive}
                  >
                    <Archive className="h-4 w-4" />
                    أرشفة الطلب
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AppFooter />
    </div>
  );
}

/** مكون عرض سجل دورة حياة الطلب */
function LifecycleTab({ requestId }: { requestId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLifecycle = async () => {
      try {
        const { data, error } = await supabase
          .from('request_lifecycle')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching lifecycle:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLifecycle();
  }, [requestId]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">لا توجد أحداث مسجلة بعد في دورة حياة هذا الطلب</p>
      </Card>
    );
  }

  const getEventLabel = (type: string) => {
    const labels: Record<string, string> = {
      status_change: 'تغيير الحالة',
      assignment: 'تعيين',
      note: 'ملاحظة',
      escalation: 'تصعيد',
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          سجل دورة الحياة ({events.length} حدث)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-4 relative pb-6">
              {index < events.length - 1 && (
                <div className="absolute right-[15px] top-[32px] w-[2px] h-[calc(100%)] bg-border" />
              )}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {getEventLabel(event.update_type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "dd MMM yyyy - HH:mm", { locale: ar })}
                  </span>
                </div>
                {event.update_notes && (
                  <p className="text-sm text-foreground">{event.update_notes}</p>
                )}
                {event.status && (
                  <p className="text-xs text-muted-foreground mt-1">المرحلة: {event.status}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
