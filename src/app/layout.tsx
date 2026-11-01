import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Noto_Sans_Kannada, Public_Sans } from "next/font/google";
import "./civic.css";
import { themeBootstrap } from "@/lib/theme";
const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-display", adjustFontFallback: false });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], weight: "800", variable: "--font-kannada" });
const description =
  "Bengaluru’s complaint archive says closed. CivicLens asks whether it was fixed, with evidence, a traceable review and citizen-confirmed repairs.";
export const metadata: Metadata = {
  title: "CivicLens · Bengaluru",
  description,
  openGraph: { title: "CivicLens · Bengaluru", description, type: "website" },
  twitter: { card: "summary", title: "CivicLens · Bengaluru", description },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f8" },
    { media: "(prefers-color-scheme: dark)", color: "#14144a" },
  ],
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${kannada.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
