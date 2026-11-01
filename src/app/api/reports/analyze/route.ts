import { sameOrigin } from "@/lib/request-security";
import { z } from "zod";
import { localMode, localOwner } from "@/lib/local-workspace";
import { analyzeLocalReport, AnalysisUnavailable } from "@/lib/local-analysis";
import { analyzeCloudReport } from "@/lib/cloud-analysis";
import { ApiError, apiFailure } from "@/lib/cloud-reports";
export const maxDuration = 75;
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403 },
    );
  const owner = localMode() ? await localOwner() : null;
  if (localMode() && !owner)
    return Response.json({ error: "Local receipt required" }, { status: 401 });
  const input = z
    .object({ id: z.uuid(), consent: z.literal(true) })
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return Response.json(
      {
        error:
          "Report ID and explicit consent to external AI processing are required.",
      },
      { status: 400 },
    );
  try {
    return Response.json(localMode() ? await analyzeLocalReport(input.data.id, owner!) : await analyzeCloudReport(input.data.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof ApiError) return apiFailure(e);
    return Response.json(
      { error: e instanceof AnalysisUnavailable ? e.message : "AI is unavailable right now. Your report is saved. Try again from My reports." },
      { status: 503 },
    );
  }
}
