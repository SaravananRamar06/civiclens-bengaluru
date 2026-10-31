import { describe, it, expect } from "vitest";
import { distanceMeters, relatedReports } from "../src/lib/spatial";
describe("local geographic context", () => {
  it("uses metre distances and longitude correctly at Bengaluru latitude", () => {
    expect(
      distanceMeters(
        { latitude: 12.9716, longitude: 77.5946 },
        { latitude: 12.9716, longitude: 77.5946 },
      ),
    ).toBe(0);
    expect(
      distanceMeters(
        { latitude: 12.9716, longitude: 77.5946 },
        { latitude: 12.9725, longitude: 77.5946 },
      ),
    ).toBeGreaterThan(99);
  });
  it("requires a separate matching category, nearby location and time window", () => {
    const current = {
      id: "unit-current",
      latitude: 12.9716,
      longitude: 77.5946,
      category: "Road damage",
      created_at: "2026-10-31T12:00:00Z",
    };
    const nearby = { ...current, id: "unit-nearby", latitude: 12.9717 };
    expect(
      relatedReports(current, [
        current,
        nearby,
        { ...nearby, id: "unit-other", category: "Waste" },
        { ...nearby, id: "unit-old", created_at: "2025-01-01T12:00:00Z" },
      ]).map((r) => r.id),
    ).toEqual(["unit-nearby"]);
  });
});
