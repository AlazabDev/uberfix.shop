/**
 * اختبارات صارمة لمنطق حساب إحصائيات لوحة التحكم
 * يختبر المنطق البحت بدون Supabase
 */
import { describe, it, expect } from "vitest";

// استخراج المنطق البحت لاختباره
interface MockRequest {
  id: string;
  status: string;
  workflow_stage: string | null;
  priority: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
}

function calculateStats(requests: MockRequest[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r =>
    r.status === 'Open' || r.status === 'On Hold' || r.status === 'Waiting' || r.workflow_stage === 'submitted'
  ).length;
  const completedRequests = requests.filter(r =>
    r.status === 'Completed' || r.workflow_stage === 'completed'
  ).length;
  const todayRequests = requests.filter(r => new Date(r.created_at) >= today).length;
  const monthRequests = requests.filter(r => new Date(r.created_at) >= monthStart).length;
  const highPriority = requests.filter(r => r.priority === 'high' || r.priority === 'urgent').length;
  const mediumPriority = requests.filter(r => r.priority === 'medium').length;
  const lowPriority = requests.filter(r => r.priority === 'low').length;
  const totalBudget = requests.reduce((sum, r) => sum + (Number(r.estimated_cost) || 0), 0);
  const actualCost = requests.reduce((sum, r) => sum + (Number(r.actual_cost) || 0), 0);
  const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;

  return {
    total_requests: totalRequests,
    pending_requests: pendingRequests,
    completed_requests: completedRequests,
    today_requests: todayRequests,
    this_month_requests: monthRequests,
    high_priority_count: highPriority,
    medium_priority_count: mediumPriority,
    low_priority_count: lowPriority,
    total_budget: totalBudget,
    actual_cost: actualCost,
    completion_rate: completionRate,
  };
}

describe("Dashboard Stats - Calculation Logic", () => {
  it("returns zero stats for empty array", () => {
    const stats = calculateStats([]);
    expect(stats.total_requests).toBe(0);
    expect(stats.pending_requests).toBe(0);
    expect(stats.completed_requests).toBe(0);
    expect(stats.completion_rate).toBe(0);
  });

  it("counts pending requests correctly (Open, On Hold, Waiting, submitted)", () => {
    const requests: MockRequest[] = [
      { id: '1', status: 'Open', workflow_stage: 'submitted', priority: 'low', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '2', status: 'On Hold', workflow_stage: 'on_hold', priority: 'low', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '3', status: 'Waiting', workflow_stage: null, priority: 'low', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '4', status: 'Completed', workflow_stage: 'completed', priority: 'low', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
    ];
    const stats = calculateStats(requests);
    expect(stats.pending_requests).toBe(3);
  });

  it("counts completed requests correctly", () => {
    const requests: MockRequest[] = [
      { id: '1', status: 'Completed', workflow_stage: 'completed', priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '2', status: 'Completed', workflow_stage: 'billed', priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '3', status: 'Open', workflow_stage: 'submitted', priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
    ];
    const stats = calculateStats(requests);
    // "Completed" status OR "completed" workflow_stage
    expect(stats.completed_requests).toBe(2);
  });

  it("calculates completion rate correctly", () => {
    const requests: MockRequest[] = [
      { id: '1', status: 'Completed', workflow_stage: 'completed', priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '2', status: 'Open', workflow_stage: null, priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '3', status: 'Open', workflow_stage: null, priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '4', status: 'Open', workflow_stage: null, priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
    ];
    const stats = calculateStats(requests);
    expect(stats.completion_rate).toBe(25); // 1/4 = 25%
  });

  it("handles priority counting with 'urgent' mapping to high", () => {
    const requests: MockRequest[] = [
      { id: '1', status: 'Open', workflow_stage: null, priority: 'high', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '2', status: 'Open', workflow_stage: null, priority: 'urgent', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '3', status: 'Open', workflow_stage: null, priority: 'medium', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '4', status: 'Open', workflow_stage: null, priority: 'low', estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
    ];
    const stats = calculateStats(requests);
    expect(stats.high_priority_count).toBe(2); // high + urgent
    expect(stats.medium_priority_count).toBe(1);
    expect(stats.low_priority_count).toBe(1);
  });

  it("sums budget and cost correctly with null handling", () => {
    const requests: MockRequest[] = [
      { id: '1', status: 'Open', workflow_stage: null, priority: null, estimated_cost: 1000, actual_cost: 800, created_at: '2020-01-01' },
      { id: '2', status: 'Open', workflow_stage: null, priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
      { id: '3', status: 'Open', workflow_stage: null, priority: null, estimated_cost: 500, actual_cost: 600, created_at: '2020-01-01' },
    ];
    const stats = calculateStats(requests);
    expect(stats.total_budget).toBe(1500);
    expect(stats.actual_cost).toBe(1400);
  });

  it("counts today's requests correctly", () => {
    const todayISO = new Date().toISOString();
    const oldDate = '2020-01-01T00:00:00Z';
    const requests: MockRequest[] = [
      { id: '1', status: 'Open', workflow_stage: null, priority: null, estimated_cost: null, actual_cost: null, created_at: todayISO },
      { id: '2', status: 'Open', workflow_stage: null, priority: null, estimated_cost: null, actual_cost: null, created_at: oldDate },
    ];
    const stats = calculateStats(requests);
    expect(stats.today_requests).toBe(1);
  });

  it("does not double-count requests with both Completed status and completed stage", () => {
    const requests: MockRequest[] = [
      { id: '1', status: 'Completed', workflow_stage: 'completed', priority: null, estimated_cost: null, actual_cost: null, created_at: '2020-01-01' },
    ];
    const stats = calculateStats(requests);
    expect(stats.completed_requests).toBe(1); // not 2
  });
});
