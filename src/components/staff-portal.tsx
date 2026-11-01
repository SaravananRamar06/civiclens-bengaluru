"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import CivicMark from "./civic-mark";
import StaffDialog, { type Staff } from "./staff-dialog";
import { authorities } from "@/lib/routing";
import type { PublicReport } from "@/lib/accountability";
type Department = keyof typeof authorities;
const departments = Object.entries(authorities) as [Department, string][];
function usePublicReports() {
  const [reports, setReports] = useState<PublicReport[] | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/public-reports", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((body) => setReports(body.reports))
      .catch(() => setFailed(true));
  }, []);
  return { reports, failed };
}
function useStaff() {
  const [staff, setStaff] = useState<Staff | null>(null);
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((s) => s.role && setStaff({ role: s.role, authority: s.authority }))
      .catch(() => {});
  }, []);
  return { staff, setStaff };
}
function Portal({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="legal portal">
      <header className="masthead">
        <Link className="brand" href="/">
          <CivicMark />
          CivicLens
        </Link>
        <div className="portal-links">
          <Link href="/">Public site</Link>
          <Link href="/staff">Staff</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </header>
      <main className="page">
        <h1>{title}</h1>
        <p className="portal-intro">{intro}</p>
        {children}
      </main>
    </div>
  );
}
function SignIn({ staff, setStaff }: { staff: Staff | null; setStaff: (s: Staff) => void }) {
  const [open, setOpen] = useState(false);
  if (staff)
    return (
      <div className="notice">
        Signed in as {staff.role === "admin" ? "an administrator" : `an officer of ${staff.authority}`}.{" "}
        <a href="/#desk">Open your desk</a>
      </div>
    );
  return (
    <>
      <div className="notice">
        This is a public view. Report text, photos, voice notes and exact
        locations appear only for signed-in staff, and so do review actions.{" "}
        <button onClick={() => setOpen(true)}>Staff sign-in</button>
      </div>
      {open && (
        <StaffDialog
          onClose={() => setOpen(false)}
          onSignedIn={(account) => {
            setStaff(account);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
function DepartmentTable({ reports }: { reports: PublicReport[] }) {
  return (
    <div className="table-frame" role="region" aria-label="Reports by department" tabIndex={0}>
      <table className="authority-table">
        <caption className="sr-only">Reports by department</caption>
        <thead>
          <tr>
            <th scope="col">Department</th>
            <th scope="col">Assigned</th>
            <th scope="col">Open</th>
            <th scope="col">Critical and open</th>
            <th scope="col">Confirmed fixed</th>
          </tr>
        </thead>
        <tbody>
          {departments.map(([key, name]) => {
            const own = reports.filter((r) => r.authority === name);
            const open = own.filter((r) => r.status !== "Closed");
            return (
              <tr key={key}>
                <th scope="row">
                  <Link href={`/department/${key}`}>{name}</Link>
                </th>
                <td>{own.length}</td>
                <td>{open.length}</td>
                <td>{open.filter((r) => r.severity === "Critical").length}</td>
                <td>{own.length - open.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function StaffHome() {
  const { reports, failed } = usePublicReports();
  const { staff, setStaff } = useStaff();
  return (
    <Portal title="Staff and departments" intro="Every department’s queue, with the most serious reports first.">
      <SignIn staff={staff} setStaff={setStaff} />
      {failed ? <p className="empty">Live figures can’t load right now. Refresh to try again.</p> : reports ? <DepartmentTable reports={reports} /> : <p className="empty">Loading departments…</p>}
    </Portal>
  );
}
const severityOrder = ["Critical", "High", "Medium", "Low", "Unassessed"];
export function DepartmentView({ department }: { department: string }) {
  const name = authorities[department as Department];
  const { reports, failed } = usePublicReports();
  const { staff, setStaff } = useStaff();
  if (!name)
    return (
      <Portal title="Department not found" intro="This address doesn’t match a department.">
        <Link href="/staff">See all departments</Link>
      </Portal>
    );
  const own = (reports ?? [])
    .filter((r) => r.authority === name)
    .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
  const open = own.filter((r) => r.status !== "Closed");
  return (
    <Portal title={name} intro="Reports assigned to this department’s review queue, most serious first.">
      <SignIn staff={staff} setStaff={setStaff} />
      {failed ? (
        <p className="empty">This queue can’t load right now. Refresh to try again.</p>
      ) : !reports ? (
        <p className="empty">Loading the queue…</p>
      ) : own.length === 0 ? (
        <p className="empty">No reports have been assigned here yet.</p>
      ) : (
        <>
          <dl className="live-figures">
            {[
              ["Assigned", own.length],
              ["Open", open.length],
              ["Critical and open", open.filter((r) => r.severity === "Critical").length],
              ["Confirmed fixed", own.length - open.length],
            ].map(([label, value]) => (
              <div key={label}>
                <dd>{value}</dd>
                <dt>{label}</dt>
              </div>
            ))}
          </dl>
          <ol className="public-feed">
            {own.map((report) => (
              <li key={report.ref}>
                <strong className="severity" data-severity={report.severity}>
                  {report.severity}
                </strong>
                <span>{report.category}</span>
                <span>
                  Filed {new Date(report.filed).toLocaleDateString("en-IN")}, near {report.latitude}, {report.longitude}
                </span>
                <span className={`status ${report.status === "Closed" ? "closed" : "pending"}`}>{report.status}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Portal>
  );
}
type Member = { email: string; role: string; authority: string | null };
function StaffAccounts() {
  const [members, setMembers] = useState<Member[]>([]),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [role, setRole] = useState("officer"),
    [authority, setAuthority] = useState(departments[0][1]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    fetch("/api/admin/staff", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.error);
        setMembers(body.staff);
      })
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    load();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, ...(role === "officer" ? { authority } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setMessage(`Account created for ${body.email}. Give them the password privately.`);
      setEmail("");
      setPassword("");
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="live-record">
      <h2>Staff accounts</h2>
      <form className="staff-form" onSubmit={submit}>
        <label className="field-label">
          Work email
          <input className="report-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field-label">
          Temporary password
          <input className="report-input" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field-label">
          Role
          <select className="report-input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="officer">Officer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {role === "officer" && (
          <label className="field-label">
            Department
            <select className="report-input" value={authority} onChange={(e) => setAuthority(e.target.value)}>
              {departments.map(([key, name]) => (
                <option key={key}>{name}</option>
              ))}
            </select>
          </label>
        )}
        <button className="primary" disabled={busy}>
          {busy && <Loader2 className="spin" size={16} />}
          Create account
        </button>
      </form>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {members.length > 0 && (
        <div className="table-frame" role="region" aria-label="Staff accounts" tabIndex={0}>
          <table className="authority-table">
            <caption className="sr-only">Staff accounts</caption>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Department</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.email}>
                  <th scope="row">{member.email}</th>
                  <td>{member.role}</td>
                  <td>{member.authority ?? "All departments"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export function AdminHome() {
  const { reports, failed } = usePublicReports();
  const { staff, setStaff } = useStaff();
  return (
    <Portal title="Admin" intro="Oversee every department and manage staff accounts.">
      <SignIn staff={staff} setStaff={setStaff} />
      {failed ? <p className="empty">Live figures can’t load right now. Refresh to try again.</p> : reports ? <DepartmentTable reports={reports} /> : <p className="empty">Loading departments…</p>}
      {staff?.role === "admin" ? (
        <StaffAccounts />
      ) : (
        <p className="muted portal-note">Creating staff accounts needs an administrator sign-in.</p>
      )}
    </Portal>
  );
}
