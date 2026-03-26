/**
 * اختبارات صارمة لأنواع الصيانة والتحقق من تكامل البيانات
 */
import { describe, it, expect } from "vitest";
import { WORKFLOW_STAGES, HAPPY_PATH_STAGES, type WorkflowStage } from "@/constants/workflowStages";

describe("Maintenance Type - Status Sync Integrity", () => {
  it("workflow_stage 'submitted' must map to status 'Open'", () => {
    expect(WORKFLOW_STAGES.submitted.status).toBe('Open');
  });

  it("workflow_stage 'assigned' must map to status 'Assigned'", () => {
    expect(WORKFLOW_STAGES.assigned.status).toBe('Assigned');
  });

  it("workflow_stage 'in_progress' must map to status 'In Progress'", () => {
    expect(WORKFLOW_STAGES.in_progress.status).toBe('In Progress');
  });

  it("workflow_stage 'completed' must map to status 'Completed'", () => {
    expect(WORKFLOW_STAGES.completed.status).toBe('Completed');
  });

  it("workflow_stage 'closed' must map to status 'Closed'", () => {
    expect(WORKFLOW_STAGES.closed.status).toBe('Closed');
  });

  it("workflow_stage 'cancelled' must map to status 'Cancelled'", () => {
    expect(WORKFLOW_STAGES.cancelled.status).toBe('Cancelled');
  });

  it("workflow_stage 'on_hold' must map to status 'On Hold'", () => {
    expect(WORKFLOW_STAGES.on_hold.status).toBe('On Hold');
  });

  it("workflow_stage 'rejected' must map to status 'Rejected'", () => {
    expect(WORKFLOW_STAGES.rejected.status).toBe('Rejected');
  });
});

describe("Maintenance Type - Critical Business Rules", () => {
  it("completed stage must only transition to billed (no regression)", () => {
    expect(WORKFLOW_STAGES.completed.nextStages).toEqual(['billed']);
  });

  it("draft stage must be able to go to submitted or cancelled only", () => {
    expect(WORKFLOW_STAGES.draft.nextStages).toEqual(['submitted', 'cancelled']);
  });

  it("in_progress must be able to complete work", () => {
    expect(WORKFLOW_STAGES.in_progress.nextStages).toContain('completed');
  });

  it("every non-terminal stage must have at least one next stage", () => {
    const terminalStages: WorkflowStage[] = ['closed', 'cancelled'];
    for (const [key, config] of Object.entries(WORKFLOW_STAGES)) {
      if (!terminalStages.includes(key as WorkflowStage)) {
        expect(
          config.nextStages.length,
          `Non-terminal stage "${key}" has no next stages`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("no stage should allow direct jump to 'paid' except 'billed'", () => {
    for (const [key, config] of Object.entries(WORKFLOW_STAGES)) {
      if (key !== 'billed') {
        expect(
          config.nextStages,
          `Stage "${key}" should not transition directly to "paid"`
        ).not.toContain('paid');
      }
    }
  });

  it("no stage should allow direct jump to 'closed' except 'paid'", () => {
    for (const [key, config] of Object.entries(WORKFLOW_STAGES)) {
      if (key !== 'paid') {
        expect(
          config.nextStages,
          `Stage "${key}" should not transition directly to "closed"`
        ).not.toContain('closed');
      }
    }
  });
});

describe("Maintenance Type - Stage Count Validation", () => {
  it("must have exactly 15 workflow stages", () => {
    expect(Object.keys(WORKFLOW_STAGES).length).toBe(15);
  });

  it("happy path must have exactly 11 stages", () => {
    const { HAPPY_PATH_STAGES } = require("@/constants/workflowStages");
    expect(HAPPY_PATH_STAGES.length).toBe(11);
  });
});
