import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
mkdirSync(".data", { recursive: true });
const db = new DatabaseSync(".data/civiclens.sqlite");
db.exec(
  "CREATE TABLE IF NOT EXISTS source_records (id TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sync_log (id INTEGER PRIMARY KEY, fetched_at TEXT, records INTEGER, source TEXT)",
);
const source =
  "https://raw.githubusercontent.com/Vonter/bbmp-citizen-grievances/main/data/citizen-grievances.csv.gz";
const response = await fetch(source);
if (!response.ok) throw new Error(`Source returned ${response.status}`);
const parser = Readable.fromWeb(response.body)
  .pipe(createGunzip())
  .pipe(parse({ columns: true, bom: true, relax_column_count: true }));
const insert = db.prepare(
  "INSERT OR REPLACE INTO source_records VALUES (?,?,?)",
);
const now = new Date().toISOString();
let count = 0;
for await (const row of parser) {
  const id = row["Complaint ID"];
  if (!id) continue;
  insert.run(String(id), JSON.stringify(row), now);
  count++;
  if (count >= 5000) {
    parser.destroy();
    break;
  }
}
db.prepare(
  "INSERT INTO sync_log(fetched_at,records,source) VALUES (?,?,?)",
).run(now, count, source);
console.log(
  JSON.stringify({
    imported: count,
    source,
    fetchedAt: now,
    columns: Object.keys(
      JSON.parse(
        db.prepare("SELECT payload FROM source_records LIMIT 1").get().payload,
      ),
    ),
  }),
);
db.close();
