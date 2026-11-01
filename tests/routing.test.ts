import { describe, it, expect } from "vitest";
import { authorities, authorityFor } from "../src/lib/routing";
import { authorityRecords, roughly, type PublicReport } from "../src/lib/accountability";
import { higherSeverity, priorityFor } from "../src/lib/triage";
describe("authority routing", () => {
  it.each([
    ["Road damage", "Bridge railing is cracked", authorities.roads],
    ["Water or drainage", "Water leak on our street", authorities.water],
    ["Water or drainage", "Stormwater drain is blocked", authorities.storm],
    ["Pollution", "Factory smoke every night", authorities.pollution],
    ["Waste", "Garbage not collected", authorities.waste],
    ["Electrical", "Hanging wires near the school", authorities.power],
    ["Electrical", "Street light not working", authorities.lights],
    ["Other", "Something else", authorities.general],
  ])("sends %s: %s to the right body", (category, text, expected) =>
    expect(authorityFor(category, text)).toBe(expected));
});
describe("severity", () => {
  it("lets AI raise a rating", () =>
    expect(higherSeverity("Medium", "High")).toBe("High"));
  it("never lets AI lower the safety rules", () =>
    expect(higherSeverity(priorityFor("An open manhole").priority, "Low")).toBe("Critical"));
  it("replaces an unassessed rating", () =>
    expect(higherSeverity("Unassessed", "Low")).toBe("Low"));
});
describe("public accountability", () => {
  const report = (over: Partial<PublicReport>): PublicReport => ({
    ref: "a",
    category: "Waste",
    authority: authorities.waste,
    severity: "Medium",
    status: "Submitted",
    filed: "2026-11-01T00:00:00Z",
    acknowledged: null,
    confirmed: null,
    latitude: 12.97,
    longitude: 77.59,
    ...over,
  });
  it("rounds locations to about a kilometre", () =>
    expect(roughly(12.971612)).toBe(12.97));
  it("totals each authority and takes the median response", () => {
    const [record] = authorityRecords([
      report({ acknowledged: "2026-11-01T02:00:00Z" }),
      report({ acknowledged: "2026-11-01T06:00:00Z", status: "Closed" }),
      report({}),
    ]);
    expect(record).toEqual({
      authority: authorities.waste,
      routed: 3,
      acknowledged: 2,
      confirmed: 1,
      medianHours: 4,
    });
  });
});
