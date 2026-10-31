import { localOwner, ownedReport, localMode } from "@/lib/local-workspace";
import { cloudIdentity, readCloudReport, apiFailure } from "@/lib/cloud-reports";
export async function GET(request: Request) {
  try {
  const id = new URL(request.url).searchParams.get("id") || "";
  const owner = localMode() ? await localOwner() : null;
  const report = localMode() ? (owner ? ownedReport(id, owner) : null) : await readCloudReport(id, await cloudIdentity());
  if (!report)
    return Response.json({ error: "Report unavailable" }, { status: 404 });
  const text = `CivicLens Bengaluru — handoff packet\n\nTracking ID: ${report.id}\nReported: ${report.created_at}\nCategory: ${report.category}\nProject queue: ${report.reviewQueue || "General civic review"}\nProject review: ${report.status}\nPriority: ${report.priority} (provisional)\n\n${report.description}\n\nEvidence attachments: ${report.evidence.length}\n\nThis packet was prepared by the project operator. No government delivery, acceptance or field repair is claimed. Exact coordinates and private attachments are excluded from this export.\n`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="civiclens-${report.id}.txt"`,
      "Cache-Control": "private, no-store",
    },
  });
  } catch (error) { return apiFailure(error); }
}
