/**
 * اختبارات صارمة لمراحل سير العمل
 * يتحقق من أن كل مرحلة لها بيانات صحيحة وأن الانتقالات منطقية
 */
import { describe, it, expect } from "vitest";
import {
  WORKFLOW_STAGES,
  HAPPY_PATH_STAGES,
  canTransitionTo,
  getProgressPercentage,
  statusToWorkflowStage,
  getStageIndex,
  getNextStages,
  type WorkflowStage,
} from "@/constants/workflowStages";

// الحالات المسموحة في DB enum mr_status
const VALID_DB_STATUSES = [
  'Open', 'Assigned', 'InProgress', 'In Progress',
  'Waiting', 'On Hold', 'Completed', 'Rejected', 'Closed', 'Cancelled'
];

describe("WorkflowStages - Data Integrity", () => {
  it("every stage must have a valid DB status mapping", () => {
    const stages = Object.values(WORKFLOW_STAGES);
    for (const stage of stages) {
      expect(
        VALID_DB_STATUSES,
        `Stage "${stage.key}" has invalid DB status: "${stage.status}"`
      ).toContain(stage.status);
    }
  });

  it("every stage must have required fields populated", () => {
    for (const [key, config] of Object.entries(WORKFLOW_STAGES)) {
      expect(config.key, `key mismatch for ${key}`).toBe(key);
      expect(config.label.length, `${key} missing label`).toBeGreaterThan(0);
      expect(config.labelEn.length, `${key} missing labelEn`).toBeGreaterThan(0);
      expect(config.description.length, `${key} missing description`).toBeGreaterThan(0);
      expect(config.icon, `${key} missing icon`).toBeDefined();
      expect(config.color.length, `${key} missing color`).toBeGreaterThan(0);
      expect(config.status.length, `${key} missing status`).toBeGreaterThan(0);
    }
  });

  it("HAPPY_PATH_STAGES must reference existing stages", () => {
    const allKeys = Object.keys(WORKFLOW_STAGES);
    for (const stage of HAPPY_PATH_STAGES) {
      expect(allKeys, `Happy path references non-existent stage: ${stage}`).toContain(stage);
    }
  });

  it("no duplicate stages in HAPPY_PATH_STAGES", () => {
    const unique = new Set(HAPPY_PATH_STAGES);
    expect(unique.size).toBe(HAPPY_PATH_STAGES.length);
  });

  it("terminal stages (closed, cancelled) must have empty nextStages", () => {
    expect(WORKFLOW_STAGES.closed.nextStages).toEqual([]);
    expect(WORKFLOW_STAGES.cancelled.nextStages).toEqual([]);
  });

  it("terminal stages must have empty actions", () => {
    expect(WORKFLOW_STAGES.closed.actions).toEqual([]);
    expect(WORKFLOW_STAGES.cancelled.actions).toEqual([]);
  });
});

describe("WorkflowStages - Transition Logic", () => {
  it("nextStages must only reference existing stages", () => {
    const allKeys = Object.keys(WORKFLOW_STAGES);
    for (const [key, config] of Object.entries(WORKFLOW_STAGES)) {
      for (const next of config.nextStages) {
        expect(allKeys, `${key} references invalid nextStage: ${next}`).toContain(next);
      }
    }
  });

  it("no stage should transition to itself", () => {
    for (const [key, config] of Object.entries(WORKFLOW_STAGES)) {
      expect(
        config.nextStages,
        `Stage "${key}" can transition to itself - circular reference`
      ).not.toContain(key);
    }
  });

  it("canTransitionTo returns true for valid transitions", () => {
    expect(canTransitionTo('submitted', 'acknowledged')).toBe(true);
    expect(canTransitionTo('assigned', 'scheduled')).toBe(true);
    expect(canTransitionTo('in_progress', 'completed')).toBe(true);
  });

  it("canTransitionTo returns false for invalid transitions", () => {
    expect(canTransitionTo('submitted', 'completed')).toBe(false);
    expect(canTransitionTo('closed', 'submitted')).toBe(false);
    expect(canTransitionTo('cancelled', 'in_progress')).toBe(false);
  });

  it("happy path must form a connected chain", () => {
    for (let i = 0; i < HAPPY_PATH_STAGES.length - 1; i++) {
      const current = HAPPY_PATH_STAGES[i];
      const next = HAPPY_PATH_STAGES[i + 1];
      const config = WORKFLOW_STAGES[current];
      expect(
        config.nextStages,
        `Happy path break: "${current}" cannot transition to "${next}"`
      ).toContain(next);
    }
  });
});

describe("WorkflowStages - Utility Functions", () => {
  it("getProgressPercentage returns 0 for first stage", () => {
    expect(getProgressPercentage('draft')).toBe(0);
  });

  it("getProgressPercentage returns 100 for last happy path stage", () => {
    const lastStage = HAPPY_PATH_STAGES[HAPPY_PATH_STAGES.length - 1];
    expect(getProgressPercentage(lastStage)).toBe(100);
  });

  it("getProgressPercentage increases monotonically through happy path", () => {
    let prev = -1;
    for (const stage of HAPPY_PATH_STAGES) {
      const pct = getProgressPercentage(stage);
      expect(pct, `Progress for ${stage} (${pct}) not greater than previous (${prev})`).toBeGreaterThan(prev);
      prev = pct;
    }
  });

  it("statusToWorkflowStage maps all DB statuses correctly", () => {
    expect(statusToWorkflowStage('Open')).toBe('submitted');
    expect(statusToWorkflowStage('Assigned')).toBe('assigned');
    expect(statusToWorkflowStage('In Progress')).toBe('in_progress');
    expect(statusToWorkflowStage('InProgress')).toBe('in_progress');
    expect(statusToWorkflowStage('On Hold')).toBe('on_hold');
    expect(statusToWorkflowStage('Waiting')).toBe('on_hold');
    expect(statusToWorkflowStage('Completed')).toBe('completed');
    expect(statusToWorkflowStage('Rejected')).toBe('rejected');
    expect(statusToWorkflowStage('Closed')).toBe('closed');
    expect(statusToWorkflowStage('Cancelled')).toBe('cancelled');
  });

  it("statusToWorkflowStage returns draft for unknown status", () => {
    expect(statusToWorkflowStage('UNKNOWN')).toBe('draft');
    expect(statusToWorkflowStage('')).toBe('draft');
  });

  it("getStageIndex returns correct index for happy path stages", () => {
    expect(getStageIndex('draft')).toBe(0);
    expect(getStageIndex('submitted')).toBe(1);
    expect(getStageIndex('closed')).toBe(HAPPY_PATH_STAGES.length - 1);
  });

  it("getStageIndex returns 0 for non-happy-path stages", () => {
    expect(getStageIndex('cancelled')).toBe(0);
    expect(getStageIndex('on_hold')).toBe(0);
    expect(getStageIndex('rejected')).toBe(0);
  });

  it("getNextStages returns valid stage configs", () => {
    const nextFromSubmitted = getNextStages('submitted');
    expect(nextFromSubmitted.length).toBeGreaterThan(0);
    expect(nextFromSubmitted.every(s => s.key && s.label)).toBe(true);
  });

  it("getNextStages returns empty for terminal stages", () => {
    expect(getNextStages('closed')).toEqual([]);
    expect(getNextStages('cancelled')).toEqual([]);
  });
});
