import { sameOrigin } from "@/lib/request-security";
import { localMode, localOwner, ownedReport } from "@/lib/local-workspace";
import { db } from "@/lib/db";
import { z } from "zod";
import { authenticatedDatabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403 },
    );
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum([
        "Acknowledged",
        "In progress",
        "Handoff prepared",
        "Resolution proposed",
        "Closed",
        "Reopened",
      ]),
      reason: z.string().trim().min(3).max(2000),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Invalid transition request" },
      { status: 400 },
    );
  if (localMode()) {
    const owner = await localOwner(),
      report = owner ? ownedReport(parsed.data.id, owner) : null;
    if (!report)
      return Response.json({ error: "Report unavailable" }, { status: 404 });
    const next = parsed.data.status;
    const allowed: Record<string, string[]> = {
      Submitted: ["Acknowledged"],
      Acknowledged: ["In progress"],
      "In progress": ["Handoff prepared", "Resolution proposed"],
      "Handoff prepared": ["In progress", "Resolution proposed"],
      "Resolution proposed": ["Closed", "Reopened"],
      Closed: ["Reopened"],
      Reopened: ["Acknowledged"],
    };
    if (!allowed[report.status]?.includes(next))
      return Response.json(
        { error: "Transition not permitted" },
        { status: 409 },
      );
    if (
      next === "Resolution proposed" &&
      !report.evidence.some(
        (e: { type: string; purpose?: string }) =>
          e.type.startsWith("image/") && e.purpose === "resolution",
      )
    )
      return Response.json(
        { error: "Attach real resolution photo evidence first." },
        { status: 400 },
      );
    report.status = next;
    report.events.push({
      action: next,
      reason: parsed.data.reason,
      created_at: new Date().toISOString(),
    });
    db()
      .prepare("UPDATE reports SET payload=? WHERE id=? AND owner=?")
      .run(JSON.stringify(report), report.id, owner);
    return Response.json({ status: next });
  }
  const client = await authenticatedDatabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json({ error: "Sign-in required" }, { status: 401 });
  const { error } = await client.rpc("civic_transition", {
    target: parsed.data.id,
    next_status: parsed.data.status,
    note: parsed.data.reason,
  });
  if (error)
    return Response.json(
      { error: "The requested transition is not permitted." },
      { status: 403 },
    );
  return Response.json({ status: parsed.data.status });
}
