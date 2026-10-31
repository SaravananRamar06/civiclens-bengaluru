import type { Priority } from "./types";
export function priorityFor(text: string): {
  priority: Priority;
  reason: string;
} {
  if (
    /\b(collapse|electrocution|live wire|immediate danger|sinkhole|open manhole)\b/i.test(
      text,
    )
  )
    return {
      priority: "Critical",
      reason:
        "An immediate-danger term was reported. Urgent human verification is required.",
    };
  if (/\b(flood|sewage overflow|blocked road|water main burst)\b/i.test(text))
    return {
      priority: "High",
      reason:
        "The report describes a potential service interruption or access hazard.",
    };
  if (
    /\b(pothole|water leak|garbage|blocked drain|broken footpath|street light not working)\b/i.test(
      text,
    )
  )
    return {
      priority: "Medium",
      reason:
        "A localized actionable defect was reported. This provisional maintenance priority requires evidence review.",
    };
  return {
    priority: "Unassessed",
    reason:
      "Severity needs evidence review. Category alone does not establish risk.",
  };
}
export function validBengaluruPoint(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 12.65 &&
    lat <= 13.3 &&
    lng >= 77.2 &&
    lng <= 77.95
  );
}
