"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  Layers,
  Loader2,
  MapPin,
  Menu,
  Mic,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
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
const sourceUrl = "https://github.com/Vonter/bbmp-citizen-grievances";
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [selected, setSelected] = useState<CivicReport | null>(null),
    [reporting, setReporting] = useState(false),
    [view, setView] = useState("Overview");
  const refresh = () =>
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error("Could not load the civic database");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
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
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Layers size={22} />
          </span>
          CivicLens<span className="brand-period">.</span>
        </a>
        <div className="workspace-label">CIVIC INTELLIGENCE</div>
        <button className="city-select">
          <span className="city-icon">
            <MapPin size={17} />
          </span>
          <span>
            Bengaluru<small>Karnataka, India</small>
          </span>
          <ChevronDown size={15} />
        </button>
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
              className={view === name ? "nav-item active" : "nav-item"}
              onClick={() => setView(name)}
              key={name}
            >
              <Icon size={18} />
              {name}
              {view === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Globe2 size={19} />
          </div>
          <strong>
            A clearer picture.
            <br />A more accountable city.
          </strong>
          <p>Every report is a step toward a better Bengaluru.</p>
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            Explore our data principles <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">BL</span>
          <span>
            Bengaluru workspace<small>Public access</small>
          </span>
          <ShieldCheck size={16} />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{view}</strong>
          </div>
          <div className="top-actions">
            <span className="public-label">
              <span /> Open civic platform
            </span>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              Source transparency <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> BENGALURU CIVIC OBSERVATORY
              </div>
              <h1>
                {view === "Overview"
                  ? "A better city starts with visibility."
                  : view === "Issue explorer"
                    ? "Every issue. In context."
                    : view === "Accountability"
                      ? "Follow the evidence."
                      : "The story behind the data."}
              </h1>
              <p>
                See what’s reported, understand what matters, and follow what
                happens next.
              </p>
            </div>
            <button className="primary" onClick={() => setReporting(true)}>
              <Plus size={17} /> Report an issue
            </button>
          </div>
          <div className="source-banner">
            <div className="source-emblem">
              <Database size={17} />
            </div>
            <div>
              <strong>Real records. Clear provenance.</strong>
              <span>
                {" "}
                Sahaaya civic grievances · historical public dataset · original
                statuses preserved
              </span>
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
          <section className="stat-grid" aria-label="Dataset metrics">
            {[
              {
                label: "Imported grievances",
                value: data?.total,
                icon: FileText,
                note: "Records in this imported window",
                color: "blue",
              },
              {
                label: "Source marked closed",
                value: data?.closed,
                icon: Check,
                note: "Official source status · not field verified",
                color: "green",
              },
              {
                label: "Distinct ward labels",
                value: data?.wards,
                icon: MapPin,
                note: "Source labels, not current official ward count",
                color: "purple",
              },
              {
                label: "Issue categories",
                value: data?.categories.length,
                icon: Layers,
                note: "Categories reported in the dataset",
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
          {view === "My reports" ? (
            <MyReports />
          ) : view === "Data & sources" ? (
            <section className="panel source-panel">
              <div className="section-kicker">DATA PROVENANCE</div>
              <h2>BBMP Sahaaya grievance archive</h2>
              <p>
                Imported from the public, ODbL-licensed Bengaluru citizen
                grievances dataset maintained by Vonter, sourced from Bengaluru
                Smart City Limited. This is a historical archive, not a live
                government dispatch feed.
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
                  Active local SQLite workspace. A Supabase/PostGIS mirror is
                  provisioned for future hosting.
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
              <div className="workspace-grid">
                <section className="panel map-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        City pulse <span className="subtle-tag">Bengaluru</span>
                      </h2>
                      <p>
                        A geographic view of your city’s civic infrastructure
                      </p>
                    </div>
                    <span className="map-context">
                      <span /> Geographic context
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
                      <span className="legend-dot" />
                      Archive records have ward names, not exact coordinates. No
                      issue pins are inferred.
                    </div>
                  </div>
                </section>
                <section className="panel breakdown">
                  <div className="panel-heading">
                    <div>
                      <h2>What’s being reported</h2>
                      <p>Category distribution · imported records</p>
                    </div>
                    <Activity size={17} />
                  </div>
                  <div className="category-bars">
                    {data?.categories.slice(0, 5).map((c, i) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setCategory(c.name);
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
                    <span>Counts are calculated from the database.</span>
                  </div>
                </section>
              </div>
              <section className="panel issues-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {view === "Accountability"
                        ? "Source status & review trail"
                        : "Explore the reports"}{" "}
                      <span className="count-pill">{matched}</span>
                    </h2>
                    <p>Original civic records, with context you can inspect.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setCategory("All categories");
                      setQuery("");
                      setView("Issue explorer");
                    }}
                  >
                    View all reports <ArrowRight size={15} />
                  </button>
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
                  <span className="table-window">
                    {matched.toLocaleString("en-IN")} matching records
                  </span>
                </div>
                <div className="table-scroll">
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
                            <button
                              className="issue-title"
                              onClick={() => setSelected(r)}
                            >
                              {r.detail}
                            </button>
                            <small>
                              {r.category} <span>·</span> #{r.id}
                            </small>
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
                            <ChevronRight size={16} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!reports.length && (
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
                  <span>
                    {searchBusy
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
              <section className="bottom-grid">
                <div className="principle-card">
                  <span className="principle-icon">
                    <Sparkles size={21} />
                  </span>
                  <div>
                    <h3>Priority with a reason.</h3>
                    <p>
                      Evidence-led AI triage, explicit uncertainty, and a human
                      review before decisions become claims.
                    </p>
                    <span className="capability-tag">
                      {data?.configured.ai
                        ? "Live AI configured"
                        : "Live AI awaits API configuration"}
                    </span>
                  </div>
                </div>
                <div className="principle-card">
                  <span className="principle-icon green">
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <h3>Accountability, by design.</h3>
                    <p>
                      Source closure and citizen verification are separate. An
                      official status is never presented as a verified repair.
                    </p>
                    <a href={sourceUrl} target="_blank" rel="noreferrer">
                      Understand the source <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>
              <Layers size={14} /> CivicLens · Built for a more accountable
              Bengaluru.
            </span>
            <span>Evidence first. People always.</span>
          </footer>
        </div>
      </main>
      {selected && (
        <CaseDrawer report={selected} onClose={() => setSelected(null)} />
      )}
      {reporting && (
        <ReportDialog
          onClose={() => setReporting(false)}
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
  const [analysis, setAnalysis] = useState(""),
    [loading, setLoading] = useState(false);
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="case-drawer" onClick={(e) => e.stopPropagation()}>
        <button
          className="close-button"
          aria-label="Close case"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="section-kicker">SOURCE RECORD · #{r.id}</div>
        <h2>{r.detail}</h2>
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
              const res = await fetch("/api/analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sourceId: r.id }),
              });
              const body = await res.json();
              setAnalysis(
                body.error || body.explanation || JSON.stringify(body),
              );
            } catch {
              setAnalysis(
                "Analysis service unavailable. The source record remains available.",
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
          Run live analysis
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
