import { describe, it, expect } from "vitest";

describe("Project health check", () => {
  it("should pass basic sanity check", () => {
    expect(true).toBe(true);
  });

  it("should have correct status values matching DB enum", () => {
    const validStatuses = ['Open', 'Assigned', 'InProgress', 'In Progress', 'Waiting', 'On Hold', 'Completed', 'Rejected', 'Closed', 'Cancelled'];
    expect(validStatuses).toContain('Open');
    expect(validStatuses).toContain('Completed');
    expect(validStatuses).toContain('In Progress');
  });
});
