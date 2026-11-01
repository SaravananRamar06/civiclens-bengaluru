"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Trash2,
  Zap,
  Construction,
  Trees,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  List,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { CivicReport, DashboardData } from "@/lib/types";
import dynamic from "next/dynamic";
const CityMap = dynamic(() => import("./city-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Loader2 className="spin" /> Loading Bengaluru map
    </div>
  ),
});
import ReportDialog from "./report-dialog";
import MyReports from "./my-reports";
import { ReportingGuide, SourceStatus } from "./archive-summary";
import { useDialog } from "./use-dialog";
import ThemeControl from "./theme-control";
const sourceUrl = "https://github.com/Vonter/bbmp-citizen-grievances";
function CivicMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M13 3H3v10M19 3h10v10M29 19v10H19M13 29H3V19"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="16" cy="16" r="6" fill="currentColor" />
    </svg>
  );
}
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [selected, setSelected] = useState<CivicReport | null>(null),
    [reporting, setReporting] = useState(false),
    [view, setView] = useState("Overview"),
    [reportLayout, setReportLayout] = useState<"list" | "cards">("list");
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches)
      setReportLayout("cards");
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);
  const refresh = () => {
    setError("");
    return fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error("Could not load the civic database");
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
    [matched, setMatched] = useState(0),
    [searchBusy, setSearchBusy] = useState(false);
  useEffect(() => {
    setPage(0);
  }, [query, category]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearchBusy(true);
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
  }, [query, category, page]);
  const titles: Record<
    string,
    { title: string; accent: string; description: string }
  > = {
    Overview: {
      title: "Bengaluru,",
      accent: "in focus.",
      description:
        "Explore Bengaluru’s public grievance archive or report a problem on your street. Follow each report from evidence to review.",
    },
    "My reports": {
      title: "Your reports.",
      accent: "Your record.",
      description:
        "A private space for your evidence, review activity, and the issues you care about.",
    },
    "Issue explorer": {
      title: "The city,",
      accent: "record by record.",
      description:
        "Explore Bengaluru’s civic records by category, neighbourhood, or tracking ID.",
    },
    Accountability: {
      title: "Follow the record.",
      accent: "Question the status.",
      description:
        "Administrative closure and a verified repair are different things. See the record clearly.",
    },
    "Data & sources": {
      title: "Know the source.",
      accent: "See the limits.",
      description:
        "Know where the data comes from, what it tells us, and where its limits lie.",
    },
  };
  const heading = titles[view];
  return (
    <div className="app-shell" data-view={view}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <CivicMark />
          </span>
          CivicLens<span className="brand-period">.</span>
        </a>
        <div className="workspace-label">THE CITY, IN FOCUS</div>
        <div className="city-select">
          <span className="city-icon">
            <MapPin size={17} />
          </span>
          <span>
            Bengaluru<small>Karnataka, India</small>
          </span>
          <span className="city-select-code">KA / IN</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            { name: "Overview", icon: LayoutDashboard },
            { name: "My reports", icon: FileText },
            { name: "Issue explorer", icon: MapPin },
            { name: "Accountability", icon: ShieldCheck },
            { name: "Data & sources", icon: Database },
          ].map(({ name, icon: Icon }) => (
            <button
              aria-label={name}
              aria-current={view === name ? "page" : undefined}
              title={name}
              className={view === name ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(name);
                window.scrollTo({ top: 0, behavior: "auto" });
              }}
              key={name}
            >
              <Icon size={18} />
              <span className="nav-text">{name}</span>
              {view === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-index">↗</span>
          <strong>Start with your street.</strong>
          <p>Something needs attention? Put it on the record.</p>
          <button onClick={() => setReporting(true)}>
            New report <Plus size={16} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">BL</span>
          <span>
            Bengaluru workspace<small>Public records · private reports</small>
          </span>
          <ShieldCheck size={16} />
        </div>
      </aside>
      <main id="main-content" tabIndex={-1}>
        <header className="topbar">
          <a className="mobile-brand" href="/">
            <CivicMark />
            CivicLens<span>.</span>
          </a>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{view}</strong>
          </div>
          <div className="top-actions">
            <ThemeControl />
            <span className="public-label">
              <span /> Public archive
            </span>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              About the data <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> BENGALURU / PUBLIC CIVIC RECORDS
              </div>
              <h1>
                {heading.title}
                <br />
                <span>{heading.accent}</span>
              </h1>
              <p>{heading.description}</p>
            </div>
            <div className="hero-action">
              <span className="hero-edition">
                BENGALURU / KA <span>12.9716° N · 77.5946° E</span>
              </span>
              <div className="hero-buttons">
                <button className="primary" onClick={() => setReporting(true)}>
                  <Plus size={18} /> Report an issue <ArrowUpRight size={17} />
                </button>
                <button
                  className="secondary hero-explore"
                  onClick={() => {
                    setView("Issue explorer");
                    setQuery("");
                    setCategory("All categories");
                    setPage(0);
                  }}
                >
                  Explore records <ArrowRight size={16} />
                </button>
              </div>
              <span>
                <ShieldCheck size={13} />
                Your identity and exact location stay private
              </span>
            </div>
          </div>
          <div className="source-banner">
            <div className="source-emblem">
              <Database size={17} />
            </div>
            <div>
              <strong>Sahaaya public archive</strong>
              <span> Historical records · original source statuses</span>
            </div>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              View source <ArrowUpRight size={14} />
            </a>
          </div>
          {error && (
            <div className="notice error">
              {error} <button onClick={refresh}>Try again</button>
            </div>
          )}
          {view !== "My reports" && (
            <section className="stat-grid" aria-label="Dataset metrics">
              {[
                {
                  label: "Public grievances",
                  value: data?.total,
                  icon: FileText,
                  note: "Records in the current archive import",
                  color: "blue",
                },
                {
                  label: "Distinct ward labels",
                  value: data?.wards,
                  icon: MapPin,
                  note: "Source labels, not the current ward count",
                  color: "purple",
                },
                {
                  label: "Issue categories",
                  value: data?.categories.length,
                  icon: Layers,
                  note: "From streetlights to solid waste",
                  color: "orange",
                },
              ].map(({ label, value, icon: Icon, note, color }) => (
                <article className="stat" key={label}>
                  <div className="stat-top">
                    <span>{label}</span>
                    <span className={`stat-icon ${color}`}>
                      <Icon size={17} />
                    </span>
                  </div>
                  <div className="stat-value">
                    {value === undefined ? (
                      <span className="skeleton-number" />
                    ) : (
                      value.toLocaleString("en-IN")
                    )}
                  </div>
                  <small>{note}</small>
                </article>
              ))}
            </section>
          )}
          <div className="view-content" key={view}>
            {view === "My reports" ? (
              <MyReports onReport={() => setReporting(true)} />
            ) : view === "Data & sources" ? (
              <section className="panel source-panel">
                <div className="section-kicker">DATA PROVENANCE</div>
                <h2>BBMP Sahaaya grievance archive</h2>
                <p>
                  Imported from the public, ODbL-licensed Bengaluru citizen
                  grievances dataset maintained by Vonter, sourced from
                  Bengaluru Smart City Limited. This is a historical archive,
                  not a live government dispatch feed.
                </p>
                <dl>
                  <dt>Imported records</dt>
                  <dd>{data?.total.toLocaleString("en-IN") ?? "Loading"}</dd>
                  <dt>Retrieved</dt>
                  <dd>
                    {data?.fetchedAt
                      ? new Date(data.fetchedAt).toLocaleString("en-IN")
                      : "No successful import yet"}
                  </dd>
                  <dt>Storage</dt>
                  <dd>
                    {data?.configured.auth
                      ? "Supabase PostgreSQL / PostGIS and private Storage"
                      : "Local SQLite workspace with private evidence storage"}
                  </dd>
                  <dt>AI provider</dt>
                  <dd>
                    {data?.configured.ai
                      ? "Gemini configured — live inference available"
                      : "Not configured — no simulated AI responses"}
                  </dd>
                  <dt>Identity</dt>
                  <dd>
                    {data?.configured.auth
                      ? "Supabase configured"
                      : "Private local receipt; Google OAuth optional"}
                  </dd>
                </dl>
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  Inspect the source and license <ExternalLink size={14} />
                </a>
              </section>
            ) : (
              <>
                {view === "Accountability" ? (
                  <SourceStatus data={data} />
                ) : (
                  <div className="workspace-grid">
                    <section className="panel map-panel">
                      <div className="panel-heading">
                        <div>
                          <span className="section-kicker">
                            THE GROUND VIEW
                          </span>
                          <h2>One city. Many neighbourhoods.</h2>
                          <p>Explore Bengaluru and the streets around you.</p>
                        </div>
                        <span className="map-context">
                          <span /> City context
                        </span>
                      </div>
                      <div className="map-wrap">
                        <CityMap />
                        <div className="map-floating">
                          <span className="map-floating-icon">
                            <MapPin size={18} />
                          </span>
                          <div>
                            <strong>Bengaluru, Karnataka</strong>
                            <small>12.9716° N · 77.5946° E</small>
                          </div>
                        </div>
                        <div className="map-legend">
                          <ShieldCheck size={14} />
                          Ward-level archive. No inferred issue pins.
                        </div>
                      </div>
                    </section>
                    <section className="panel breakdown">
                      <div className="panel-heading">
                        <div>
                          <span className="section-kicker">
                            THE BIGGER PICTURE
                          </span>
                          <h2>What’s in the archive?</h2>
                        </div>
                      </div>
                      {data && data.total > 0 && data.categories[0] && (
                        <div className="category-insight">
                          <strong>
                            {(
                              (data.categories[0].count / data.total) *
                              100
                            ).toFixed(1)}
                            <span>%</span>
                          </strong>
                          <p>
                            of imported reports concern{" "}
                            <b>{data.categories[0].name.toLowerCase()}</b>.
                          </p>
                        </div>
                      )}
                      <div className="category-bars">
                        {data?.categories.slice(0, 5).map((c, i) => (
                          <button
                            key={c.name}
                            aria-pressed={category === c.name}
                            onClick={() => {
                              setCategory(
                                category === c.name ? "All categories" : c.name,
                              );
                              setView("Issue explorer");
                            }}
                          >
                            <div className="bar-title">
                              <span>
                                <span className={`category-dot dot-${i}`} />
                                {c.name}
                              </span>
                              <b>{c.count.toLocaleString("en-IN")}</b>
                            </div>
                            <div className="bar-track">
                              <div
                                className={`bar-fill fill-${i}`}
                                style={{
                                  width: `${(c.count / (data.categories[0]?.count || 1)) * 100}%`,
                                }}
                              />
                            </div>
                          </button>
                        ))}
                        {data?.total === 0 && (
                          <p className="empty">
                            No records imported yet. Run the source import to
                            populate this view.
                          </p>
                        )}
                      </div>
                      <div className="breakdown-footer">
                        <ShieldCheck size={16} />
                        <span>Imported records · not a live incident feed</span>
                      </div>
                    </section>
                  </div>
                )}
                <section className="panel issues-panel" id="issue-records">
                  <div className="panel-heading">
                    <div>
                      <span className="section-kicker">OPEN RECORDS</span>
                      <h2>
                        {view === "Accountability"
                          ? "Source status & review trail"
                          : "Explore the archive."}{" "}
                        <span className="count-pill">
                          {data ? matched.toLocaleString("en-IN") : "—"}
                        </span>
                      </h2>
                      <p>Every entry has a source. Take a closer look.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setCategory("All categories");
                        setQuery("");
                        setPage(0);
                        setView("Issue explorer");
                      }}
                    >
                      View all reports <ArrowRight size={15} />
                    </button>
                  </div>
                  <div
                    className="archive-tabs"
                    role="group"
                    aria-label="Quick categories"
                  >
                    {[
                      { label: "All records", value: "All categories" },
                      { label: "Roads", value: "Road Maintenance(Engg)" },
                      {
                        label: "Waste",
                        value: "Solid Waste (Garbage) Related",
                      },
                      { label: "Electrical", value: "Electrical" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        aria-pressed={category === item.value}
                        onClick={() => {
                          setCategory(item.value);
                          setPage(0);
                        }}
                      >
                        {item.label}
                        <span>
                          {(item.value === "All categories"
                            ? data?.total
                            : data?.categories.find(
                                (c) => c.name === item.value,
                              )?.count
                          )?.toLocaleString("en-IN") ?? "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="table-toolbar">
                    <label className="search-box">
                      <Search size={17} />
                      <input
                        aria-label="Search reports"
                        placeholder="Search issues, wards, or report IDs…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <label className="filter-select">
                      <SlidersHorizontal size={15} />
                      <select
                        aria-label="Filter category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option>All categories</option>
                        {data?.categories.map((c) => (
                          <option key={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                    <span className="table-window" aria-live="polite">
                      {data
                        ? `${matched.toLocaleString("en-IN")} matching records`
                        : "Loading records…"}
                    </span>
                    <div
                      className="layout-control"
                      role="group"
                      aria-label="Report layout"
                    >
                      <button
                        aria-label="List view"
                        title="List view"
                        aria-pressed={reportLayout === "list"}
                        onClick={() => setReportLayout("list")}
                      >
                        <List size={17} />
                      </button>
                      <button
                        aria-label="Card view"
                        title="Card view"
                        aria-pressed={reportLayout === "cards"}
                        onClick={() => setReportLayout("cards")}
                      >
                        <LayoutGrid size={17} />
                      </button>
                    </div>
                  </div>
                  <div
                    className={
                      reportLayout === "cards" ? "card-records" : "table-scroll"
                    }
                    aria-busy={searchBusy}
                  >
                    {reportLayout === "cards" ? (
                      <div className="archive-cards">
                        {reports.map((r) => (
                          <button
                            className="archive-card"
                            key={r.id}
                            onClick={() => setSelected(r)}
                          >
                            <span className="archive-card-top">
                              <CategoryIcon category={r.category} />
                              <span
                                className={`status ${r.status.toLowerCase() === "closed" ? "closed" : "pending"}`}
                              >
                                <span />
                                {r.status}
                              </span>
                            </span>
                            <span className="archive-card-category">
                              {r.category}
                            </span>
                            <strong>{r.detail}</strong>
                            <span className="ward-label">
                              <MapPin size={13} />
                              {r.ward}
                            </span>
                            <span className="archive-card-footer">
                              <span>
                                #{r.id}
                                <small>
                                  {r.date
                                    ? r.date.slice(0, 10)
                                    : "Date unavailable"}
                                </small>
                              </span>
                              <ArrowUpRight size={17} />
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>ISSUE / REPORT ID</th>
                            <th>WARD</th>
                            <th>SOURCE STATUS</th>
                            <th>TRIAGE</th>
                            <th>REPORTED</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((r) => (
                            <tr key={r.id} onClick={() => setSelected(r)}>
                              <td>
                                <div className="issue-cell">
                                  <CategoryIcon category={r.category} />
                                  <div>
                                    <button
                                      className="issue-title"
                                      onClick={() => setSelected(r)}
                                    >
                                      {r.detail}
                                    </button>
                                    <small>
                                      {r.category} <span>·</span> #{r.id}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="ward-label">
                                  <MapPin size={13} />
                                  {r.ward}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`status ${r.status.toLowerCase() === "closed" ? "closed" : "pending"}`}
                                >
                                  <span />
                                  {r.status}
                                </span>
                              </td>
                              <td>
                                <span className="review-status">
                                  Needs evidence review
                                </span>
                              </td>
                              <td className="date-cell">
                                {r.date ? r.date.slice(0, 10) : "Unavailable"}
                              </td>
                              <td>
                                <ArrowUpRight size={16} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {!reports.length && !searchBusy && (
                      <div className="empty">
                        {data
                          ? "No matching reports. Try another search or import real records."
                          : "Loading civic records…"}
                      </div>
                    )}
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="text-button"
                      disabled={page === 0 || searchBusy}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span role="status" aria-live="polite">
                      {searchBusy || !data
                        ? "Loading…"
                        : `Page ${page + 1} of ${Math.max(1, Math.ceil(matched / 8))}`}
                    </span>
                    <button
                      className="text-button"
                      disabled={(page + 1) * 8 >= matched || searchBusy}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                  <div className="table-footer">
                    <span>
                      <Database size={13} /> Sahaaya archive · source-linked
                      records
                    </span>
                    <span>
                      Retrieved{" "}
                      {data?.fetchedAt
                        ? new Date(data.fetchedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                </section>
                {view === "Overview" && (
                  <ReportingGuide onReport={() => setReporting(true)} />
                )}
              </>
            )}
          </div>
          <footer className="page-footer">
            <span>
              <CivicMark /> CivicLens / Bengaluru
            </span>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              Public data, with provenance <ArrowUpRight size={14} />
            </a>
          </footer>
        </div>
      </main>
      {selected && (
        <CaseDrawer report={selected} onClose={() => setSelected(null)} />
      )}
      {reporting && (
        <ReportDialog
          onClose={() => setReporting(false)}
          onSaved={() => {
            setReporting(false);
            setView("My reports");
          }}
          configured={!!data?.configured.auth}
        />
      )}
    </div>
  );
}
function CaseDrawer({
  report: r,
  onClose,
}: {
  report: CivicReport;
  onClose: () => void;
}) {
  const dialogRef = useDialog(onClose);
  const [analysis, setAnalysis] = useState(""),
    [loading, setLoading] = useState(false),
    [analysisId, setAnalysisId] = useState("");
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
          aria-label="Close case"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="section-kicker">SOURCE RECORD · #{r.id}</div>
        <h2 id="case-title">{r.detail}</h2>
        <p>
          {r.category} · {r.ward}
        </p>
        <div className="case-status">
          <span className="status closed">Source: {r.status}</span>
          <span className="review-status">Field verification unavailable</span>
        </div>
        <h3>Evidence & provenance</h3>
        <dl>
          <dt>Recorded date</dt>
          <dd>{r.date}</dd>
          <dt>Source</dt>
          <dd>Sahaaya archive via Bengaluru Smart City Limited</dd>
          <dt>Location precision</dt>
          <dd>Ward name only. No coordinate inferred.</dd>
          <dt>Public source</dt>
          <dd>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              Dataset & data dictionary ↗
            </a>
          </dd>
        </dl>
        <h3>Source remarks</h3>
        <p className="remarks">
          {r.remarks || "No remarks supplied by the source."}
        </p>
        <h3>Evidence-led triage</h3>
        <p className="muted">
          Category and historical closure alone cannot establish current
          severity. Live analysis is a provisional assessment.
        </p>
        <button
          className="primary"
          disabled={loading}
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
                    "Analysis failed. The source remains saved; you can retry.",
                  );
                }
                setAnalysis(
                  "Analysis is processing. You can check its status again shortly.",
                );
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            } catch (error) {
              setAnalysis(
                error instanceof Error
                  ? error.message
                  : "Analysis service unavailable. The source record remains available.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {analysisId ? "Check analysis status" : "Run live analysis"}
        </button>
        {analysis && (
          <div className="analysis-result" role="status">
            {analysis}
          </div>
        )}
        <div className="notice">
          <ShieldCheck size={17} />
          No government dispatch or field inspection is claimed.
        </div>
      </aside>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const text = category.toLowerCase();
  const [Icon, tone] = text.includes("electrical")
    ? ([Zap, "orange"] as const)
    : text.includes("road")
      ? ([Construction, "purple"] as const)
      : text.includes("waste")
        ? ([Trash2, "green"] as const)
        : text.includes("forest")
          ? ([Trees, "green"] as const)
          : ([FileText, "blue"] as const);
  return (
    <span className={"report-category-icon " + tone} aria-hidden="true">
      <Icon size={18} strokeWidth={1.7} />
    </span>
  );
}
