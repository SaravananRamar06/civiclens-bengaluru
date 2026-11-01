"use client";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useDialog } from "./use-dialog";
import { authorities } from "@/lib/routing";
export type Staff = { role: "admin" | "officer"; authority: string | null };
export default function StaffDialog({
  onClose,
  onSignedIn,
}: {
  onClose: () => void;
  onSignedIn: (staff: Staff) => void;
}) {
  const dialogRef = useDialog(onClose);
  const [mode, setMode] = useState<"signin" | "request">("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authority, setAuthority] = useState(Object.values(authorities)[0]),
    [message, setMessage] = useState(""),
    [requested, setRequested] = useState(false),
    [busy, setBusy] = useState(false);
  const requesting = mode === "request";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(requesting ? "/api/staff/signup" : "/api/staff/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requesting ? { email, password, authority } : { email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      if (requesting) setRequested(true);
      else onSignedIn(body);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "That didn’t work. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay modal-overlay">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="report-modal staff-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-title"
      >
        <button className="close-button" aria-label="Close staff sign-in" onClick={onClose}>
          <X />
        </button>
        <h2 id="staff-title">{requesting ? "Request staff access" : "Staff sign-in"}</h2>
        {requested ? (
          <p role="status">
            Check your work email and confirm your address. An administrator
            then reviews your request, and you can sign in once it’s approved.
          </p>
        ) : (
          <>
            <p>
              {requesting
                ? "For officers of a Bengaluru authority. Use your work email. An administrator approves every request."
                : "For authority officers and administrators."}
            </p>
            <form onSubmit={submit}>
              <label className="field-label">
                Work email
                <input
                  className="report-input"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field-label">
                Password
                <input
                  className="report-input"
                  type="password"
                  autoComplete={requesting ? "new-password" : "current-password"}
                  minLength={requesting ? 10 : undefined}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {requesting && (
                <label className="field-label">
                  Your authority
                  <select
                    className="report-input"
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                  >
                    {Object.values(authorities).map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
              )}
              {message && (
                <div className="notice error" role="alert">
                  {message}
                </div>
              )}
              <button className="primary full-width" disabled={busy}>
                {busy && <Loader2 className="spin" size={16} />}
                {busy ? "Sending…" : requesting ? "Request access" : "Sign in"}
              </button>
            </form>
            <button
              className="text-button"
              onClick={() => {
                setMode(requesting ? "signin" : "request");
                setMessage("");
              }}
            >
              {requesting ? "Already approved? Sign in" : "New here? Request access"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
