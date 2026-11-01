"use client";
import { useEffect, useState } from "react";
import type { AuthorityRecord, PublicReport } from "@/lib/accountability";
type PublicRecord = { reports: PublicReport[]; authorities: AuthorityRecord[] };
function hours(value: number | null) {
  if (value === null) return "Not yet";
  return value < 48 ? `${value.toFixed(value < 10 ? 1 : 0)} h` : `${(value / 24).toFixed(1)} days`;
}
export default function LiveAccountability({ onReport }: { onReport: () => void }) {
  const [record, setRecord] = useState<PublicRecord | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/public-reports", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setRecord)
      .catch(() => setFailed(true));
  }, []);
  const open = record?.reports.filter((r) => r.status !== "Closed").length ?? 0;
  const critical = record?.reports.filter((r) => r.status !== "Closed" && r.severity === "Critical").length ?? 0;
  return (
    <section className="live-record">
      <h2>Reports filed here, and who has them</h2>
      {failed ? (
        <p className="empty">Live figures can’t load right now.</p>
      ) : !record ? (
        <p className="empty">Loading the public record…</p>
      ) : record.reports.length === 0 ? (
        <div className="empty">
          <p>No reports have been filed yet. The first one starts this record.</p>
          <button className="primary" onClick={onReport}>
            Report an issue
          </button>
        </div>
      ) : (
        <>
          <p className="live-summary">
            {record.reports.length} {record.reports.length === 1 ? "report" : "reports"} filed. {open} still open, {critical} of them critical.
          </p>
          <div className="table-frame">
            <table className="authority-table">
              <thead>
                <tr>
                  <th>Authority</th>
                  <th>Routed</th>
                  <th>Acknowledged</th>
                  <th>Typical response</th>
                  <th>Confirmed fixed</th>
                </tr>
              </thead>
              <tbody>
                {record.authorities.map((row) => (
                  <tr key={row.authority}>
                    <td>{row.authority}</td>
                    <td>{row.routed}</td>
                    <td>{row.acknowledged}</td>
                    <td>{hours(row.medianHours)}</td>
                    <td>{row.confirmed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Latest reports</h3>
          <ol className="public-feed">
            {record.reports.slice(0, 8).map((report) => (
              <li key={report.ref}>
                <strong data-severity={report.severity}>{report.severity}</strong>
                <span>{report.category}</span>
                <span>{report.authority}</span>
                <span className={`status ${report.status === "Closed" ? "closed" : "pending"}`}>
                  {report.status}
                </span>
              </li>
            ))}
          </ol>
          <p className="muted">
            Filed by residents and rated provisionally. Locations are rounded to
            about a kilometre. Being routed does not mean an authority has
            accepted a report.
          </p>
        </>
      )}
    </section>
  );
}
