import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, MapPin, Phone, User, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { SLAIndicator } from "./SLAIndicator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequestStatusTimeline } from "./RequestStatusTimeline";
import { WorkflowDiagram } from "@/components/workflow/WorkflowDiagram";
import { ApprovalManager } from "@/components/workflow/ApprovalManager";

interface MaintenanceRequestDetailsProps {
  request: {
    id: string;
    title: string;
    status: string;
    priority?: string | null;
    sla_due_date?: string | null;
    created_at: string;
    updated_at?: string | null;
    follow_up_required?: boolean;
    follow_up_date?: string | null;
    workflow_stage?: string | null;
    client_name?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    location?: string | null;
    preferred_date?: string;
    preferred_time?: string;
    estimated_completion?: string;
    service_type?: string | null;
    description?: string | null;
    customer_notes?: string | null;
    vendor_notes?: string | null;
    estimated_cost?: number | null;
    actual_cost?: number | null;
    completion_photos?: string[];
    rating?: number | null;
  };
}

export function MaintenanceRequestDetails({ request }: MaintenanceRequestDetailsProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      completed: "bg-green-500/10 text-green-600 border-green-500/20",
      cancelled: "bg-red-500/10 text-red-600 border-red-500/20"
    };

    const labels = {
      pending: "في الانتظار",
      in_progress: "قيد التنفيذ", 
      completed: "مكتمل",
      cancelled: "ملغي"
    };

    return (
      <Badge variant="outline" className={variants[status] || variants.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: "bg-gray-500/10 text-gray-600 border-gray-500/20",
      medium: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      high: "bg-red-500/10 text-red-600 border-red-500/20"
    };

    const labels = {
      low: "منخفضة",
      medium: "متوسطة",
      high: "عالية"
    };

    return (
      <Badge variant="outline" className={variants[priority] || variants.medium}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{request.title}</h3>
          <p className="text-sm text-muted-foreground">
            رقم الطلب: {request.id.slice(0, 8)}...
          </p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(request.status)}
          {getPriorityBadge(request.priority)}
        </div>
      </div>

      <Separator />

      {/* SLA Indicator */}
      {request.sla_due_date && (
        <SLAIndicator 
          dueDate={request.sla_due_date}
          createdAt={request.created_at}
          status={request.status}
          priority={request.priority}
        />
      )}

      {/* Follow-up Alert */}
      {request.follow_up_required && request.follow_up_date && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            يتطلب متابعة في {new Date(request.follow_up_date).toLocaleDateString('ar-EG')}
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Details with Lifecycle */}
      <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger value="details">تفاصيل</TabsTrigger>
            <TabsTrigger value="workflow">سير العمل</TabsTrigger>
            <TabsTrigger value="materials">المواد</TabsTrigger>
            <TabsTrigger value="approvals">الموافقات</TabsTrigger>
            <TabsTrigger value="reports">التقارير</TabsTrigger>
          </TabsList>
        
        <TabsContent value="details" className="space-y-6 mt-6">

      {/* Status Timeline */}
      <RequestStatusTimeline 
        currentStatus={request.status}
        workflowStage={request.workflow_stage}
        createdAt={request.created_at}
        updatedAt={request.updated_at}
      />

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              معلومات العميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{request.client_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{request.client_phone}</span>
            </div>
            {request.client_email && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">البريد:</span>
                <span>{request.client_email}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{request.location}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              التوقيتات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">تاريخ الإنشاء:</span>
              <span>{new Date(request.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
            {request.preferred_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">التاريخ المفضل:</span>
                <span>{new Date(request.preferred_date).toLocaleDateString('ar-EG')}</span>
              </div>
            )}
            {request.preferred_time && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الوقت المفضل:</span>
                <span>{request.preferred_time}</span>
              </div>
            )}
            {request.estimated_completion && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الانتهاء المتوقع:</span>
                <span>{new Date(request.estimated_completion).toLocaleDateString('ar-EG')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تفاصيل الخدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium mb-2">نوع الخدمة:</p>
            <Badge variant="outline">{request.service_type}</Badge>
          </div>
          
          <div>
            <p className="font-medium mb-2">وصف المشكلة:</p>
            <p className="text-sm bg-muted p-3 rounded-md">{request.description}</p>
          </div>

          {request.customer_notes && (
            <div>
              <p className="font-medium mb-2">ملاحظات العميل:</p>
              <p className="text-sm bg-muted p-3 rounded-md">{request.customer_notes}</p>
            </div>
          )}

          {request.vendor_notes && (
            <div>
              <p className="font-medium mb-2">ملاحظات الفني:</p>
              <p className="text-sm bg-muted p-3 rounded-md">{request.vendor_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Information */}
      {(request.estimated_cost || request.actual_cost) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              التكاليف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {request.estimated_cost && (
                <div>
                  <p className="text-sm text-muted-foreground">التكلفة المقدرة</p>
                  <p className="text-lg font-semibold">{request.estimated_cost} جنيه</p>
                </div>
              )}
              {request.actual_cost && (
                <div>
                  <p className="text-sm text-muted-foreground">التكلفة الفعلية</p>
                  <p className="text-lg font-semibold">{request.actual_cost} جنيه</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {request.completion_photos && request.completion_photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              صور التنفيذ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {request.completion_photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={photo}
                    alt={`صورة ${index + 1}`}
                    className="w-full h-full object-cover rounded-md border"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating */}
      {request.rating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">التقييم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-lg ${
                      star <= request.rating ? "text-yellow-400" : "text-gray-300"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                ({request.rating}/5)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
        
        <TabsContent value="lifecycle" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>سير العمل</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">تم إزالة هذه الميزة مؤقتاً</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="mt-6 space-y-4">
          <WorkflowDiagram 
            currentStage={request.workflow_stage || request.status} 
            requestData={request}
          />
          
          <RequestStatusTimeline
            currentStatus={request.status}
            workflowStage={request.workflow_stage}
            createdAt={request.created_at}
            updatedAt={request.updated_at}
          />
        </TabsContent>

        {/* Materials Tab - Feature Coming Soon */}
        <TabsContent value="materials" className="mt-6 space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              نظام طلبات المواد قيد التطوير حالياً
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="mt-6 space-y-4">
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

        {/* Reports Tab - Feature Coming Soon */}
        <TabsContent value="reports" className="mt-6 space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              نظام إنشاء التقارير قيد التطوير حالياً
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
