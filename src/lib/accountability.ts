export type PublicReport = {
  ref: string;
  category: string;
  authority: string;
  severity: string;
  status: string;
  filed: string;
  acknowledged: string | null;
  confirmed: string | null;
  latitude: number;
  longitude: number;
};
export type AuthorityRecord = {
  authority: string;
  routed: number;
  acknowledged: number;
  confirmed: number;
  medianHours: number | null;
};
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
/** Rounds to two decimal places, about a kilometre, so no public pin identifies a home. */
export const roughly = (value: number) => Math.round(value * 100) / 100;
export function authorityRecords(reports: PublicReport[]): AuthorityRecord[] {
  const groups = new Map<string, PublicReport[]>();
  for (const report of reports)
    groups.set(report.authority, [...(groups.get(report.authority) ?? []), report]);
  return [...groups]
    .map(([authority, items]) => {
      const waits = items
        .filter((r) => r.acknowledged)
        .map((r) => (Date.parse(r.acknowledged!) - Date.parse(r.filed)) / 3600000);
      return {
        authority,
        routed: items.length,
        acknowledged: waits.length,
        confirmed: items.filter((r) => r.status === "Closed").length,
        medianHours: median(waits),
      };
    })
    .sort((a, b) => b.routed - a.routed);
}
