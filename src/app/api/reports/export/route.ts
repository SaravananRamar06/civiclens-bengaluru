import { localOwner, ownedReport, localMode } from "@/lib/local-workspace";
import { cloudIdentity, readCloudReport, apiFailure } from "@/lib/cloud-reports";
export async function GET(request: Request) {
  try {
  const id = new URL(request.url).searchParams.get("id") || "";
  const owner = localMode() ? await localOwner() : null;
  const report = localMode() ? (owner ? ownedReport(id, owner) : null) : await readCloudReport(id, await cloudIdentity());
  if (!report)
    return Response.json({ error: "Report unavailable" }, { status: 404 });
  const text = [
    "CivicLens Bengaluru handoff packet",
    "",
    `To: ${report.authority || "City corporation: general"}`,
    `Tracking ID: ${report.id}`,
    `Reported: ${report.created_at}`,
    `Category: ${report.category}`,
    `Severity: ${report.priority} (provisional, needs human verification)`,
    `Status: ${report.status}`,
    "",
    report.description,
    "",
    `Evidence attachments: ${report.evidence?.length ?? 0}`,
    "The reporter’s identity, exact location and private attachments are not included.",
    "CivicLens is an independent project. This packet was prepared for handoff and has not been accepted by any authority.",
  ].join("\n");
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="civiclens-${report.id}.txt"`,
      "Cache-Control": "private, no-store",
    },
  });
  } catch (error) { return apiFailure(error); }
}
