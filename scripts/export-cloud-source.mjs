import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(".data/civiclens.sqlite", { readOnly: true });
const offset = Number(process.argv[2] || 0),
  size = Number(process.argv[3] || 200);
const rows = db
  .prepare("SELECT id,payload,fetched_at FROM source_records LIMIT ? OFFSET ?")
  .all(size, offset);
const values = rows.map((row) => {
  const r = JSON.parse(row.payload);
  return {
    id: row.id,
    category: r.Category || "Other",
    detail: r["Sub Category"] || "Unspecified",
    ward: r["Ward Name"] || "Unavailable",
    reported_at: r["Grievance Date"] || "",
    source_status: r["Grievance Status"] || "Unknown",
    source_url: "https://github.com/Vonter/bbmp-citizen-grievances",
    fetched_at: row.fetched_at,
  };
});
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
console.log(
  "INSERT INTO public.civic_sources (id,category,detail,ward,reported_at,source_status,source_url,fetched_at) VALUES " +
    values
      .map((r) => "(" + Object.values(r).map(quote).join(",") + ")")
      .join(",") +
    " ON CONFLICT (id) DO NOTHING;",
);
