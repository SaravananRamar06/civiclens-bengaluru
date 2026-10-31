import { sameOrigin } from "@/lib/request-security";
import { z } from "zod";
import { start } from "workflow/api";
import { authenticatedDatabase } from "@/lib/supabase";
import { analyzeSource } from "@/workflows/analyze-source";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.uuid().safeParse(id).success)
    return Response.json(
      { error: "Valid analysis ID required" },
      { status: 400 },
    );
  const client = await authenticatedDatabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json({ error: "Sign-in required" }, { status: 401 });
  const { data, error } = await client
    .from("civic_analysis")
    .select("id,status,result,created_at,updated_at")
    .eq("id", id)
    .single();
  if (error)
    return Response.json({ error: "Analysis unavailable" }, { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403 },
    );
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
      {
        error:
          "Live analysis needs GEMINI_API_KEY and server-only SUPABASE_SECRET_KEY in .env.local. No simulated analysis was generated.",
      },
      { status: 503 },
    );
  const client = await authenticatedDatabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json({ error: "Google sign-in required" }, { status: 401 });
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
}
