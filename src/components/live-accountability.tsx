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
  const reports = record?.reports ?? [];
  const open = reports.filter((r) => r.status !== "Closed");
  const figures = [
    { label: "Reports filed", value: reports.length },
    { label: "Still open", value: open.length },
    { label: "Critical and open", value: open.filter((r) => r.severity === "Critical").length },
    { label: "Confirmed fixed", value: reports.length - open.length },
  ];
  return (
    <section className="live-record">
      <h2>Reports filed here, and who has them</h2>
      {failed ? (
        <p className="empty">Live figures can’t load right now. Refresh to try again.</p>
      ) : !record ? (
        <div className="live-skeleton" role="status" aria-label="Loading the public record">
          <span />
          <span />
          <span />
        </div>
      ) : reports.length === 0 ? (
        <div className="empty">
          <p>No reports have been filed yet. The first one starts this record.</p>
          <button className="primary" onClick={onReport}>
            Report an issue
          </button>
        </div>
      ) : (
        <>
          <dl className="live-figures">
            {figures.map((figure) => (
              <div key={figure.label}>
                <dd>{figure.value.toLocaleString("en-IN")}</dd>
                <dt>{figure.label}</dt>
              </div>
            ))}
          </dl>
          <div className="table-frame" role="region" aria-label="Reports by authority" tabIndex={0}>
            <table className="authority-table">
              <caption className="sr-only">Reports by responsible authority</caption>
              <thead>
                <tr>
                  <th scope="col">Authority</th>
                  <th scope="col">Assigned</th>
                  <th scope="col">Acknowledged in CivicLens</th>
                  <th scope="col">Typical response</th>
                  <th scope="col">Confirmed fixed</th>
                </tr>
              </thead>
              <tbody>
                {record!.authorities.map((row) => (
                  <tr key={row.authority}>
                    <th scope="row">{row.authority}</th>
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
            {reports.slice(0, 8).map((report) => (
              <li key={report.ref}>
                <strong className="severity" data-severity={report.severity}>
                  {report.severity}
                </strong>
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
            about a kilometre. CivicLens doesn’t deliver reports to government
            authorities, so being assigned doesn’t mean an authority has seen or
            accepted one. Acknowledgements are recorded by CivicLens staff accounts.
          </p>
        </>
      )}
    </section>
  );
}
