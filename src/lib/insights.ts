import "server-only";
import { db } from "./db";
import { publicDatabase } from "./supabase";
import { localMode } from "./config";
type Row = { category: string; ward: string; status: string };
export type Insights = {
  categories: { name: string; total: number; closed: number }[];
  wards: { name: string; total: number; closed: number }[];
};
async function rows(): Promise<Row[]> {
  if (localMode())
    return (
      db()
        .prepare(
          `SELECT json_extract(payload,'$."Category"') AS category, json_extract(payload,'$."Ward Name"') AS ward, json_extract(payload,'$."Grievance Status"') AS status FROM source_records`,
        )
        .all() as Row[]
    );
  const client = publicDatabase();
  const size = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await client
      .from("civic_sources")
      .select("id,category,ward,source_status")
      .order("id")
      .range(from, from + size - 1);
    if (error) throw error;
    for (const r of data)
      all.push({ category: r.category, ward: r.ward, status: r.source_status });
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
