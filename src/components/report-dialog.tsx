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
  transcript: string;
  model: string;
  tries: number;
  uncertainty: string[];
  observations: { claim: string; kind: string }[];
};
type Receipt = {
  id: string;
  priority: string;
  authority: string;
  evidence: string[];
  ai: "rated" | "declined" | "unavailable" | "failed";
};
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
  const [description, setDescription] = useState(""),
    [category, setCategory] = useState("Other"),
    [point, setPoint] = useState<Point | null>(null),
    [photo, setPhoto] = useState<File | null>(null),
    [voice, setVoice] = useState<File | null>(null),
    [voiceUrl, setVoiceUrl] = useState(""),
    [recording, setRecording] = useState(false),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [stage, setStage] = useState(-1),
    [seconds, setSeconds] = useState(0),
    [signedIn, setSignedIn] = useState(false),
    [mode, setMode] = useState(""),
    [guest, setGuest] = useState(false),
    [google, setGoogle] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [assessment, setAssessment] = useState<Assessment | null>(null);
  const busy = stage >= 0;
  const unsaved = !receipt && !!(description.trim() || photo || voice || point);
  const close = () => {
    if (busy) return;
    if (!unsaved || window.confirm("Discard this report?")) onClose();
  };
  const dialogRef = useDialog(close);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stages = [
    "Saving your report",
    ...(photo || voice ? ["Attaching your evidence"] : []),
    ...(aiReady && consent ? ["Gemini is rating severity. This can take up to a minute."] : []),
  ];
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
      .catch(() => setMessage("Could not check your session. Refresh and try again."));
  }, [configured]);
  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [busy, stage]);
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
  useEffect(
    () => () => {
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    },
    [voiceUrl],
  );
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
      setMessage(
        e instanceof Error && e.name !== "NotAllowedError"
          ? e.message
          : "Microphone access is off. Allow it, or add a photo or type your report.",
      );
    }
  }
  async function attach(id: string, file: File, label: string, saved: string[], notes: string[]) {
    const form = new FormData();
    form.set("reportId", id);
    form.set("file", file);
    form.set("purpose", "report");
    try {
      const upload = await fetch("/api/reports/evidence", { method: "POST", body: form });
      if (upload.ok) saved.push(label);
      else notes.push((await upload.json()).error || `The ${label.toLowerCase()} wasn’t saved. Add it again from My reports.`);
    } catch {
      notes.push(`The ${label.toLowerCase()} wasn’t saved. Add it again from My reports.`);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const written = description.trim();
    if (!photo && !voice && written.length < 10)
      return setMessage("Add a photo, record your voice, or write at least 10 characters.");
    if (!point) return setMessage("Place the issue on the map.");
    setMessage("");
    let step = 0;
    try {
      setStage(step);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description:
            written.length >= 10
              ? written
              : voice
                ? "Voice report. See the attached recording."
                : "Photo report. See the attached photo.",
          category,
          ...point,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw Error(body.error);
      const saved: Receipt = {
        id: body.id,
        priority: body.priority,
        authority: body.authority,
        evidence: [],
        ai: !aiReady ? "unavailable" : consent ? "failed" : "declined",
      };
      const notes: string[] = [];
      if (photo || voice) {
        setStage(++step);
        if (photo) await attach(body.id, photo, "Photo", saved.evidence, notes);
        if (voice) await attach(body.id, voice, "Voice note", saved.evidence, notes);
      }
      if (aiReady && consent) {
        setStage(++step);
        try {
          const analysis = await fetch("/api/reports/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: body.id, consent: true }),
          });
          const result = await analysis.json();
          if (analysis.ok) {
            setAssessment(result);
            saved.priority = result.severity;
            saved.authority = result.authority;
            saved.ai = "rated";
          } else if (result.error) notes.push(result.error);
        } catch {
          /* The receipt explains that the rating didn’t finish. */
        }
      }
      setReceipt(saved);
      setMessage(notes.join(" "));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not send your report. Try again.");
    } finally {
      setStage(-1);
    }
  }
  return (
    <div className="overlay modal-overlay">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <button className="close-button" aria-label="Close report form" onClick={close}>
          <X />
        </button>
        {receipt ? (
          <div className="result" role="status">
            <h2 id="report-title" className="result-severity" data-severity={receipt.priority}>
              {receipt.priority === "Unassessed" ? "Report saved" : `${receipt.priority} severity`}
            </h2>
            <CivicStamp english="Received" kannada="ಸ್ವೀಕರಿಸಲಾಗಿದೆ" />
            <p className="result-route">Assigned to the review queue for {receipt.authority}</p>
            {message && <div className="notice">{message}</div>}
            <dl>
              {assessment && (
                <>
                  <dt>Why this rating</dt>
                  <dd>{assessment.severityReason}</dd>
                  <dt>What AI found</dt>
                  <dd>{assessment.summary}</dd>
                  {assessment.transcript && (
                    <>
                      <dt>What you said</dt>
                      <dd>{assessment.transcript}</dd>
                    </>
                  )}
                  {assessment.observations.length > 0 && (
                    <>
                      <dt>Evidence used</dt>
                      <dd>
                        <ul>
                          {assessment.observations.map((item) => (
                            <li key={item.claim}>
                              {item.kind}: {item.claim}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </>
                  )}
                  {assessment.uncertainty.length > 0 && (
                    <>
                      <dt>What’s uncertain</dt>
                      <dd>{assessment.uncertainty.join(" ")}</dd>
                    </>
                  )}
                  <dt>Checked by</dt>
                  <dd>
                    {assessment.model}
                    {assessment.tries > 1 ? ", after a second attempt" : ""}. Provisional, needs human verification.
                  </dd>
                </>
              )}
              {receipt.ai !== "rated" && (
                <>
                  <dt>AI rating</dt>
                  <dd>
                    {receipt.ai === "declined"
                      ? "Not used, so nothing went to Google."
                      : receipt.ai === "unavailable"
                        ? "Not available right now."
                        : "Didn’t finish. You can try again from My reports."}{" "}
                    Your report is saved, and keyword rules set its priority and queue.
                  </dd>
                </>
              )}
              <dt>Evidence saved</dt>
              <dd>{receipt.evidence.length ? receipt.evidence.join(" and ") : "None attached"}</dd>
              <dt>Tracking ID</dt>
              <dd>{receipt.id}</dd>
              <dt>What happens next</dt>
              <dd>
                Follow this report in My reports. CivicLens staff accounts can review it
                there, and you can download its handoff packet to give to the authority
                yourself. CivicLens doesn’t deliver it, and a response isn’t guaranteed.
              </dd>
            </dl>
            <button className="primary full-width" onClick={onSaved}>
              Track this report
            </button>
          </div>
        ) : (
          <>
            <h2 id="report-title">Report an issue in Bengaluru</h2>
            <p>
              Show it or say it. CivicLens assigns it to the responsible
              authority’s review queue and prepares a handoff packet. It doesn’t
              deliver reports to government authorities.
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
                {message && <div className="notice">{message}</div>}
                <div className="slip-spacer" />
              </>
            ) : (
              <form onSubmit={submit}>
                <fieldset className="slip-columns" disabled={busy}>
                  <div>
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
                          {recording ? "Stop" : voice ? "Record again" : "Record, 60s"}
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
                            {c === "Other" ? (aiReady && consent ? "Not sure, let AI decide" : "Not sure, use my words to decide") : c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div>
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
                                return setMessage(
                                  "You appear to be outside Bengaluru. Select the issue’s location on the map.",
                                );
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
                        Use my location
                      </button>
                      <span className="muted" aria-live="polite">
                        {point
                          ? `Pin placed at ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
                          : "Tap the map, or use the arrow keys and press Enter"}
                      </span>
                    </div>
                    <p className="muted location-note">
                      The exact pin is visible only to you, officers of the assigned
                      authority and admins. The public sees a location rounded to about
                      a kilometre.
                    </p>
                  </div>
                </fieldset>
                <div className="slip-actions">
                  {busy ? (
                    <ol className="ai-progress" aria-live="polite">
                      {stages.map((label, index) => (
                        <li
                          key={label}
                          data-state={index < stage ? "done" : index === stage ? "active" : undefined}
                        >
                          {index === stage && <Loader2 className="spin" size={15} />}
                          {label}
                          {index === stage && <time>{seconds}s</time>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <>
                      {aiReady && (
                        <label className="consent-row">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                          />
                          <span>
                            Rate this with AI (optional). If you tick this, your
                            words, photo and voice note go to Google, and free-tier
                            inputs may be used for product improvement. If you
                            don’t, nothing goes to Google and keyword rules are
                            used instead. Your report is saved either way.
                          </span>
                        </label>
                      )}
                      <p className="muted">
                        The public dashboard shows the issue type, severity,
                        authority, status and rough area. Your words, photo,
                        voice and exact location stay private.{" "}
                        <a href="/privacy" target="_blank" rel="noreferrer">
                          Privacy policy
                        </a>
                      </p>
                      <p className="muted">
                        Reporting as a guest? Your reports stay linked to this browser
                        session. If you clear it, you lose access to them.
                      </p>
                      {message && (
                        <div className="notice" role="alert">
                          {message}
                        </div>
                      )}
                    </>
                  )}
                  <button className="primary full-width" disabled={busy || recording}>
                    {busy ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
