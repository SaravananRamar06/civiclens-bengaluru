import "server-only";
import { authenticatedDatabase } from "./supabase";
import { permittedTransitions } from "./report-policy";
import { priorityFor } from "./triage";

export class ApiError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
export function apiFailure(error: unknown) {
  return Response.json({ error: error instanceof ApiError ? error.message : "Service unavailable. Your saved records are unchanged; please retry." },
    { status: error instanceof ApiError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
}
export async function cloudIdentity() {
  const client = await authenticatedDatabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new ApiError("Sign in to access your reports.", 401);
  const membership = await client.from("civic_operators").select("role,authority").eq("user_id", user.id).maybeSingle();
  if (membership.error) throw new ApiError("Could not verify review permissions.");
  return { client, user, isOperator: !!membership.data, role: membership.data?.role as "admin" | "officer" | undefined, authority: (membership.data?.authority ?? null) as string | null };
}
export type CloudIdentity = Awaited<ReturnType<typeof cloudIdentity>>;
export const reportSelection = "id,owner_id,description,category,authority,latitude,longitude,status,priority,analysis,created_at,civic_evidence(id,mime_type,byte_size,purpose,status,created_at),civic_events(action,reason,created_at)";
type Row = {
  id: string; owner_id: string; description: string; category: string; authority: string; status: string; priority: string;
  latitude: number; longitude: number; created_at: string; analysis: { severityReason?: string } | null;
  civic_evidence: { id: string; mime_type: string; byte_size: number; purpose: string; status: string; created_at: string }[];
  civic_events: { action: string; reason: string; created_at: string }[];
};
export function cloudReport(row: Row, identity: CloudIdentity) {
  return {
    id: row.id, description: row.description, category: row.category, status: row.status, priority: row.priority,
    latitude: row.latitude, longitude: row.longitude, created_at: row.created_at, analysis: row.analysis,
    priorityReason: row.analysis?.severityReason ?? priorityFor(row.description).reason, authority: row.authority,
    evidence: row.civic_evidence.filter(e => e.status === "ready").map(e => ({ id: e.id, type: e.mime_type, size: e.byte_size, purpose: e.purpose, created_at: e.created_at })),
    events: row.civic_events.sort((a,b) => a.created_at.localeCompare(b.created_at)),
    allowedTransitions: permittedTransitions(row.status, row.owner_id === identity.user.id, identity.role === "admin" || (identity.role === "officer" && identity.authority === row.authority)),
    canAnalyze: row.owner_id === identity.user.id,
  };
}
export async function readCloudReport(id: string, identity: CloudIdentity) {
  const { data, error } = await identity.client.from("civic_reports").select(reportSelection).eq("id", id).maybeSingle();
  if (error || !data) throw new ApiError("Report unavailable", 404);
  return cloudReport(data, identity);
}
