import { db } from "@/lib/db";
import { publicDatabase } from "@/lib/supabase";
import { localMode } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams,
    q = (params.get("q") || "").trim().slice(0, 120),
    category = (params.get("category") || "").slice(0, 120),
    page = Math.min(
      10000,
      Math.max(0, Number.parseInt(params.get("page") || "0") || 0),
    ),
    size = 8;
  try {
    if (
      !localMode()
    ) {
      const search = q.replace(/[^\p{L}\p{N}\s/-]/gu, " ").trim().split(/\s+/).join("%");
      const records = (head: boolean) => {
        let query = publicDatabase()
          .from("civic_sources")
          .select("id,category,detail,ward,reported_at,source_status", {
            count: "exact",
            head,
          });
        if (category && category !== "All categories")
          query = query.eq("category", category);
        if (search)
          query = query.or(
            `detail.ilike.%${search}%,ward.ilike.%${search}%,id.ilike.%${search}%,category.ilike.%${search}%`,
          );
        return query;
      };
      // Many complaints share a date, so id keeps the order the same on every page.
      const { data, count, error } = await records(false)
        .order("reported_at", { ascending: false })
        .order("id", { ascending: true })
        .range(page * size, (page + 1) * size - 1);
      // PostgREST rejects a range past the last row, which is simply an empty page.
      if (error?.code === "PGRST103") {
        const total = await records(true);
        if (total.error) throw total.error;
        return Response.json({ reports: [], matched: total.count, page, size });
      }
      if (error) throw error;
      return Response.json({
        reports: data.map((r) => ({
          ...r,
          date: r.reported_at,
          status: r.source_status,
          source: "Sahaaya archive",
          priority: "Unassessed",
          remarks: "Source remarks are omitted.",
        })),
        matched: count,
        page,
        size,
      });
    }
    const pattern = "%" + q.toLowerCase().replace(/[\\%_]/g, "\\$&") + "%",
      filter = category && category !== "All categories" ? category : "";
    const where = `WHERE (?='' OR json_extract(payload,'$."Category"')=?) AND (?='' OR lower(coalesce(json_extract(payload,'$."Category"'),'')||' '||coalesce(json_extract(payload,'$."Sub Category"'),'')||' '||coalesce(json_extract(payload,'$."Ward Name"'),'')||' '||coalesce(json_extract(payload,'$."Complaint ID"'),'')) LIKE ? ESCAPE '\\')`;
    const args = [filter, filter, q, pattern];
    const count = db()
      .prepare("SELECT count(*) as n FROM source_records " + where)
      .get(...args) as { n: number };
    const rows = db()
      .prepare(
        "SELECT id,payload FROM source_records " +
          where +
          ` ORDER BY json_extract(payload,'$."Grievance Date"') DESC, id ASC LIMIT ? OFFSET ?`,
      )
      .all(...args, size, page * size) as { id: string; payload: string }[];
    return Response.json(
      {
        reports: rows.map((row) => {
          const r = JSON.parse(row.payload);
          return {
            id: row.id,
            category: r.Category || "Other",
            detail: r["Sub Category"] || "Unspecified",
            ward: r["Ward Name"] || "Unavailable",
            date: r["Grievance Date"],
            status: r["Grievance Status"],
            source: "Sahaaya archive",
            priority: "Unassessed",
            remarks: "Source remarks are omitted from the public view.",
          };
        }),
        matched: count.n,
        page,
        size,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not search civic records." },
      { status: 503 },
    );
  }
}
