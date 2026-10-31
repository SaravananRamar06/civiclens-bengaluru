import { describe, it, expect } from "vitest";
import { priorityFor, validBengaluruPoint } from "../src/lib/triage";
describe("conservative priority policy", () => {
  it("preserves urgent reported danger for review", () => {
    expect(priorityFor("An open manhole near a school").priority).toBe(
      "Critical",
    );
  });
  it("does not infer severity from category alone", () => {
    expect(priorityFor("Road Maintenance").priority).toBe("Unassessed");
  });
  it("recognizes reported disruption", () => {
    expect(priorityFor("Sewage overflow is blocking access").priority).toBe(
      "High",
    );
  });
});
describe("Bengaluru location validation", () => {
  it("accepts a Bengaluru coordinate", () =>
    expect(validBengaluruPoint(12.9716, 77.5946)).toBe(true));
  it("rejects missing or outside coordinates", () => {
    expect(validBengaluruPoint(NaN, 77)).toBe(false);
    expect(validBengaluruPoint(37.77, -122.4)).toBe(false);
  });
});
