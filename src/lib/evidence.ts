export const evidenceFormats: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav",
};
export function validEvidenceBytes(type: string, bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (!b.length || b.length > 5 * 1024 * 1024) return false;
  switch(type) {
    case "image/jpeg": return b[0] === 255 && b[1] === 216 && b[2] === 255;
    case "image/png": return b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    case "image/webp": return b.subarray(0,4).toString() === "RIFF" && b.subarray(8,12).toString() === "WEBP";
    case "audio/webm": return b.subarray(0,4).equals(Buffer.from([26,69,223,163]));
    case "audio/ogg": return b.subarray(0,4).toString() === "OggS";
    case "audio/mpeg": return b.subarray(0,3).toString() === "ID3" || (b[0] === 255 && (b[1] & 224) === 224);
    case "audio/mp4": return b.subarray(4,8).toString() === "ftyp";
    case "audio/wav": return b.subarray(0,4).toString() === "RIFF" && b.subarray(8,12).toString() === "WAVE";
    default: return false;
  }
}
export async function boundedFormData(request: Request) {
  const limit = 6 * 1024 * 1024;
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing upload");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("Upload too large"); }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
}
