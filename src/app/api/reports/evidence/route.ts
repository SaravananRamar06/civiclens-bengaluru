import { sameOrigin } from "@/lib/request-security";
import { localMode, localOwner, ownedReport } from "@/lib/local-workspace";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
const formats: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
};
export async function POST(request: Request) {
  if (!localMode() || !sameOrigin(request))
    return Response.json(
      { error: "Local same-origin request required" },
      { status: 403 },
    );
  const owner = await localOwner();
  if (!owner)
    return Response.json({ error: "Local receipt required" }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
    return Response.json(
      { error: "Evidence must be under 5 MB." },
      { status: 413 },
    );
  const form = await request.formData();
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
  if (
    (file.type === "image/jpeg" && !(bytes[0] === 255 && bytes[1] === 216)) ||
    (file.type === "image/png" &&
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (file.type === "image/webp" && bytes.subarray(8, 12).toString() !== "WEBP")
  )
    return Response.json(
      { error: "Image content does not match its file type." },
      { status: 400 },
    );
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
  if (!localMode())
    return Response.json({ error: "Unavailable" }, { status: 404 });
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
