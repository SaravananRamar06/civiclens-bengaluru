import "server-only";
import { db } from "./db";
import { publicDatabase } from "./supabase";
import { localMode } from "./config";
type Row = {
  id: string;
  category: string;
  detail: string;
  ward: string;
  date: string;
  status: string;
};
export type Insights = {
  categories: { name: string; total: number; closed: number }[];
  wards: { name: string; total: number; closed: number }[];
};
/** One row per complaint, oldest first; repeated text is held once in a table. */
export type Wall = {
  categories: string[];
  details: string[];
  wards: string[];
  statuses: string[];
  rows: [id: string, category: number, detail: number, ward: number, status: number, date: string][];
};
async function rows(): Promise<Row[]> {
  if (localMode())
    return (
      db()
        .prepare(
          `SELECT id, json_extract(payload,'$."Category"') AS category, json_extract(payload,'$."Sub Category"') AS detail, json_extract(payload,'$."Ward Name"') AS ward, json_extract(payload,'$."Grievance Date"') AS date, json_extract(payload,'$."Grievance Status"') AS status FROM source_records`,
        )
        .all() as Row[]
    );
  const client = publicDatabase();
  const size = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await client
      .from("civic_sources")
      .select("id,category,detail,ward,reported_at,source_status")
      .order("id")
      .range(from, from + size - 1);
    if (error) throw error;
    for (const r of data)
      all.push({ id: r.id, category: r.category, detail: r.detail, ward: r.ward, date: r.reported_at, status: r.source_status });
    if (data.length < size) return all;
  }
}
function rank(items: Row[], key: "category" | "ward", limit: number) {
  const totals = new Map<string, { total: number; closed: number }>();
  for (const item of items) {
    const name = item[key];
    if (!name) continue;
    const entry = totals.get(name) ?? { total: 0, closed: 0 };
    entry.total++;
    if (/^closed$/i.test(item.status || "")) entry.closed++;
    totals.set(name, entry);
  }
  return [...totals]
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
export async function insights(): Promise<Insights> {
  const items = await rows();
  return { categories: rank(items, "category", 8), wards: rank(items, "ward", 8) };
}
function table() {
  const index = new Map<string, number>();
  const values: string[] = [];
  return {
    values,
    add(value: string) {
      let position = index.get(value);
      if (position === undefined) {
        position = values.length;
        index.set(value, position);
        values.push(value);
      }
      return position;
    },
  };
}
export async function wall(): Promise<Wall> {
  const items = await rows();
  items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const categories = table(), details = table(), wards = table(), statuses = table();
  return {
    rows: items.map((r) => [
      r.id,
      categories.add(r.category || "Other"),
      details.add(r.detail || "Unspecified"),
      wards.add(r.ward || "Location unavailable"),
      statuses.add(r.status || "Unknown"),
      r.date || "",
    ]),
    categories: categories.values,
    details: details.values,
    wards: wards.values,
    statuses: statuses.values,
  };
}
