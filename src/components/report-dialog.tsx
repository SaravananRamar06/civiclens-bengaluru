"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, MapPin, X, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { useDialog } from "./use-dialog";
import { validBengaluruPoint } from "@/lib/triage";
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
  suggestedCategory: string;
  uncertainty: string[];
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
  const dialogRef = useDialog(onClose);
  const [description, setDescription] = useState(""),
    [category, setCategory] = useState("Road damage"),
    [point, setPoint] = useState<Point | null>(null),
    [photo, setPhoto] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [mode, setMode] = useState(""),
    [guest, setGuest] = useState(false),
    [google, setGoogle] = useState(false),
    [reportId, setReportId] = useState(""),
    [assessment, setAssessment] = useState<Assessment | null>(null);
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
  async function start() {
    const res = await fetch("/api/session", { method: "POST" });
    const body = await res.json();
    if (res.ok) setSignedIn(true);
    else setMessage(body.error);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!point) return setMessage("Select the issue’s location on the map.");
    setMessage("");
    try {
      setBusy("Saving your report…");
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, ...point }),
      });
      const body = await res.json();
      if (!res.ok) throw Error(body.error);
      setReportId(body.id);
      const notes = ["Your report has been saved."];
      if (photo) {
        setBusy("Attaching your photo…");
        const form = new FormData();
        form.set("reportId", body.id);
        form.set("file", photo);
        form.set("purpose", "report");
        const upload = await fetch("/api/reports/evidence", {
          method: "POST",
          body: form,
        });
        if (!upload.ok)
          notes.push(
            (await upload.json()).error ||
              "The photo could not be attached. You can add it from My reports.",
          );
      }
      if (consent) {
        setBusy("Analysing your evidence…");
        const analysis = await fetch("/api/reports/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: body.id, consent: true }),
        });
        const result = await analysis.json();
        if (analysis.ok) setAssessment(result);
        else notes.push(result.error);
      }
      setMessage(notes.join(" "));
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not submit your report.",
      );
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
                : mode === "local-receipt" || guest
                  ? "No account needed. Your reports stay private to this browser."
                  : google
                    ? "Sign in with Google to save private reports and follow their review history."
                    : "Reporting is not available right now. You can still explore the public archive."}
            </div>
            {(mode === "local-receipt" || guest) && (
              <button className="primary full-width" onClick={start}>
                Continue privately <ArrowRight size={16} />
              </button>
            )}
            {mode === "cloud" && google && (
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
            <label className="field-label">
              Photo (optional)
              <input
                className="report-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
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
              Where is it?
              <LocationPicker value={point} onChange={setPoint} />
            </div>
            <div className="location-row">
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  if (!navigator.geolocation)
                    return setMessage(
                      "Location is unavailable here. Select the place on the map.",
                    );
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
                    () =>
                      setMessage(
                        "Location permission is off. Select the place on the map.",
                      ),
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
                  Analyse this report with AI. Your description and photo are
                  sent to Google. Free-tier inputs may be used for product
                  improvement.
                </span>
              </label>
            )}
            <button
              className="primary full-width"
              disabled={!!busy || !!reportId}
            >
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <ArrowRight size={16} />
              )}
              {busy || "Save report"}
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
            <strong>Provisional AI assessment</strong>
            <p>{assessment.summary}</p>
            <p>Suggested category: {assessment.suggestedCategory}</p>
            {assessment.uncertainty.length > 0 && (
              <p>Uncertainty: {assessment.uncertainty.join("; ")}</p>
            )}
          </div>
        )}
        {reportId && !busy && (
          <div className="analysis-result">
            <strong>Report saved.</strong>
            <p>Tracking ID: {reportId}</p>
            <button className="primary" onClick={onSaved}>
              Track this report <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
