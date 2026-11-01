import type { Priority } from "./types";
export function priorityFor(text: string): {
  priority: Priority;
  reason: string;
} {
  if (
    /\b(collaps(e|ed|es|ing)|electrocut(ed|ion)|(live|exposed) wires?|immediate danger|sinkholes?|(open|uncovered) man ?holes?|man ?hole( cover)?( is| are)? (open|missing|broken))\b/i.test(
      text,
    )
  )
    return {
      priority: "Critical",
      reason:
        "An immediate-danger term was reported. Urgent human verification is required.",
    };
  if (/\b(flood(s|ed|ing)?|waterlogg(ed|ing)|sewage( is)? overflow(s|ing)?|blocked roads?|road( is)? blocked|water main burst|burst water main)\b/i.test(text))
    return {
      priority: "High",
      reason:
        "The report describes a potential service interruption or access hazard.",
    };
  if (
    /\b(potholes?|water leaks?|garbage|blocked drains?|broken footpaths?|street ?lights?( is| are)? not working)\b/i.test(
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
const severityOrder: Priority[] = ["Unassessed", "Low", "Medium", "High", "Critical"];
export function higherSeverity(a: Priority, b: Priority) {
  return severityOrder.indexOf(a) >= severityOrder.indexOf(b) ? a : b;
}
