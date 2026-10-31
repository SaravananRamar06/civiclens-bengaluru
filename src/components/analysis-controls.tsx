"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
export type LocalAnalysis = {
  summary: string;
  transcript: string;
  uncertainty: string[];
  model: string;
};
export default function AnalysisControls({
  id,
  analysis,
  onUpdate,
}: {
  id: string;
  analysis?: LocalAnalysis;
  onUpdate: () => void;
}) {
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <>
      <div className="analysis-controls">
        <label>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I consent to sending this report and attachments to Google for AI
          processing. Free-tier inputs may be used for product improvement.
        </label>
        <button
          className="primary"
          disabled={!consent || busy}
          onClick={async () => {
            setBusy(true);
            try {
              const response = await fetch("/api/reports/analyze", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, consent: true }),
                }),
                body = await response.json();
              if (!response.ok) throw Error(body.error);
              setMessage(
                "Live analysis saved. Human verification remains required.",
              );
              onUpdate();
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Analysis unavailable.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Sparkles size={16} />
          {busy ? "Analyzing evidence…" : "Analyze real evidence"}
        </button>
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {analysis && (
        <div className="analysis-result">
          <strong>Provisional AI assessment · {analysis.model}</strong>
          <p>{analysis.summary}</p>
          {analysis.transcript && <p>Transcript: {analysis.transcript}</p>}
          <p>Uncertainty: {analysis.uncertainty.join("; ")}</p>
        </div>
      )}
    </>
  );
}
