import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import { localMode } from "./config";
export { localMode } from "./config";
function sessions() {
  db().exec(
    "CREATE TABLE IF NOT EXISTS local_sessions(token_hash TEXT PRIMARY KEY,owner TEXT NOT NULL,expires_at TEXT NOT NULL)",
  );
  return db();
}
export async function localOwner() {
  if (!localMode()) return null;
  const token = (await cookies()).get("civic_receipt")?.value;
  if (!token) return null;
  const row = sessions()
    .prepare(
      "SELECT owner FROM local_sessions WHERE token_hash=? AND expires_at>?",
    )
    .get(
      createHash("sha256").update(token).digest("hex"),
      new Date().toISOString(),
    ) as { owner: string } | undefined;
  return row?.owner || null;
}
export async function startLocalSession() {
  const token = randomBytes(32).toString("base64url"),
    owner = randomUUID();
  sessions()
    .prepare("INSERT INTO local_sessions VALUES(?,?,?)")
    .run(
      createHash("sha256").update(token).digest("hex"),
      owner,
      new Date(Date.now() + 30 * 86400000).toISOString(),
    );
  (await cookies()).set("civic_receipt", token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 86400,
  });
  return owner;
}
export function ownedReports(owner: string) {
  return (
    db()
      .prepare("SELECT payload FROM reports WHERE owner=? ORDER BY rowid DESC")
      .all(owner) as { payload: string }[]
  ).map((r) => JSON.parse(r.payload));
}
export function ownedReport(id: string, owner: string) {
  const row = db()
    .prepare("SELECT payload FROM reports WHERE id=? AND owner=?")
    .get(id, owner) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : null;
}

export async function endLocalSession() {
  const jar = await cookies();
  const token = jar.get("civic_receipt")?.value;
  if (token) sessions().prepare("DELETE FROM local_sessions WHERE token_hash=?").run(createHash("sha256").update(token).digest("hex"));
  jar.delete("civic_receipt");
}
