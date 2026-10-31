import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "./db";
import { ownedReport } from "./local-workspace";
import { analyzeEvidence, AnalysisUnavailable } from "./evidence-analysis";
export { AnalysisUnavailable } from "./evidence-analysis";
export async function analyzeLocalReport(id: string, owner: string) {
  const report = ownedReport(id, owner);
  if (!report) throw new AnalysisUnavailable("Report unavailable");
  if (!process.env.GEMINI_API_KEY)
    throw new AnalysisUnavailable(
      "Configure GEMINI_API_KEY in .env.local for live AI. Your report and evidence remain saved.",
    );
  const last = report.analysis?.completedAt;
  if (last && Date.now() - Date.parse(last) < 60000)
    throw new AnalysisUnavailable("Please wait one minute before another analysis.");
  db().exec("CREATE TABLE IF NOT EXISTS local_ai_calls(owner TEXT NOT NULL, created_at INTEGER NOT NULL)");
  const since = Date.now() - 86400000;
  const quota = db().prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN owner=? THEN 1 ELSE 0 END) AS personal FROM local_ai_calls WHERE created_at>?").get(owner, since) as { total: number; personal: number };
  if (quota.total >= 50 || quota.personal >= 20)
    throw new AnalysisUnavailable("Daily AI allowance reached. Your report remains saved for manual review.");
  db().prepare("INSERT INTO local_ai_calls(owner,created_at) VALUES(?,?)").run(owner, Date.now());
  const analysis = await analyzeEvidence(report, async (id) => {
    const evidence = report.evidence.find((e: { id: string }) => e.id === id);
    return readFile(join(process.env.CIVIC_DATA_DIR || ".data", "evidence", evidence.name));
  });
  const latest = ownedReport(id, owner);
  if (!latest) throw new AnalysisUnavailable("Report unavailable");
  latest.analysis = analysis;
  latest.events.push({
    action: "Live AI analysis",
    reason: "Gemini analysis saved; human verification required.",
    created_at: new Date().toISOString(),
  });
  db()
    .prepare("UPDATE reports SET payload=? WHERE id=? AND owner=?")
    .run(JSON.stringify(latest), id, owner);
  return latest.analysis;
}
