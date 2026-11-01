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
      <h2>What the archive shows about each department</h2>
      <p>
        Bar length is the number of complaints. The solid part is the share the
        source marks closed.
      </p>
      {insights ? (
        <div className="insight-grid">
          <InsightList title="By department" items={insights.categories} />
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
      <h2>From a photo to a confirmed repair</h2>
      <ol>
        <li>
          <strong>Show it or say it</strong>
          <p>Add a photo or a voice note and place the issue on the map.</p>
        </li>
        <li>
          <strong>AI rates it and routes it</strong>
          <p>Gemini rates the severity and the right authority receives a handoff packet.</p>
        </li>
        <li>
          <strong>The city watches it close</strong>
          <p>Progress is public. Only you can confirm the repair, or reopen it.</p>
        </li>
      </ol>
      <button className="primary" onClick={onReport}>
        Report an issue
      </button>
    </section>
  );
}
