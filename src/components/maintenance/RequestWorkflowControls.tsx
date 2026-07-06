import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Wrench } from "lucide-react";
import { MaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { 
  WORKFLOW_STAGES, 
  getNextStages,
  type WorkflowStage 
} from "@/constants/workflowStages";
import { cn } from "@/lib/utils";

interface RequestWorkflowControlsProps {
  request: MaintenanceRequest;
  onUpdate?: () => void;
}

export function RequestWorkflowControls({ request, onUpdate }: RequestWorkflowControlsProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage>(
    (request.workflow_stage as WorkflowStage) || 'draft'
  );
  const { toast } = useToast();

  const currentStageConfig = WORKFLOW_STAGES[selectedStage];
  const nextStages = getNextStages(selectedStage);

  const updateWorkflowStage = async (newStage: WorkflowStage) => {
    setLoading(true);
    try {
      const stageConfig = WORKFLOW_STAGES[newStage];
      const updates: Record<string, string | number> = {
        workflow_stage: newStage,
        status: stageConfig.status as any,
      };

      // إضافة تاريخ الإكمال عند الوصول لمرحلة الإكمال
      if (newStage === 'completed' || newStage === 'closed') {
        updates.archived_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates as any)
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "✓ تم التحديث",
        description: `تم تحديث مرحلة الطلب إلى: ${stageConfig.label}`,
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "فشل في تحديث المرحلة";
      console.error('Error updating workflow:', error);
      toast({
        title: "خطأ",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const Icon = currentStageConfig?.icon || Clock;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          التحكم في سير العمل
        </CardTitle>
        <CardDescription>
          إدارة مراحل تنفيذ طلب الصيانة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* المرحلة الحالية */}
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          {currentStageConfig && (
            <>
              <div className={cn("p-2 rounded-full", currentStageConfig.bgColor)}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">المرحلة الحالية</p>
                <p className="font-semibold">{currentStageConfig.label}</p>
              </div>
              <Badge variant="outline">{selectedStage}</Badge>
            </>
          )}
        </div>

        {/* تغيير المرحلة - فقط المراحل التالية المسموحة */}
        {nextStages.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">الانتقال إلى المرحلة التالية</label>
            <div className="flex flex-wrap gap-2">
              {nextStages.map((stage) => {
                const StageIcon = stage.icon;
                return (
                  <Button
                    key={stage.key}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStage(stage.key);
                      updateWorkflowStage(stage.key);
                    }}
                    disabled={loading}
                    className={cn("border gap-2", stage.textColor)}
                  >
                    <StageIcon className="h-4 w-4" />
                    {stage.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* رسالة عند عدم وجود انتقالات */}
        {nextStages.length === 0 && (
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">لا توجد مراحل تالية متاحة - الطلب في مرحلته النهائية</p>
          </div>
        )}

        {/* مؤشر SLA */}
        {request.sla_due_date && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="font-medium">موعد SLA:</span>
              <span>{new Date(request.sla_due_date).toLocaleString('ar-EG')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
