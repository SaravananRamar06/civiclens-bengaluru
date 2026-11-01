"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import type { Insights } from "@/lib/insights";

function InsightList({
  title,
  note,
  items,
}: {
  title: string;
  note: string;
  items: Insights["wards"];
}) {
  const largest = items[0]?.total || 1;
  return (
    <div className="insight-list">
      <h3>{title}</h3>
      <p>{note}</p>
      <ol>
        {items.map((item) => (
          <li key={item.name}>
            <div className="insight-label">
              <span>{item.name}</span>
              <b>
                {item.total.toLocaleString("en-IN")}
                <small>
                  {((item.closed / item.total) * 100).toFixed(0)}% closed
                </small>
              </b>
            </div>
            <div className="insight-track">
              <span style={{ width: `${(item.total / largest) * 100}%` }}>
                <i style={{ width: `${(item.closed / item.total) * 100}%` }} />
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ArchiveInsights() {
  const [insights, setInsights] = useState<Insights | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/insights")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setInsights)
      .catch(() => setFailed(true));
  }, []);
  return (
    <section className="panel archive-insights">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">WHERE THE WORK SITS</span>
          <h2>Which issues get closed, and where?</h2>
          <p>
            Computed live from the archive. The darker band is the share the
            source marks closed, not verified repairs.
          </p>
        </div>
      </div>
      {insights ? (
        <div className="insight-grid">
          <InsightList
            title="By category"
            note="Largest categories in the archive"
            items={insights.categories}
          />
          <InsightList
            title="By ward label"
            note="Source ward names with the most records"
            items={insights.wards}
          />
        </div>
      ) : (
        <p className="empty">
          {failed ? "Insights are unavailable right now." : "Loading insights…"}
        </p>
      )}
    </section>
  );
}

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
