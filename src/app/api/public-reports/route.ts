import { publicReports } from "@/lib/public-reports";
import { authorityRecords } from "@/lib/accountability";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const reports = await publicReports();
    return Response.json(
      { reports, authorities: authorityRecords(reports) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Live figures can’t load right now." },
      { status: 503 },
    );
  }
}
