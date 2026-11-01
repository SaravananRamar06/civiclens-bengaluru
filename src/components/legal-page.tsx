import Link from "next/link";
import CivicMark from "./civic-mark";
export const contactUrl = "https://github.com/SaravananRamar06/civiclens-bengaluru/issues";
export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal">
      <header className="masthead">
        <Link className="brand" href="/">
          <CivicMark />
          CivicLens
        </Link>
      </header>
      <main className="page">
        <h1>{title}</h1>
        <p className="muted">Last updated 1 November 2026</p>
        {children}
        <p>
          <Link href="/">Back to CivicLens</Link>
        </p>
      </main>
    </div>
  );
}
