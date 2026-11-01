"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
export type LocalAnalysis = {
  summary: string;
  transcript: string;
  uncertainty: string[];
  model: string;
  observations?: {
    claim: string;
    evidenceId: string;
    kind: "visible" | "reported" | "inferred";
  }[];
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
          {Boolean(analysis.observations?.length) && (
            <div className="analysis-observations">
              <h4>Observations & sources</h4>
              <ul>
                {analysis.observations!.map((observation, index) => (
                  <li key={`${observation.evidenceId}-${index}`}>
                    <span className="observation-kind">{observation.kind}</span>
                    <p>{observation.claim}</p>
                    {observation.evidenceId === "description" ? (
                      <small>Source: your report description</small>
                    ) : (
                      <a
                        href={`/api/reports/evidence?reportId=${encodeURIComponent(id)}&id=${encodeURIComponent(observation.evidenceId)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Inspect attachment {observation.evidenceId.slice(0, 8)}{" "}
                        ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.transcript && <p>Transcript: {analysis.transcript}</p>}
          <p>
            {analysis.uncertainty.length
              ? `Uncertainty: ${analysis.uncertainty.join("; ")}`
              : "The model returned no uncertainty notes. Human verification remains required."}
          </p>
        </div>
      )}
    </>
  );
}
