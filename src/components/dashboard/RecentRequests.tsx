import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MapPin, Clock, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "معلق", className: "bg-warning text-warning-foreground" },
  "in_progress": { label: "قيد التنفيذ", className: "bg-primary text-primary-foreground" },
  completed: { label: "مكتمل", className: "bg-success text-success-foreground" },
  cancelled: { label: "ملغي", className: "bg-destructive text-destructive-foreground" },
  Open: { label: "مفتوح", className: "bg-primary text-primary-foreground" },
  Closed: { label: "مغلق", className: "bg-muted text-muted-foreground" }
};

const priorityConfig = {
  low: { label: "منخفضة", className: "bg-muted text-muted-foreground" },
  medium: { label: "متوسطة", className: "bg-warning text-warning-foreground" },
  high: { label: "عالية", className: "bg-destructive text-destructive-foreground" },
  urgent: { label: "طارئة", className: "bg-destructive text-destructive-foreground animate-pulse" }
};

export const RecentRequests = () => {
  const navigate = useNavigate();
  const { requests, loading, error } = useMaintenanceRequests({ maxRows: 10 });
  const recentRequests = requests.slice(0, 3);

  if (loading) {
    return (
      <Card className="card-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">طلبات الصيانة الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري التحميل...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">طلبات الصيانة الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            {error?.message || 'حدث خطأ في تحميل البيانات'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elegant">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">طلبات الصيانة الأخيرة</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/requests')}>
          عرض الكل
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentRequests.map((request) => (
          <div key={request.id} className="border border-border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-foreground line-clamp-1">
                  {request.title}
                </h3>
                <p className="text-sm text-primary font-medium">#{request.id.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs", priorityConfig[request.priority as keyof typeof priorityConfig]?.className || "bg-muted text-muted-foreground")}>
                  {priorityConfig[request.priority as keyof typeof priorityConfig]?.label || "غير محدد"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/requests/${request.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{request.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{request.client_name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{new Date(request.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Badge className={cn(
                "text-xs",
                statusConfig[String(request.status)]?.className || "bg-muted text-muted-foreground"
              )}>
                {statusConfig[String(request.status)]?.label || String(request.status)}
              </Badge>
              {request.estimated_cost && (
                <span className="text-sm font-medium text-primary">
                  {request.estimated_cost} ج.م
                </span>
              )}
            </div>
          </div>
        ))}

        {recentRequests.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>لا توجد طلبات صيانة حالياً</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
