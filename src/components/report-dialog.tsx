"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, MapPin, X, ShieldCheck } from "lucide-react";
import { useDialog } from "./use-dialog";
export default function ReportDialog({
  onClose,
  onSaved,
  configured,
}: {
  onClose: () => void;
  onSaved: () => void;
  configured: boolean;
}) {
  const dialogRef = useDialog(onClose);
  const [description, setDescription] = useState(""),
    [category, setCategory] = useState("Road damage"),
    [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [mode, setMode] = useState(""),
    [reportId, setReportId] = useState("");
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
      })
      .catch(() =>
        setMessage("Could not verify your session. Please retry sign-in."),
      );
  }, [configured]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          category,
          latitude: Number(latitude),
          longitude: Number(longitude),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw Error(body.error);
      setReportId(body.id);
      setMessage(
        "Your report has been saved. Keep the tracking ID below. Evidence upload and analysis are separate steps.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not submit your report.",
      );
    } finally {
      setBusy(false);
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
        <button
          className="close-button"
          aria-label="Close report form"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="modal-emblem">
          <MapPin size={25} />
        </div>
        <span className="section-kicker">YOUR CITY. YOUR VOICE.</span>
        <h2 id="report-title">Make the issue visible.</h2>
        <p>
          Submit genuine evidence of a local civic issue in Bengaluru. Your
          identity and exact location remain private.
        </p>
        <div className="privacy-strip">
          <ShieldCheck size={17} />
          <span>
            Private evidence. A traceable review. No personal details required
            in your description.
          </span>
        </div>
        {!signedIn ? (
          <>
            <div className="notice">
              {!mode
                ? "Checking your private session…"
                : mode === "local-receipt"
                  ? "Start a private local workspace to submit and track reports."
                  : "Sign in with Google to save private reports and follow their review history."}
            </div>
            {mode === "local-receipt" && (
              <button
                className="primary full-width"
                onClick={async () => {
                  const res = await fetch("/api/session", { method: "POST" });
                  const body = await res.json();
                  if (res.ok) setSignedIn(true);
                  else setMessage(body.error);
                }}
              >
                Continue in local workspace <ArrowRight size={16} />
              </button>
            )}
            {mode === "cloud" && (
              <a className="text-button" href="/auth/signin">
                Continue with Google <ArrowRight size={16} />
              </a>
            )}
          </>
        ) : (
          <form onSubmit={submit}>
            <label className="field-label">
              Issue category
              <select
                className="report-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "Road damage",
                  "Water or drainage",
                  "Waste",
                  "Obstruction",
                  "Electrical",
                  "Other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              What did you observe?
              <textarea
                required
                minLength={10}
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue without personal information."
              />
            </label>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                if (!navigator.geolocation)
                  return setMessage(
                    "Geolocation unavailable. Enter coordinates manually.",
                  );
                navigator.geolocation.getCurrentPosition(
                  (p) => {
                    setLatitude(p.coords.latitude.toFixed(6));
                    setLongitude(p.coords.longitude.toFixed(6));
                  },
                  () =>
                    setMessage(
                      "Location permission unavailable. Enter coordinates manually.",
                    ),
                );
              }}
            >
              <MapPin size={16} />
              Use my current location
            </button>
            <div className="coordinate-grid">
              <label className="field-label">
                Latitude
                <input
                  className="report-input"
                  required
                  type="number"
                  step="any"
                  min="12.65"
                  max="13.3"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </label>
              <label className="field-label">
                Longitude
                <input
                  className="report-input"
                  required
                  type="number"
                  step="any"
                  min="77.2"
                  max="77.95"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </label>
            </div>
            <p className="muted">
              Confirm this is the issue’s location before submitting. The
              supported area is Bengaluru.
            </p>
            <button
              className="primary full-width"
              disabled={busy || !!reportId}
            >
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <ArrowRight size={16} />
              )}
              Save report
            </button>
          </form>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        {reportId && (
          <div className="analysis-result">
            <strong>Report saved.</strong>
            <p>Tracking ID: {reportId}</p>
            <button className="primary" onClick={onSaved}>
              Add evidence & track report <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
