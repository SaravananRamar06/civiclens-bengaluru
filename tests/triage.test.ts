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
describe("priority policy phrasing", () => {
  it.each([
    "Two open manholes on 5th Main road",
    "Open man hole on the footpath",
    "Manhole cover is missing near the school",
    "Live wires hanging at the bus stop",
    "Wall collapsed onto the pavement",
  ])("treats %s as critical", (text) =>
    expect(priorityFor(text).priority).toBe("Critical"));
  it.each([
    "Street is flooded after rain",
    "Flooding in the underpass",
    "Sewage is overflowing onto the road",
    "The road is blocked by debris",
  ])("treats %s as high", (text) =>
    expect(priorityFor(text).priority).toBe("High"));
  it.each([
    "Many potholes near the school",
    "Street lights not working in our lane",
    "Streetlight not working for a week",
  ])("treats %s as medium", (text) =>
    expect(priorityFor(text).priority).toBe("Medium"));
});
