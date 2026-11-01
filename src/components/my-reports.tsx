"use client";
import { useEffect, useRef, useState } from "react";
import AnalysisControls, { type LocalAnalysis } from "./analysis-controls";
import { relatedReports } from "@/lib/spatial";
import {
  FileText,
  Plus,
  ShieldCheck,
  Loader2,
  Mic,
  Paperclip,
  RefreshCw,
  Square,
} from "lucide-react";
type Report = {
  id: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  priorityReason?: string;
  reviewQueue?: string;
  analysis?: LocalAnalysis;
  latitude: number;
  longitude: number;
  created_at: string;
  evidence?: { id: string; type: string; size: number }[];
  allowedTransitions?: string[];
  canAnalyze?: boolean;
  events?: { action: string; reason: string; created_at: string }[];
};
const transitions: Record<string, string[]> = {
  Submitted: ["Acknowledged"],
  Acknowledged: ["In progress"],
  "In progress": ["Handoff prepared", "Resolution proposed"],
  "Handoff prepared": ["Resolution proposed"],
  "Resolution proposed": ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Reopened: ["Acknowledged"],
};
export default function MyReports({ onReport }: { onReport: () => void }) {
  const [reports, setReports] = useState<Report[]>([]),
    [message, setMessage] = useState(""),
    [mode, setMode] = useState(""),
    [isOperator, setIsOperator] = useState(false),
    [review, setReview] = useState(false);
  const refresh = () =>
    fetch("/api/reports" + (review ? "?scope=review" : ""), {
      cache: "no-store",
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.error);
        setReports(body.reports);
        setMode(body.mode);
        setIsOperator(body.isOperator);
        setMessage("");
      })
      .catch((e) => {
        setReports([]);
        setMessage(e.message);
      });
  useEffect(() => {
    refresh();
  }, [review]);
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((s) => {
        setMode(s.mode);
        setIsOperator(!!s.isOperator);
      })
      .catch(() => {});
  }, []);
  return (
    <section className="panel my-reports">
      <div className="panel-heading">
        <div>
          <h2>
            {review ? "Operator review queue" : "My reports"}{" "}
            <span className="count-pill">{reports.length}</span>
          </h2>
          <p>
            {mode === "local-receipt"
              ? "Private reports owned by this browser receipt. Local review actions are not government actions."
              : "Private cloud reports. Project operators review evidence; citizens confirm closure. No government acceptance is implied."}
          </p>
        </div>
        <button className="text-button" onClick={refresh}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      <div className="local-actions">
        {isOperator && (
          <button className="text-button" onClick={() => setReview(!review)}>
            {review ? "Show my reports" : "Open operator review queue"}
          </button>
        )}
        {mode === "cloud" && (
          <>
            <a className="text-button" href="/auth/signin">
              Google sign-in
            </a>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  const response = await fetch("/api/session", {
                    method: "DELETE",
                  });
                  if (!response.ok) throw Error("Could not sign out");
                  setReports([]);
                  setIsOperator(false);
                  setReview(false);
                  setMessage("Signed out.");
                } catch {
                  setMessage("Could not sign out. Please retry.");
                }
              }}
            >
              Sign out
            </button>
          </>
        )}
      </div>
      {reports.length > 0 && (
        <p className="muted">Showing up to 100 recent reports in this view.</p>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
          <button className="text-button" onClick={onReport}>
            Start a report
          </button>
        </div>
      )}
      {!reports.length && !message && (
        <div className="empty">
          <FileText size={27} />
          <h3>Your first report starts here.</h3>
          <p>
            Report a civic issue in Bengaluru. Your submissions and their review
            history will appear here.
          </p>
          <button className="primary" onClick={onReport}>
            <Plus size={16} />
            Report an issue
          </button>
        </div>
      )}
      {reports.map((report) => (
        <LocalCase
          key={report.id}
          report={report}
          reports={reports}
          onUpdate={refresh}
        />
      ))}
    </section>
  );
}
function LocalCase({
  report: r,
  reports,
  onUpdate,
}: {
  report: Report;
  reports: Report[];
  onUpdate: () => void;
}) {
  const options = r.allowedTransitions ?? transitions[r.status] ?? [];
  const [status, setStatus] = useState(options[0] || ""),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    stream = useRef<MediaStream | null>(null);
  useEffect(() => {
    setStatus(options[0] || "");
  }, [r.status, options.join(",")]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function upload(file: File, purpose = "report") {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("reportId", r.id);
      form.set("file", file);
      form.set("purpose", purpose);
      const response = await fetch("/api/reports/evidence", {
          method: "POST",
          body: form,
        }),
        data = await response.json();
      if (!response.ok) throw Error(data.error);
      setMessage("Private evidence saved.");
      onUpdate();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      if (!window.MediaRecorder || !navigator.mediaDevices)
        throw Error("Recording unavailable. Upload an audio file instead.");
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const media = new MediaRecorder(stream.current),
        chunks: BlobPart[] = [];
      recorder.current = media;
      media.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      media.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        setRecording(false);
        const type = media.mimeType.split(";")[0] || "audio/webm";
        upload(new File(chunks, "voice-report.webm", { type }));
      };
      media.start();
      setRecording(true);
      timer.current = setTimeout(
        () => media.state === "recording" && media.stop(),
        60000,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Microphone access unavailable.",
      );
    }
  }
  return (
    <article className="local-case">
      <div className="local-case-heading">
        <span
          className={`status ${r.status === "Closed" ? "closed" : "pending"}`}
        >
          {r.status}
        </span>
        <span className="private-badge">
          <ShieldCheck size={13} />
          Private report
        </span>
        <span className="review-status">
          {r.priority} · provisional policy assessment
        </span>
        <time>{new Date(r.created_at).toLocaleString("en-IN")}</time>
      </div>
      <h3>{r.category}</h3>
      {relatedReports(r, reports).length > 0 && (
        <p className="notice">
          Possible related reports in your private workspace:{" "}
          {relatedReports(r, reports)
            .map((item) => `${item.id.slice(0, 8)} (${item.distance} m)`)
            .join(", ")}
          . Proximity does not establish that these are the same issue.
        </p>
      )}
      <span className="capability-tag">
        Project queue: {r.reviewQueue || "General civic review"}
      </span>
      <p>{r.description}</p>
      <small className="muted">
        {r.priorityReason} · Tracking ID {r.id}
      </small>
      <div className="evidence-grid">
        {r.evidence?.map((e) => {
          const url = `/api/reports/evidence?reportId=${r.id}&id=${e.id}`;
          return e.type.startsWith("image/") ? (
            <a key={e.id} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="Private report evidence" />
            </a>
          ) : (
            <audio key={e.id} controls src={url} />
          );
        })}
      </div>
      <div className="local-actions">
        <label className="upload-button">
          <Paperclip size={15} />
          Attach photo or audio
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
        <button
          className="text-button"
          disabled={busy}
          onClick={toggleRecording}
        >
          {recording ? <Square size={15} /> : <Mic size={15} />}
          {recording ? "Stop recording (60s maximum)" : "Record English voice"}
        </button>
        <a
          className="text-button"
          href={`/api/reports/export?id=${r.id}`}
          download
        >
          Download handoff
        </a>
      </div>
      {options.length > 0 ? (
        <form
          className="transition-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const response = await fetch("/api/reports/transition", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: r.id, status, reason }),
                }),
                data = await response.json();
              if (!response.ok) throw Error(data.error);
              setReason("");
              setMessage("Review action recorded.");
              onUpdate();
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Could not update review.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <select
            className="report-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {options.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            className="report-input"
            placeholder="Reason / evidence for this review action"
            required
            minLength={3}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button className="primary" disabled={busy || recording}>
            {busy ? <Loader2 className="spin" size={15} /> : null}Record action
          </button>
        </form>
      ) : (
        <p className="muted">
          No review action is currently available to your account. A project
          operator must advance the report before citizen verification.
        </p>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <label className="upload-button">
        Attach a real resolution photo
        <input
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file, "resolution");
            e.target.value = "";
          }}
        />
      </label>
      {r.canAnalyze !== false && (
        <AnalysisControls id={r.id} analysis={r.analysis} onUpdate={onUpdate} />
      )}
      <details>
        <summary>Review activity · {r.events?.length || 0} events</summary>
        {r.events?.map((e, i) => (
          <div className="timeline-event" key={i}>
            <strong>{e.action}</strong>
            <span>{e.reason}</span>
            <time>{new Date(e.created_at).toLocaleString("en-IN")}</time>
          </div>
        ))}
      </details>
    </article>
  );
}
