import { sameOrigin } from "@/lib/request-security";
import { z } from "zod";
import { cloudIdentity, cloudReport, readCloudReport, reportSelection, apiFailure, ApiError } from "@/lib/cloud-reports";
import { permittedTransitions } from "@/lib/report-policy";
import { localMode, localOwner, ownedReports } from "@/lib/local-workspace";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { priorityFor } from "@/lib/triage";
import { authorityFor, inferCategory, reportCategories } from "@/lib/routing";
const input = z.object({
  description: z.string().trim().min(10).max(4000),
  category: z.enum(reportCategories),
  latitude: z.number().min(12.65).max(13.3),
  longitude: z.number().min(77.2).max(77.95),
});
export async function GET(request: Request) {
  if (localMode()) {
    const owner = await localOwner();
    return owner
      ? Response.json(
          { reports: ownedReports(owner).map(r => ({ ...r, allowedTransitions: permittedTransitions(r.status, true, true), canAnalyze: true })), mode: "local-receipt", isOperator: false },
          { headers: { "Cache-Control": "no-store" } },
        )
      : Response.json(
          { error: "Start a local workspace first." },
          { status: 401 },
        );
  }
  try {
    const identity = await cloudIdentity();
    const scope = new URL(request.url).searchParams.get("scope");
    if (scope === "review" && !identity.isOperator) throw new ApiError("Operator access required", 403);
    let query = identity.client.from("civic_reports").select(reportSelection).order("created_at", { ascending: false }).limit(100);
    if (scope !== "review") query = query.eq("owner_id", identity.user.id);
    else if (identity.role === "officer") query = query.eq("authority", identity.authority!);
    const { data, error } = await query;
    if (error) throw new ApiError("Could not retrieve reports", 502);
    const order = ["Critical", "High", "Medium", "Low", "Unassessed"];
    const rows = scope === "review" ? [...data].sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority)) : data;
    return Response.json({ reports: rows.map(r => cloudReport(r, identity)), mode: "cloud", isOperator: identity.isOperator }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error); }
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
  if (parsed.data.category === "Other")
    parsed.data.category = inferCategory(parsed.data.description);
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
      authority: authorityFor(parsed.data.category, parsed.data.description),
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
  try {
    const identity = await cloudIdentity();
    const { data, error } = await identity.client.from("civic_reports")
      .insert({ ...parsed.data, owner_id: identity.user.id }).select("id").single();
    if (error) throw new ApiError(error.message.includes("Hourly report limit") ? "Hourly report limit reached." : "Could not save your report. Please retry.", error.message.includes("Hourly report limit") ? 429 : 502);
    return Response.json(await readCloudReport(data.id, identity), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
