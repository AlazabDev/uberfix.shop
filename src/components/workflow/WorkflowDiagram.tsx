import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import { 
  WORKFLOW_STAGES, 
  HAPPY_PATH_STAGES, 
  getStageIndex,
  getProgressPercentage,
  type WorkflowStage 
} from "@/constants/workflowStages";

interface WorkflowDiagramProps {
  currentStage?: string;
  requestData?: any;
}

export function WorkflowDiagram({ currentStage, requestData }: WorkflowDiagramProps) {
  const validStage = (currentStage && currentStage in WORKFLOW_STAGES) 
    ? currentStage as WorkflowStage 
    : 'draft';
  
  const currentIndex = getStageIndex(validStage);
  const progress = getProgressPercentage(validStage);
  const currentConfig = WORKFLOW_STAGES[validStage];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          مخطط سير العمل
          <Badge variant="outline" className="mr-auto text-xs">
            {progress}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Workflow Stages - Happy Path */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {HAPPY_PATH_STAGES.map((stageKey, index) => {
              const stage = WORKFLOW_STAGES[stageKey];
              const Icon = stage.icon;
              const isCompleted = index < currentIndex;
              const isCurrent = stageKey === validStage;
              const isPending = index > currentIndex;

              return (
                <div
                  key={stageKey}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    isCompleted
                      ? 'border-success bg-success/10'
                      : isCurrent
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-muted bg-muted/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`p-2.5 rounded-full ${
                        isCompleted
                          ? 'bg-success text-success-foreground'
                          : isCurrent
                          ? `${stage.bgColor} text-white`
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium leading-tight">{stage.label}</p>
                      {isCurrent && (
                        <Badge variant="default" className="mt-1 text-[10px] px-1.5">
                          الحالية
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Non-happy-path stages indicator */}
          {!HAPPY_PATH_STAGES.includes(validStage) && (
            <div className={`p-3 rounded-lg border-2 border-primary bg-primary/10`}>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = currentConfig.icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                <div>
                  <p className="font-medium text-sm">{currentConfig.label}</p>
                  <p className="text-xs text-muted-foreground">{currentConfig.description}</p>
                </div>
                <Badge variant="secondary" className="mr-auto">{currentConfig.labelEn}</Badge>
              </div>
            </div>
          )}

          {/* Current Stage Info */}
          {currentStage && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2 text-sm">معلومات المرحلة الحالية</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">الحالة:</span>
                  <span className="font-medium mr-2">{currentConfig.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">حالة DB:</span>
                  <span className="font-medium mr-2">{currentConfig.status}</span>
                </div>
                {requestData?.updated_at && (
                  <div>
                    <span className="text-muted-foreground">آخر تحديث:</span>
                    <span className="font-medium mr-2">
                      {new Date(requestData.updated_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
