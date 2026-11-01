"use client";
import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { CivicReport, DashboardData } from "@/lib/types";
import dynamic from "next/dynamic";
const CityMap = dynamic(() => import("./city-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Loader2 className="spin" /> Loading the map
    </div>
  ),
});
import ReportDialog from "./report-dialog";
import MyReports from "./my-reports";
import { ArchiveInsights, ReportingGuide, SourceStatus } from "./archive-summary";
import { useDialog } from "./use-dialog";
import ThemeControl from "./theme-control";
import CivicMark from "./civic-mark";
import CityWall from "./city-wall";
import CivicStamp, { StampTexture } from "./civic-stamp";
const sourceUrl = "https://github.com/Vonter/bbmp-citizen-grievances";
const views = ["City", "Records", "Closed or fixed?", "My reports", "Sources"];
const headings: Record<string, string> = {
  Records: "Every complaint, as it was filed.",
  "Closed or fixed?": "Closed, on whose word?",
  "My reports": "Your reports.",
  Sources: "Where this comes from.",
};
function archivePeriod(range: DashboardData["dateRange"]) {
  if (!range) return "";
  const day = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Date(value.replace(" ", "T")).toLocaleDateString("en-IN", options);
  const full = { day: "numeric", month: "long", year: "numeric" } as const;
  const month = { month: "long", year: "numeric" } as const;
  return day(range.from, month) === day(range.to, month)
    ? `between ${day(range.from, { day: "numeric" })} and ${day(range.to, full)}`
    : `between ${day(range.from, full)} and ${day(range.to, full)}`;
}
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [selected, setSelected] = useState<CivicReport | null>(null),
    [reporting, setReporting] = useState(false),
    [view, setView] = useState("City"),
    [stamped, setStamped] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);
  const refresh = () => {
    setError("");
    return fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error("The archive can’t load right now.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    refresh();
  }, []);
  const [reports, setReports] = useState<CivicReport[]>([]),
    [page, setPage] = useState(0),
    [matched, setMatched] = useState<number | null>(null),
    [searchBusy, setSearchBusy] = useState(true),
    [archiveRetry, setArchiveRetry] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [query, category]);
  useEffect(() => {
    if (view !== "Records") return;
    const controller = new AbortController();
    setSearchBusy(true);
    setMatched(null);
    const timer = setTimeout(() => {
      fetch(
        "/api/archive?" +
          new URLSearchParams({ q: query, category, page: String(page) }),
        { signal: controller.signal, cache: "no-store" },
      )
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw Error(body.error);
          setReports(body.reports);
          setMatched(body.matched);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, page, archiveRetry, view]);
  const openReport = () => setReporting(true);
  return (
    <div className="app">
      <StampTexture />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="masthead">
        <a className="brand" href="/">
          <CivicMark />
          CivicLens
        </a>
        <nav aria-label="Main">
          {views.map((name) => (
            <button
              key={name}
              aria-current={view === name ? "page" : undefined}
              onClick={() => setView(name)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="masthead-actions">
          <ThemeControl />
          <button className="primary" onClick={openReport}>
            Report an issue
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {error && (
          <div className="notice error">
            {error}{" "}
            <button
              onClick={() => {
                refresh();
                setArchiveRetry((attempt) => attempt + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
        {view === "City" ? (
          <>
            <section className="hero" data-stamped={stamped ? "" : undefined}>
              <h1>
                <span>Closed</span> <span>isn’t fixed.</span>
              </h1>
              <CivicStamp english="Closed" kannada="ಮುಚ್ಚಲಾಗಿದೆ" className="hero-stamp" />
              <div className="hero-foot">
                <p>
                  {data
                    ? `This archive holds ${data.total.toLocaleString("en-IN")} complaints filed in Bengaluru ${archivePeriod(data.dateRange)}. The source marks ${data.closed.toLocaleString("en-IN")} of them closed. It can’t tell you how many were repaired. CivicLens can, one report at a time.`
                    : "Loading the Bengaluru complaint archive…"}
                </p>
                <button className="secondary" onClick={() => setView("Records")}>
                  Browse the records
                </button>
              </div>
            </section>
            <CityWall onOpen={setSelected} onReady={() => setStamped(true)} />
            <ReportingGuide onReport={openReport} />
            <section className="street" aria-label="Map of Bengaluru">
              <CityMap />
              <p>
                The archive has ward names, not addresses, so it draws no pins.
                Your own reports appear here, visible only to you.
              </p>
            </section>
          </>
        ) : (
          <div className="page">
            <h1>{headings[view]}</h1>
            {view === "My reports" ? (
              <MyReports onReport={openReport} />
            ) : view === "Sources" ? (
              <section className="sources">
                <p>
                  These records come from the public Bengaluru citizen
                  grievances dataset maintained by Vonter under the ODbL
                  licence, which attributes them to Bengaluru Smart City
                  Limited. It is a historical archive, not a live government
                  feed. CivicLens is an independent project and sends nothing
                  to any government office.
                </p>
                <dl>
                  <dt>Records held</dt>
                  <dd>{data?.total.toLocaleString("en-IN") ?? "Loading"}</dd>
                  <dt>Retrieved</dt>
                  <dd>
                    {data?.fetchedAt
                      ? new Date(data.fetchedAt).toLocaleString("en-IN")
                      : "Not yet imported"}
                  </dd>
                  <dt>Your reports are stored in</dt>
                  <dd>
                    {data?.configured.auth
                      ? "A private Supabase database and storage bucket"
                      : "A private database on this computer"}
                  </dd>
                  <dt>AI analysis</dt>
                  <dd>
                    {data?.configured.ai
                      ? "On. Gemini reads evidence only when you agree."
                      : "Off. CivicLens never shows simulated AI results."}
                  </dd>
                </dl>
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  Read the dataset and its licence
                </a>
              </section>
            ) : view === "Closed or fixed?" ? (
              <>
                <SourceStatus data={data} />
                <ArchiveInsights />
              </>
            ) : (
              <section className="ledger">
                <div className="ledger-tools">
                  <label className="search">
                    <Search size={17} aria-hidden="true" />
                    <input
                      aria-label="Search records"
                      placeholder="Search by issue, ward or complaint number"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    className="report-input"
                    aria-label="Filter by category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>All categories</option>
                    {data?.categories.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <span aria-live="polite">
                    {matched !== null
                      ? `${matched.toLocaleString("en-IN")} records`
                      : searchBusy
                        ? "Searching…"
                        : "Records unavailable"}
                  </span>
                </div>
                <table aria-busy={searchBusy}>
                  <thead>
                    <tr>
                      <th>Complaint</th>
                      <th>Ward</th>
                      <th>Source status</th>
                      <th>Filed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} onClick={() => setSelected(r)}>
                        <td>
                          <button className="ledger-title" onClick={() => setSelected(r)}>
                            {r.detail}
                          </button>
                          <small>
                            {r.category}, no. {r.id}
                          </small>
                        </td>
                        <td>{r.ward}</td>
                        <td>
                          <span className={`status ${r.status.toLowerCase() === "closed" ? "closed" : "pending"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>{r.date ? r.date.slice(0, 10) : "Unavailable"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!reports.length && !searchBusy && (
                  <p className="empty">No records match. Try another word or category.</p>
                )}
                <div className="pager">
                  <button
                    className="text-button"
                    disabled={page === 0 || searchBusy}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span role="status" aria-live="polite">
                    {searchBusy
                      ? "Loading…"
                      : matched === null
                        ? "Unavailable"
                        : `Page ${page + 1} of ${Math.max(1, Math.ceil(matched / 8))}`}
                  </span>
                  <button
                    className="text-button"
                    disabled={matched === null || (page + 1) * 8 >= matched || searchBusy}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <footer className="colophon">
        <span>CivicLens, an independent project for Bengaluru.</span>
        <a href={sourceUrl} target="_blank" rel="noreferrer">
          Data: Sahaaya archive under ODbL
        </a>
      </footer>
      {selected && (
        <CaseDrawer
          report={selected}
          aiReady={!!data?.configured.ai && !!data?.configured.auth}
          onClose={() => setSelected(null)}
        />
      )}
      {reporting && (
        <ReportDialog
          onClose={() => setReporting(false)}
          onSaved={() => {
            setReporting(false);
            setView("My reports");
          }}
          configured={!!data?.configured.auth}
          aiReady={!!data?.configured.ai}
        />
      )}
    </div>
  );
}
function CaseDrawer({
  report: r,
  aiReady,
  onClose,
}: {
  report: CivicReport;
  aiReady: boolean;
  onClose: () => void;
}) {
  const dialogRef = useDialog(onClose);
  const [analysis, setAnalysis] = useState(""),
    [loading, setLoading] = useState(false),
    [analysisId, setAnalysisId] = useState("");
  const isClosed = r.status.toLowerCase() === "closed";
  return (
    <div className="overlay" onClick={onClose}>
      <aside
        ref={dialogRef}
        className="case-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-button"
          aria-label="Close complaint"
          onClick={onClose}
        >
          <X />
        </button>
        <small>Complaint no. {r.id}</small>
        <h2 id="case-title">{r.detail}</h2>
        <p>
          {r.category}, {r.ward}
        </p>
        <span className={`status ${isClosed ? "closed" : "pending"}`}>
          Source status: {r.status}
        </span>
        {isClosed && (
          <CivicStamp english="Closed" kannada="ಮುಚ್ಚಲಾಗಿದೆ" className="drawer-stamp" />
        )}
        <dl>
          <dt>Filed</dt>
          <dd>{r.date || "Unavailable"}</dd>
          <dt>Location</dt>
          <dd>Ward name only. No address or coordinates are inferred.</dd>
          <dt>Repair checked by anyone</dt>
          <dd>Not recorded in the source.</dd>
          <dt>Source</dt>
          <dd>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              Sahaaya archive via Bengaluru Smart City Limited
            </a>
          </dd>
        </dl>
        <button
          className="primary"
          disabled={loading || !aiReady}
          onClick={async () => {
            setLoading(true);
            try {
              let id = analysisId;
              if (!id) {
                const res = await fetch("/api/analysis", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sourceId: r.id }),
                });
                const body = await res.json();
                if (!res.ok)
                  throw Error(body.error || "Could not start analysis");
                id = body.id;
                setAnalysisId(id);
              }
              for (let attempt = 0; attempt < 25; attempt++) {
                const res = await fetch(
                  "/api/analysis?id=" + encodeURIComponent(id),
                  { cache: "no-store" },
                );
                const body = await res.json();
                if (!res.ok)
                  throw Error(body.error || "Could not check analysis");
                if (body.status === "completed") {
                  setAnalysis(body.result.explanation);
                  setAnalysisId("");
                  break;
                }
                if (body.status === "failed") {
                  setAnalysisId("");
                  throw Error(
                    "Analysis failed. The record is unchanged, so you can retry.",
                  );
                }
                setAnalysis("Analysing this record…");
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            } catch (error) {
              setAnalysis(
                error instanceof Error
                  ? error.message
                  : "Analysis is unavailable. The record is unchanged.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading && <Loader2 size={16} className="spin" />}
          {!aiReady
            ? "AI analysis is off"
            : analysisId
              ? "Check analysis"
              : "Analyse this record"}
        </button>
        {analysis && (
          <div className="analysis-result" role="status">
            {analysis}
          </div>
        )}
      </aside>
    </div>
  );
}
