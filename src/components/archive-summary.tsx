import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { DashboardData } from "@/lib/types";

export function SourceStatus({ data }: { data: DashboardData | null }) {
  const total = data?.total || 0;
  const closed = data?.closed || 0;
  const share = total ? (closed / total) * 100 : 0;
  return (
    <section className="source-status-panel panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">THE ACCOUNTABILITY PICTURE</span>
          <h2>What does “closed” actually mean?</h2>
        </div>
        <ShieldCheck size={24} />
      </div>
      <div className="source-status-body">
        <div
          className="status-ring"
          role="img"
          aria-label={
            data
              ? `${closed.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} imported records are marked closed by the source.`
              : "Loading source status"
          }
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="49" className="ring-track" />
            <circle
              cx="60"
              cy="60"
              r="49"
              className="ring-progress"
              pathLength="100"
              strokeDasharray={`${share} 100`}
            />
          </svg>
          <div>
            <strong>{data ? `${share.toFixed(1)}%` : "—"}</strong>
            <span>source marked closed</span>
          </div>
        </div>
        <div className="source-status-numbers">
          <div>
            <span className="status-key closed-key" />
            <span>Marked closed by source</span>
            <strong>{data ? closed.toLocaleString("en-IN") : "—"}</strong>
          </div>
          <div>
            <span className="status-key other-key" />
            <span>Other source statuses</span>
            <strong>
              {data ? (total - closed).toLocaleString("en-IN") : "—"}
            </strong>
          </div>
          <p>
            A source status records an administrative action. It does not
            establish that an issue was repaired or independently verified.
          </p>
        </div>
        <div className="verification-note">
          <ShieldCheck size={24} />
          <strong>Evidence earns trust.</strong>
          <p>
            In CivicLens cloud reports, operators propose a resolution with
            photo evidence. The reporting citizen confirms closure or reopens
            the issue.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ReportingGuide({ onReport }: { onReport: () => void }) {
  return (
    <section className="reporting-guide">
      <div>
        <span className="section-kicker">START WITH WHAT YOU SEE</span>
        <h2>
          A problem on your street?
          <br />
          Put it on the record.
        </h2>
        <button className="primary" onClick={onReport}>
          Report an issue <ArrowUpRight size={16} />
        </button>
      </div>
      <ol>
        <li>
          <span>01</span>
          <div>
            <strong>Capture the issue</strong>
            <p>Describe it, locate it, and attach your evidence.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Follow the review</strong>
            <p>Check the assessment and the recorded review history.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Confirm the outcome</strong>
            <p>In cloud mode, confirm a repair or reopen your report.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
