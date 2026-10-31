import { sameOrigin } from "@/lib/request-security";
import { z } from "zod";
import { localOwner } from "@/lib/local-workspace";
import { analyzeLocalReport, AnalysisUnavailable } from "@/lib/local-analysis";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403 },
    );
  const owner = await localOwner();
  if (!owner)
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
    return Response.json(await analyzeLocalReport(input.data.id, owner));
  } catch (e) {
    return Response.json(
      { error: e instanceof AnalysisUnavailable ? e.message : "AI processing failed. Your report remains saved; check provider configuration and try again." },
      { status: 503 },
    );
  }
}
