import type { Metadata } from "next";
import "./globals.css";
import "./design.css";
import "./theme.css";
import { themeBootstrap } from "@/lib/theme";
export const metadata: Metadata = {
  title: "CivicLens · Bengaluru",
  description:
    "Evidence-led civic reporting and transparent infrastructure triage for Bengaluru.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
