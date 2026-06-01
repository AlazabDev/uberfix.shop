export interface DashboardRequestLike {
  status?: string | null;
  workflow_stage?: string | null;
  priority?: string | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  created_at?: string | null;
}

const ACTIVE_STATUSES = new Set(['Open', 'Assigned', 'In Progress', 'InProgress', 'On Hold', 'Waiting']);
const COMPLETED_STATUSES = new Set(['Completed', 'Closed']);

const ACTIVE_WORKFLOW_STAGES = new Set([
  'draft',
  'submitted',
  'acknowledged',
  'triaged',
  'assigned',
  'scheduled',
  'in_progress',
  'inspection',
  'waiting_parts',
  'on_hold',
]);

const COMPLETED_WORKFLOW_STAGES = new Set(['completed', 'billed', 'paid', 'closed']);

const STATUS_TO_STAGE: Record<string, string> = {
  Open: 'submitted',
  Assigned: 'assigned',
  'In Progress': 'in_progress',
  InProgress: 'in_progress',
  'On Hold': 'on_hold',
  Waiting: 'on_hold',
  Completed: 'completed',
  Closed: 'closed',
  Cancelled: 'cancelled',
  Rejected: 'rejected',
};

function normalizeWorkflowStage(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function resolveWorkflowStage(request: DashboardRequestLike): string {
  const explicitStage = normalizeWorkflowStage(request.workflow_stage);
  if (explicitStage) return explicitStage;

  const status = String(request.status ?? '').trim();
  return STATUS_TO_STAGE[status] ?? '';
}

function isValidDate(value?: string | null): value is string {
  return !!value && !Number.isNaN(new Date(value).getTime());
}

export function calculateDashboardStats(requests: DashboardRequestLike[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalRequests = requests.length;

  const pendingRequests = requests.filter((request) => {
    const status = String(request.status ?? '').trim();
    const stage = resolveWorkflowStage(request);

    return ACTIVE_STATUSES.has(status) || ACTIVE_WORKFLOW_STAGES.has(stage);
  }).length;

  const completedRequests = requests.filter((request) => {
    const status = String(request.status ?? '').trim();
    const stage = resolveWorkflowStage(request);

    return COMPLETED_STATUSES.has(status) || COMPLETED_WORKFLOW_STAGES.has(stage);
  }).length;

  const todayRequests = requests.filter((request) => {
    if (!isValidDate(request.created_at)) return false;
    return new Date(request.created_at) >= today;
  }).length;

  const monthRequests = requests.filter((request) => {
    if (!isValidDate(request.created_at)) return false;
    return new Date(request.created_at) >= monthStart;
  }).length;

  const highPriority = requests.filter((request) => request.priority === 'high' || request.priority === 'urgent').length;
  const mediumPriority = requests.filter((request) => request.priority === 'medium').length;
  const lowPriority = requests.filter((request) => request.priority === 'low').length;

  const submitted = requests.filter((request) => resolveWorkflowStage(request) === 'submitted').length;
  const assigned = requests.filter((request) => resolveWorkflowStage(request) === 'assigned').length;
  const inProgress = requests.filter((request) => ['in_progress', 'inspection'].includes(resolveWorkflowStage(request))).length;
  const workflowCompleted = requests.filter((request) => COMPLETED_WORKFLOW_STAGES.has(resolveWorkflowStage(request))).length;

  const totalBudget = requests.reduce((sum, request) => sum + (Number(request.estimated_cost) || 0), 0);
  const actualCost = requests.reduce((sum, request) => sum + (Number(request.actual_cost) || 0), 0);
  const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

  return {
    pending_requests: pendingRequests,
    today_requests: todayRequests,
    completed_requests: completedRequests,
    total_requests: totalRequests,
    this_month_requests: monthRequests,
    total_budget: totalBudget,
    actual_cost: actualCost,
    completion_rate: Math.round(completionRate),
    avg_completion_days: 0,
    high_priority_count: highPriority,
    medium_priority_count: mediumPriority,
    low_priority_count: lowPriority,
    submitted_count: submitted,
    assigned_count: assigned,
    in_progress_count: inProgress,
    workflow_completed_count: workflowCompleted,
  };
}