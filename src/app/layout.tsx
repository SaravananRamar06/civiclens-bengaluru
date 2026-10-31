import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CivicLens · Bengaluru",
  description:
    "Evidence-led civic reporting and transparent infrastructure triage for Bengaluru.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
