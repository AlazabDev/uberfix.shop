import { CheckCircle, Circle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  WORKFLOW_STAGES, 
  HAPPY_PATH_STAGES, 
  getStageIndex,
  type WorkflowStage 
} from "@/constants/workflowStages";
import { cn } from "@/lib/utils";

interface StatusTimelineProps {
  currentStatus: string;
  workflowStage?: string;
  createdAt: string;
  updatedAt?: string;
}

export function RequestStatusTimeline({ 
  currentStatus, 
  workflowStage, 
  createdAt, 
  updatedAt 
}: StatusTimelineProps) {
  // استخدام workflow_stage أولاً، ثم status
  const stage = (workflowStage || 'draft') as WorkflowStage;
  const currentIndex = getStageIndex(stage);

  // استخدام المسار الطبيعي للعرض
  const displayStages = HAPPY_PATH_STAGES.map(key => WORKFLOW_STAGES[key]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          مراحل الطلب
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute top-5 left-5 bottom-5 w-0.5 bg-border" />
          <div className="space-y-6">
            {displayStages.map((stageConfig, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const Icon = stageConfig.icon;

              return (
                <div key={stageConfig.key} className="relative flex items-start gap-4">
                  <div className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted 
                      ? 'bg-green-500 border-green-500' 
                      : isCurrent 
                        ? cn(stageConfig.bgColor, 'border-transparent animate-pulse')
                        : 'bg-background border-muted'
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : isCurrent ? (
                      <Icon className="h-5 w-5 text-white" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <h4 className={cn(
                        "font-medium",
                        isCompleted 
                          ? 'text-green-600' 
                          : isCurrent 
                            ? stageConfig.textColor
                            : 'text-muted-foreground'
                      )}>
                        {stageConfig.label}
                      </h4>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs">الحالية</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stageConfig.description}
                    </p>
                    {isCurrent && updatedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        آخر تحديث: {new Date(updatedAt).toLocaleString('ar-EG')}
                      </p>
                    )}
                    {index === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(createdAt).toLocaleString('ar-EG')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
