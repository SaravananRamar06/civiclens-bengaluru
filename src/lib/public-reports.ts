import "server-only";
import { db } from "./db";
import { publicDatabase } from "./supabase";
import { localMode } from "./config";
import { roughly, type PublicReport } from "./accountability";
type Stored = {
  id: string;
  category: string;
  authority?: string;
  priority: string;
  status: string;
  created_at: string;
  latitude: number;
  longitude: number;
  events?: { action: string; created_at: string }[];
};
const firstEvent = (report: Stored, action: string) =>
  report.events?.find((event) => event.action === action)?.created_at ?? null;
export async function publicReports(): Promise<PublicReport[]> {
  if (localMode())
    return (
      db()
        .prepare("SELECT payload FROM reports ORDER BY rowid DESC LIMIT 500")
        .all() as { payload: string }[]
    ).map(({ payload }) => {
      const report = JSON.parse(payload) as Stored;
      return {
        ref: report.id.slice(0, 8),
        category: report.category,
        authority: report.authority || "City corporation: general",
        severity: report.priority,
        status: report.status,
        filed: report.created_at,
        acknowledged: firstEvent(report, "Acknowledged"),
        confirmed: firstEvent(report, "Closed"),
        latitude: roughly(report.latitude),
        longitude: roughly(report.longitude),
      };
    });
  const { data, error } = await publicDatabase().rpc("civic_public_reports");
  if (error) throw error;
  return data;
}
