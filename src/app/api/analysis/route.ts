import { sameOrigin } from "@/lib/request-security";
import { z } from "zod";
import { start } from "workflow/api";
import { authenticatedDatabase } from "@/lib/supabase";
import { localMode } from "@/lib/config";
import { analyzeSource } from "@/workflows/analyze-source";
const unavailable = () =>
  Response.json(
    { error: "AI analysis of archive records is only available on the hosted site." },
    { status: 503 },
  );
export async function GET(request: Request) {
  if (localMode()) return unavailable();
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.uuid().safeParse(id).success)
    return Response.json(
      { error: "Valid analysis ID required" },
      { status: 400 },
    );
  try {
    const client = await authenticatedDatabase();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return Response.json({ error: "Sign in to view this analysis." }, { status: 401 });
    const { data, error } = await client
      .from("civic_analysis")
      .select("id,status,result,created_at,updated_at")
      .eq("id", id)
      .single();
    if (error)
      return Response.json({ error: "Analysis unavailable" }, { status: 404 });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Analysis unavailable" }, { status: 503 });
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403 },
    );
  if (localMode()) return unavailable();
  const parsed = z
    .object({ sourceId: z.string().min(1).max(100) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "A valid source case ID is required." },
      { status: 400 },
    );
  if (!process.env.GEMINI_API_KEY || !process.env.SUPABASE_SECRET_KEY)
    return Response.json(
      { error: "AI analysis is not switched on yet. No simulated analysis was generated." },
      { status: 503 },
    );
  try {
    const client = await authenticatedDatabase();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return Response.json(
        { error: "Start a report first so this analysis can be saved to you." },
        { status: 401 },
      );
    const { data, error } = await client.rpc("civic_reserve_analysis", {
      source: parsed.data.sourceId,
    });
    if (error)
      return Response.json(
        {
          error:
            "Analysis cannot start: source unavailable or daily limit reached.",
        },
        { status: 429 },
      );
    if (data.existing)
      return Response.json({ id: data.id, status: "queued" }, { status: 202 });
    try {
      const run = await start(analyzeSource, [data.id, parsed.data.sourceId]);
      return Response.json(
        { id: data.id, runId: run.runId, status: "queued" },
        { status: 202 },
      );
    } catch {
      await client.rpc("civic_fail_analysis", { target: data.id });
      return Response.json(
        { error: "Could not start analysis. Please retry." },
        { status: 503 },
      );
    }
  } catch {
    return Response.json(
      { error: "Could not start analysis. Please retry." },
      { status: 503 },
    );
  }
}
