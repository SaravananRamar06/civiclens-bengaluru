import { sameOrigin } from "@/lib/request-security";
import { z } from "zod";
import { authenticatedDatabase } from "@/lib/supabase";
import { localMode, localOwner, ownedReports } from "@/lib/local-workspace";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { priorityFor } from "@/lib/triage";
import { reviewQueue } from "@/lib/routing";
const input = z.object({
  description: z.string().trim().min(10).max(4000),
  category: z.enum([
    "Road damage",
    "Water or drainage",
    "Waste",
    "Obstruction",
    "Electrical",
    "Other",
  ]),
  latitude: z.number().min(12.65).max(13.3),
  longitude: z.number().min(77.2).max(77.95),
});
export async function GET() {
  if (localMode()) {
    const owner = await localOwner();
    return owner
      ? Response.json(
          { reports: ownedReports(owner) },
          { headers: { "Cache-Control": "no-store" } },
        )
      : Response.json(
          { error: "Start a local workspace first." },
          { status: 401 },
        );
  }
  const client = await authenticatedDatabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json({ error: "Google sign-in required" }, { status: 401 });
  const { data, error } = await client
    .from("civic_reports")
    .select(
      "id,description,category,latitude,longitude,status,priority,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return error
    ? Response.json({ error: "Could not retrieve reports" }, { status: 502 })
    : Response.json({ reports: data });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403 },
    );
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Provide a description, category and a valid Bengaluru location.",
      },
      { status: 400 },
    );
  if (localMode()) {
    const owner = await localOwner();
    if (!owner)
      return Response.json(
        { error: "Start a local workspace first." },
        { status: 401 },
      );
    const existing = ownedReports(owner).filter(
      (r) => Date.parse(r.created_at) > Date.now() - 3600000,
    );
    if (existing.length >= 5)
      return Response.json(
        { error: "Hourly report limit reached." },
        { status: 429 },
      );
    const policy = priorityFor(parsed.data.description);
    const report = {
      ...parsed.data,
      id: randomUUID(),
      status: "Submitted",
      priority: policy.priority,
      priorityReason: policy.reason,
      reviewQueue: reviewQueue(parsed.data.category),
      created_at: new Date().toISOString(),
      evidence: [],
      events: [
        {
          action: "Submitted",
          reason: "Original citizen submission",
          created_at: new Date().toISOString(),
        },
      ],
    };
    db()
      .prepare("INSERT INTO reports VALUES(?,?,?)")
      .run(report.id, owner, JSON.stringify(report));
    return Response.json(report, { status: 201 });
  }
  const client = await authenticatedDatabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json({ error: "Google sign-in required" }, { status: 401 });
  const { data, error } = await client
    .from("civic_reports")
    .insert({ ...parsed.data, owner_id: user.id })
    .select("id,status,created_at")
    .single();
  return error
    ? Response.json(
        { error: "Could not save your report. Please retry." },
        { status: 502 },
      )
    : Response.json(data, { status: 201 });
}
