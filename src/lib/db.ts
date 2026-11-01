import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { publicDatabase } from "./supabase";
import { localMode } from "./config";
import type { DashboardData } from "./types";
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
export async function dashboard(): Promise<DashboardData> {
  if (!localMode()) {
    const client = publicDatabase();
    const [stats, categories] = await Promise.all([
      client.rpc("civic_source_stats"),
      client.rpc("civic_category_stats"),
    ]);
    if (stats.error || categories.error)
      throw Error("Hosted civic data unavailable");
    return {
      ...stats.data,
      categories: categories.data,
      configured: { auth: true, ai: !!process.env.GEMINI_API_KEY },
    };
  }
  const records = (
    db().prepare("SELECT payload FROM source_records").all() as { payload: string }[]
  ).map((row) => JSON.parse(row.payload));
  const categories = new Map<string, number>();
  for (const record of records) {
    const name = record.Category || "Other";
    categories.set(name, (categories.get(name) || 0) + 1);
  }
  const dates = records
    .map((record) => record["Grievance Date"])
    .filter(Boolean)
    .sort();
  const sync = db()
    .prepare("SELECT fetched_at FROM sync_log ORDER BY id DESC LIMIT 1")
    .get() as { fetched_at: string } | undefined;
  return {
    total: records.length,
    closed: records.filter((record) => /^closed$/i.test(record["Grievance Status"] || "")).length,
    wards: new Set(records.map((record) => record["Ward Name"] || "Location unavailable")).size,
    categories: [...categories]
      .map(([name, count]) => ({ name, count }))
      .sort((x, y) => y.count - x.count),
    fetchedAt: sync?.fetched_at || null,
    dateRange: dates.length
      ? { from: dates[0], to: dates[dates.length - 1] }
      : null,
    configured: { auth: false, ai: !!process.env.GEMINI_API_KEY },
  };
}
