"use client";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useDialog } from "./use-dialog";
export type Staff = { role: "admin" | "officer"; authority: string | null };
export default function StaffDialog({
  onClose,
  onSignedIn,
}: {
  onClose: () => void;
  onSignedIn: (staff: Staff) => void;
}) {
  const dialogRef = useDialog(onClose);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/staff/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      onSignedIn(body);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not sign in. Try again.");
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
        <h2 id="staff-title">Staff sign-in</h2>
        <p>For authority officers and administrators. Accounts are created by an administrator.</p>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && (
            <div className="notice error" role="alert">
              {message}
            </div>
          )}
          <button className="primary full-width" disabled={busy}>
            {busy && <Loader2 className="spin" size={16} />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
