import { sameOrigin } from "@/lib/request-security";
import { localMode, localOwner, ownedReport } from "@/lib/local-workspace";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { evidenceFormats as formats, validEvidenceBytes, boundedFormData } from "@/lib/evidence";
import { cloudIdentity, apiFailure, ApiError } from "@/lib/cloud-reports";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Local same-origin request required" },
      { status: 403 },
    );
  if (!localMode()) return cloudUpload(request);
  const owner = await localOwner();
  if (!owner)
    return Response.json({ error: "Local receipt required" }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
    return Response.json(
      { error: "Evidence must be under 5 MB." },
      { status: 413 },
    );
  let form: FormData;
  try { form = await boundedFormData(request); } catch { return Response.json({ error: "Invalid upload or upload exceeds 6 MB." }, { status: 400 }); }
  const id = String(form.get("reportId") || ""),
    file = form.get("file");
  let report = ownedReport(id, owner);
  const purpose =
    form.get("purpose") === "resolution" ? "resolution" : "report";
  if (!report)
    return Response.json({ error: "Report unavailable" }, { status: 404 });
  if (
    !(file instanceof File) ||
    file.size > 5 * 1024 * 1024 ||
    !formats[file.type]
  )
    return Response.json(
      { error: "Use a supported image or audio file under 5 MB." },
      { status: 400 },
    );
  if (report.evidence.length >= 4)
    return Response.json(
      { error: "Maximum four attachments per report." },
      { status: 400 },
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validEvidenceBytes(file.type, bytes))
    return Response.json({ error: "Evidence content does not match its file type." }, { status: 400 });
  const evidenceId = randomUUID(),
    name = evidenceId + "." + formats[file.type];
  await mkdir(join(process.env.CIVIC_DATA_DIR || ".data", "evidence"), {
    recursive: true,
  });
  await writeFile(
    join(join(process.env.CIVIC_DATA_DIR || ".data", "evidence"), name),
    bytes,
    { flag: "wx" },
  );
  report = ownedReport(id, owner);
  if (!report || report.evidence.length >= 4) {
    await unlink(join(process.env.CIVIC_DATA_DIR || ".data", "evidence", name));
    return Response.json({ error: "Report unavailable or attachment limit reached." }, { status: 409 });
  }
  report.evidence.push({
    id: evidenceId,
    name,
    type: file.type,
    purpose,
    size: file.size,
    created_at: new Date().toISOString(),
  });
  report.events.push({
    action: "Evidence attached",
    reason: file.type,
    created_at: new Date().toISOString(),
  });
  db()
    .prepare("UPDATE reports SET payload=? WHERE id=? AND owner=?")
    .run(JSON.stringify(report), id, owner);
  return Response.json({ id: evidenceId }, { status: 201 });
}
export async function GET(request: Request) {
  if (!localMode()) return cloudDownload(request);
  const owner = await localOwner();
  if (!owner)
    return Response.json({ error: "Receipt required" }, { status: 401 });
  const params = new URL(request.url).searchParams,
    report = ownedReport(params.get("reportId") || "", owner);
  const evidence = report?.evidence.find(
    (e: { id: string }) => e.id === params.get("id"),
  );
  if (!evidence)
    return Response.json({ error: "Evidence unavailable" }, { status: 404 });
  const bytes = await readFile(
    join(
      join(process.env.CIVIC_DATA_DIR || ".data", "evidence"),
      evidence.name,
    ),
  );
  return new Response(bytes, {
    headers: {
      "Content-Type": evidence.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

async function cloudUpload(request: Request) {
  try {
    const { client } = await cloudIdentity();
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) throw new ApiError("Evidence must be under 5 MB.", 413);
    let form: FormData;
    try { form = await boundedFormData(request); } catch { throw new ApiError("Invalid upload or upload exceeds 6 MB.", 400); }
    const id = String(form.get("reportId") || ""), file = form.get("file");
    const purpose = form.get("purpose") === "resolution" ? "resolution" : "report";
    if (!(file instanceof File) || !formats[file.type] || file.size > 5 * 1024 * 1024 || !file.size) throw new ApiError("Use a supported image or audio file under 5 MB.", 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validEvidenceBytes(file.type, bytes) || (purpose === "resolution" && !file.type.startsWith("image/"))) throw new ApiError("File content must match its media type; resolution evidence must be a photograph.", 400);
    const { data: reservation, error } = await client.rpc("civic_reserve_evidence", { target: id, media_type: file.type, bytes: file.size, evidence_purpose: purpose });
    if (error) throw new ApiError("Report unavailable or maximum four attachments reached.", 409);
    const bucket = client.storage.from("civic-evidence");
    const uploaded = await bucket.upload(reservation.path, bytes, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      await client.rpc("civic_cancel_evidence", { target: reservation.id });
      throw new ApiError("Upload failed. Please retry; the report remains saved.", 502);
    }
    const finished = await client.rpc("civic_finish_evidence", { target: reservation.id });
    if (finished.error) {
      // A lost response may follow a successful commit. Never remove ready evidence.
      const check = await client.from("civic_evidence").select("status").eq("id", reservation.id).maybeSingle();
      if (check.data?.status !== "ready") {
        if (!check.error) {
          await bucket.remove([reservation.path]);
          await client.rpc("civic_cancel_evidence", { target: reservation.id });
        }
        throw new ApiError("Evidence could not be finalized. Refresh and retry.", 502);
      }
    }
    return Response.json({ id: reservation.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
async function cloudDownload(request: Request) {
  try {
    const { client } = await cloudIdentity();
    const params = new URL(request.url).searchParams;
    const { data: evidence, error } = await client.from("civic_evidence").select("object_path,mime_type")
      .eq("id", params.get("id") || "").eq("report_id", params.get("reportId") || "").eq("status", "ready").maybeSingle();
    if (error || !evidence) throw new ApiError("Evidence unavailable", 404);
    const { data, error: unavailable } = await client.storage.from("civic-evidence").download(evidence.object_path);
    if (unavailable || !data) throw new ApiError("Evidence unavailable", 404);
    return new Response(data, { headers: { "Content-Type": evidence.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox", "Content-Disposition": "inline" } });
  } catch (error) { return apiFailure(error); }
}
