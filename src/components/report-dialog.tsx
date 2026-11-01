"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Mic, Square, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useDialog } from "./use-dialog";
import CivicStamp from "./civic-stamp";
import { validBengaluruPoint } from "@/lib/triage";
import { reportCategories } from "@/lib/routing";
import type { Point } from "./location-picker";
const LocationPicker = dynamic(() => import("./location-picker"), {
  ssr: false,
  loading: () => (
    <div className="location-picker map-loading">
      <Loader2 className="spin" /> Loading map
    </div>
  ),
});
type Assessment = {
  summary: string;
  severity: string;
  severityReason: string;
  authority: string;
  uncertainty: string[];
};
type Receipt = { id: string; priority: string; authority: string };
export default function ReportDialog({
  onClose,
  onSaved,
  configured,
  aiReady,
}: {
  onClose: () => void;
  onSaved: () => void;
  configured: boolean;
  aiReady: boolean;
}) {
  const dialogRef = useDialog(onClose);
  const [description, setDescription] = useState(""),
    [category, setCategory] = useState("Other"),
    [point, setPoint] = useState<Point | null>(null),
    [photo, setPhoto] = useState<File | null>(null),
    [voice, setVoice] = useState<File | null>(null),
    [voiceUrl, setVoiceUrl] = useState(""),
    [recording, setRecording] = useState(false),
    [consent, setConsent] = useState(true),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [mode, setMode] = useState(""),
    [guest, setGuest] = useState(false),
    [google, setGoogle] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [assessment, setAssessment] = useState<Assessment | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    fetch("/api/session")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.error || "Could not verify your session.");
        return body;
      })
      .then((d) => {
        setSignedIn(d.signedIn);
        setMode(d.mode || "cloud");
        setGuest(!!d.guest);
        setGoogle(!!d.google);
      })
      .catch(() =>
        setMessage("Could not verify your session. Please try again."),
      );
  }, [configured]);
  useEffect(
    () => () => {
      if (limit.current) clearTimeout(limit.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  useEffect(() => () => {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
  }, [voiceUrl]);
  async function start() {
    const res = await fetch("/api/session", { method: "POST" });
    const body = await res.json();
    if (res.ok) setSignedIn(true);
    else setMessage(body.error);
  }
  async function toggleRecording() {
    if (recording) return recorder.current?.stop();
    try {
      if (!window.MediaRecorder || !navigator.mediaDevices)
        throw Error("Voice recording isn’t available in this browser. Add a photo or type your report.");
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream.current),
        chunks: BlobPart[] = [];
      recorder.current = media;
      media.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      media.onstop = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        if (limit.current) clearTimeout(limit.current);
        setRecording(false);
        const type = media.mimeType.split(";")[0] || "audio/webm";
        const file = new File(chunks, "voice-report.webm", { type });
        setVoice(file);
        setVoiceUrl(URL.createObjectURL(file));
      };
      media.start();
      setRecording(true);
      setMessage("");
      limit.current = setTimeout(() => media.state === "recording" && media.stop(), 60000);
    } catch (e) {
      setMessage(e instanceof Error && e.name !== "NotAllowedError" ? e.message : "Microphone access is off. Allow it, or add a photo or type your report.");
    }
  }
  async function attach(id: string, file: File, notes: string[]) {
    const form = new FormData();
    form.set("reportId", id);
    form.set("file", file);
    form.set("purpose", "report");
    const upload = await fetch("/api/reports/evidence", { method: "POST", body: form });
    if (!upload.ok)
      notes.push((await upload.json()).error || "An attachment failed. Add it again from My reports.");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const written = description.trim();
    if (!photo && !voice && written.length < 10)
      return setMessage("Add a photo, record your voice, or write at least 10 characters.");
    if (!point) return setMessage("Place the issue on the map.");
    setMessage("");
    try {
      setBusy("Saving your report…");
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: written.length >= 10 ? written : voice ? "Voice report. See the attached recording." : "Photo report. See the attached photo.",
          category,
          ...point,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw Error(body.error);
      setReceipt({ id: body.id, priority: body.priority, authority: body.authority });
      const notes: string[] = [];
      if (photo) {
        setBusy("Attaching your photo…");
        await attach(body.id, photo, notes);
      }
      if (voice) {
        setBusy("Attaching your voice note…");
        await attach(body.id, voice, notes);
      }
      if (aiReady && consent) {
        setBusy("Rating severity and routing…");
        const analysis = await fetch("/api/reports/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: body.id, consent: true }),
        });
        const result = await analysis.json();
        if (analysis.ok) {
          setAssessment(result);
          setReceipt({ id: body.id, priority: result.severity, authority: result.authority });
        } else notes.push(result.error);
      }
      setMessage(notes.join(" "));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not submit your report.");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="overlay modal-overlay" onClick={onClose}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" aria-label="Close report form" onClick={onClose}>
          <X />
        </button>
        <h2 id="report-title">Report an issue in Bengaluru</h2>
        <p>
          Show it or say it. CivicLens rates the severity and sends it to the
          authority responsible.
        </p>
        {!signedIn ? (
          <>
            <div className="notice">
              {!mode
                ? "Checking your session…"
                : mode === "local-receipt" || guest
                  ? "No account needed."
                  : google
                    ? "Sign in with Google to file a report and follow its review."
                    : "Reporting is not available right now. You can still explore the public record."}
            </div>
            {(mode === "local-receipt" || guest) && (
              <button className="primary full-width" onClick={start}>
                Continue without an account
              </button>
            )}
            {mode === "cloud" && google && (
              <a className="text-button" href="/auth/signin">
                Continue with Google
              </a>
            )}
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="evidence-inputs">
              <label className="field-label">
                Photo
                <input
                  className="report-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      e.target.value = "";
                      setPhoto(null);
                      return setMessage("Choose a photo under 5 MB.");
                    }
                    setPhoto(file);
                  }}
                />
              </label>
              <div className="field-label">
                Voice note
                <button
                  className="secondary voice-button"
                  type="button"
                  data-recording={recording ? "" : undefined}
                  onClick={toggleRecording}
                >
                  {recording ? <Square size={16} /> : <Mic size={16} />}
                  {recording ? "Stop recording" : voice ? "Record again" : "Record, up to 60s"}
                </button>
              </div>
            </div>
            {voiceUrl && <audio className="voice-preview" controls src={voiceUrl} />}
            <label className="field-label">
              Anything to add? Optional with a photo or voice note.
              <textarea
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What’s wrong? Leave out personal details."
              />
            </label>
            <label className="field-label">
              Type of issue
              <select
                className="report-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {reportCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === "Other" ? (aiReady ? "Not sure, let AI decide" : "Other") : c}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-label">
              Where is it?
              <LocationPicker value={point} onChange={setPoint} />
            </div>
            <div className="location-row">
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  if (!navigator.geolocation)
                    return setMessage("Location is unavailable here. Select the place on the map.");
                  navigator.geolocation.getCurrentPosition(
                    ({ coords: { latitude, longitude } }) => {
                      if (!validBengaluruPoint(latitude, longitude))
                        return setMessage("You appear to be outside Bengaluru. Select the issue’s location on the map.");
                      setPoint({
                        latitude: Number(latitude.toFixed(6)),
                        longitude: Number(longitude.toFixed(6)),
                      });
                    },
                    () => setMessage("Location permission is off. Select the place on the map."),
                  );
                }}
              >
                <MapPin size={16} />
                Use my current location
              </button>
              <span className="muted">
                {point
                  ? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
                  : "Tap the map to place a pin"}
              </span>
            </div>
            {aiReady && (
              <label className="consent-row">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Rate severity with AI. Your words, photo and voice note go to
                  Google. Free-tier inputs may be used for product improvement.
                </span>
              </label>
            )}
            <p className="muted">
              The public dashboard shows the issue type, severity, authority,
              status and rough area. Your words, photo, voice and exact
              location stay private.
            </p>
            <button
              className="primary full-width"
              disabled={!!busy || !!receipt || recording}
            >
              {busy && <Loader2 className="spin" size={16} />}
              {busy || "Send report"}
            </button>
          </form>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        {assessment && (
          <div className="analysis-result">
            <strong>{assessment.severity} severity, provisional AI assessment</strong>
            <p>{assessment.severityReason}</p>
            <p>{assessment.summary}</p>
            {assessment.uncertainty.length > 0 && (
              <p>Uncertainty: {assessment.uncertainty.join("; ")}</p>
            )}
          </div>
        )}
        {receipt && !busy && (
          <div className="slip-receipt">
            <CivicStamp english="Received" kannada="ಸ್ವೀಕರಿಸಲಾಗಿದೆ" className="slip-stamp" />
            <strong>Routed to {receipt.authority}</strong>
            <p className="muted">Severity: {receipt.priority}</p>
            <p className="muted">Tracking ID: {receipt.id}</p>
            <button className="primary full-width" onClick={onSaved}>
              Track this report
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
