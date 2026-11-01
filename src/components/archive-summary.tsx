"use client";
import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/types";
import type { Insights } from "@/lib/insights";

function InsightList({
  title,
  items,
}: {
  title: string;
  items: Insights["wards"];
}) {
  const largest = items[0]?.total || 1;
  return (
    <div className="insight-list">
      <h3>{title}</h3>
      <ol>
        {items.map((item) => (
          <li key={item.name}>
            <div className="insight-label">
              <span>{item.name}</span>
              <b>{((item.closed / item.total) * 100).toFixed(0)}% closed</b>
              <small>{item.total.toLocaleString("en-IN")}</small>
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
    <section className="archive-insights">
      <h2>Which complaints get closed, and where?</h2>
      <p>
        Bar length is the number of complaints. The solid part is the share the
        source marks closed.
      </p>
      {insights ? (
        <div className="insight-grid">
          <InsightList title="By type of complaint" items={insights.categories} />
          <InsightList title="By ward name in the source" items={insights.wards} />
        </div>
      ) : (
        <p className="empty">
          {failed ? "These figures can’t load right now." : "Counting the archive…"}
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
    <section className="verdict">
      <div
        className="verdict-bar"
        role="img"
        aria-label={
          data
            ? `${closed.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} complaints are marked closed by the source.`
            : "Loading"
        }
      >
        <span style={{ width: `${share}%` }} />
      </div>
      <p className="verdict-line">
        {data
          ? `${closed.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} complaints are marked closed.`
          : "Counting the archive…"}
      </p>
      <div className="verdict-notes">
        <p>
          That number records an administrative action. Nothing in the archive
          shows that anyone checked the street afterwards.
        </p>
        <p>
          In CivicLens, closing takes evidence. An operator attaches a photo of
          the repair, and the person who reported the issue confirms it or
          reopens it.
        </p>
      </div>
    </section>
  );
}

export function ReportingGuide({ onReport }: { onReport: () => void }) {
  return (
    <section className="guide">
      <h2>How a report gets proven</h2>
      <ol>
        <li>
          <strong>Put it on record</strong>
          <p>Describe the issue, place it on the map, and add a photo.</p>
        </li>
        <li>
          <strong>Follow the review</strong>
          <p>Every step is logged, with the reason and the evidence behind it.</p>
        </li>
        <li>
          <strong>Confirm the repair</strong>
          <p>Only you can close it. If nothing changed, reopen it.</p>
        </li>
      </ol>
      <button className="primary" onClick={onReport}>
        Report an issue
      </button>
    </section>
  );
}
