import "server-only";
import { cloudIdentity, ApiError } from "./cloud-reports";
import { workerDatabase } from "./supabase";
import { analyzeEvidence } from "./evidence-analysis";
export async function analyzeCloudReport(id: string) {
  const { client, user } = await cloudIdentity();
  if (!process.env.GEMINI_API_KEY || !process.env.SUPABASE_SECRET_KEY)
    throw new ApiError("Live analysis requires GEMINI_API_KEY and SUPABASE_SECRET_KEY on the server. Your evidence remains saved.");
  const { data: report, error } = await client.from("civic_reports").select("id,description,category,civic_evidence(id,mime_type,object_path,status)").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (error || !report) throw new ApiError("Report unavailable", 404);
  const { data: job, error: quota } = await client.rpc("civic_reserve_report_analysis", { target: id });
  if (quota) throw new ApiError("AI allowance reached or analysis was requested too recently. Wait before retrying.", 429);
  const worker = workerDatabase();
  try {
    const evidence = report.civic_evidence.filter(e => e.status === "ready");
    const result = await analyzeEvidence({ ...report, evidence: evidence.map(e => ({ id: e.id, type: e.mime_type })) }, async (evidenceId) => {
      const attachment = evidence.find(e => e.id === evidenceId)!;
      const { data, error: unavailable } = await client.storage.from("civic-evidence").download(attachment.object_path);
      if (unavailable || !data) throw new ApiError("Evidence could not be retrieved for analysis.");
      return new Uint8Array(await data.arrayBuffer());
    });
    const saved = await worker.rpc("civic_complete_report_analysis", { target: job, assessment: result });
    if (saved.error) throw new ApiError("AI result could not be saved. Please refresh before retrying.");
    return result;
  } catch (error) {
    await worker.rpc("civic_complete_report_analysis", { target: job, assessment: null });
    throw error;
  }
}
