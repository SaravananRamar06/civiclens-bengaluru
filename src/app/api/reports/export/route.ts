import { localOwner, ownedReport } from "@/lib/local-workspace";
export async function GET(request: Request) {
  const owner = await localOwner(),
    id = new URL(request.url).searchParams.get("id") || "";
  const report = owner ? ownedReport(id, owner) : null;
  if (!report)
    return Response.json({ error: "Report unavailable" }, { status: 404 });
  const text = `CivicLens Bengaluru — handoff packet\n\nTracking ID: ${report.id}\nReported: ${report.created_at}\nCategory: ${report.category}\nProject queue: ${report.reviewQueue || "General civic review"}\nLocal review: ${report.status}\nPriority: ${report.priority} (provisional)\n\n${report.description}\n\nEvidence attachments: ${report.evidence.length}\n\nThis packet was prepared by the project operator. No government delivery, acceptance or field repair is claimed. Exact coordinates and private attachments are excluded from this export.\n`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="civiclens-${report.id}.txt"`,
      "Cache-Control": "private, no-store",
    },
  });
}
