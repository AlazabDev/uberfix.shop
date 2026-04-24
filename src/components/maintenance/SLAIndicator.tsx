import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface SLAIndicatorProps {
  dueDate?: string;
  createdAt: string;
  status: string;
  priority: string;
}

export function SLAIndicator({ dueDate, createdAt, status, priority }: SLAIndicatorProps) {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const created = new Date(createdAt);
  
  const totalTime = due.getTime() - created.getTime();
  const elapsedTime = now.getTime() - created.getTime();
  const remainingTime = due.getTime() - now.getTime();
  
  const progressPercentage = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
  const isOverdue = now > due;
  const isCompleted = ['completed', 'closed'].includes(status);
  
  const getSLAStatus = () => {
    if (isCompleted) return { color: 'success', icon: CheckCircle, label: 'مكتمل في الوقت' };
    if (isOverdue) return { color: 'destructive', icon: AlertTriangle, label: 'متأخر' };
    if (progressPercentage > 80) return { color: 'warning', icon: Clock, label: 'ينتهي قريباً' };
    return { color: 'primary', icon: Clock, label: 'في الوقت المحدد' };
  };

  const slaStatus = getSLAStatus();
  const StatusIcon = slaStatus.icon;

  const formatTimeRemaining = () => {
    if (isOverdue) {
      const overdue = Math.abs(remainingTime);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      return days > 0 ? `متأخر ${days} يوم` : `متأخر ${hours} ساعة`;
    } else {
      const hours = Math.floor(remainingTime / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      return days > 0 ? `باقي ${days} يوم` : `باقي ${hours} ساعة`;
    }
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: `var(--${slaStatus.color})` }}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 text-${slaStatus.color}`} />
            <span className="text-sm font-medium">SLA</span>
          </div>
          <Badge 
            variant={isOverdue ? "destructive" : progressPercentage > 80 ? "outline" : "secondary"}
          >
            {slaStatus.label}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>التقدم</span>
            <span>{formatTimeRemaining()}</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className={`h-2 ${isOverdue ? 'bg-destructive/20' : ''}`}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>الموعد النهائي: {due.toLocaleDateString('ar-EG')}</span>
          <span className="capitalize">{priority}</span>
        </div>
      </CardContent>
    </Card>
  );
}
