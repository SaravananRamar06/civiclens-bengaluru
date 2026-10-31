import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { publicDatabase } from "./supabase";
import { localMode } from "./config";
import type { CivicReport, DashboardData } from "./types";
let database: DatabaseSync | undefined;
export function db() {
  if (!database) {
    const directory = process.env.CIVIC_DATA_DIR || ".data";
    mkdirSync(directory, { recursive: true });
    database = new DatabaseSync(join(directory, "civiclens.sqlite"));
    database.exec(
      "CREATE TABLE IF NOT EXISTS source_records (id TEXT PRIMARY KEY,payload TEXT NOT NULL,fetched_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sync_log(id INTEGER PRIMARY KEY,fetched_at TEXT,records INTEGER,source TEXT); CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,owner TEXT NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,report_id TEXT,actor TEXT,action TEXT,created_at TEXT)",
    );
  }
  return database;
}
function normalize(payload: string): CivicReport {
  const r = JSON.parse(payload);
  return {
    id: String(r["Complaint ID"]),
    category: r.Category || "Other",
    detail: r["Sub Category"] || "Unspecified",
    ward: r["Ward Name"] || "Location unavailable",
    date: r["Grievance Date"] || "",
    status: r["Grievance Status"] || "Unknown",
    remarks: r["Staff Remarks"] || "",
    source: "Sahaaya archive",
    priority: "Unassessed",
  };
}
export async function dashboard(): Promise<DashboardData> {
  if (
    !localMode()
  ) {
    const client = publicDatabase();
    const [stats, categories, records] = await Promise.all([
      client.rpc("civic_source_stats"),
      client.rpc("civic_category_stats"),
      client
        .from("civic_sources")
        .select("id,category,detail,ward,reported_at,source_status")
        .order("reported_at", { ascending: false })
        .limit(100),
    ]);
    if (stats.error || categories.error || records.error)
      throw Error("Hosted civic data unavailable");
    return {
      ...stats.data,
      categories: categories.data,
      reports: records.data.map((r) => ({
        id: r.id,
        category: r.category,
        detail: r.detail,
        ward: r.ward,
        date: r.reported_at,
        status: r.source_status,
        remarks: "Source remarks are omitted from the public view.",
        source: "Sahaaya archive",
        priority: "Unassessed",
      })),
      configured: { auth: true, ai: !!process.env.GEMINI_API_KEY },
    };
  }
  const records = db().prepare("SELECT payload FROM source_records").all() as {
    payload: string;
  }[];
  const reports = records.map((r) => normalize(r.payload));
  const categories = new Map<string, number>();
  for (const r of reports)
    categories.set(r.category, (categories.get(r.category) || 0) + 1);
  const dates = reports
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  const sync = db()
    .prepare("SELECT fetched_at FROM sync_log ORDER BY id DESC LIMIT 1")
    .get() as { fetched_at: string } | undefined;
  return {
    reports: reports.slice(0, 100),
    total: reports.length,
    closed: reports.filter((r) => /^closed$/i.test(r.status)).length,
    wards: new Set(reports.map((r) => r.ward)).size,
    categories: [...categories]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    fetchedAt: sync?.fetched_at || null,
    dateRange: dates.length
      ? { from: dates[0], to: dates[dates.length - 1] }
      : null,
    configured: { auth: false, ai: !!process.env.GEMINI_API_KEY },
  };
}
