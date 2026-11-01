import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { contactUrl } from "@/components/legal-page";
export const metadata: Metadata = { title: "Privacy policy · CivicLens" };
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        CivicLens is an independent student project by Team Re-zero, built for
        the Forge ’26 buildathon. It is not a government service.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>What you submit: your words, photos, voice recordings, the type of issue and its exact map location.</li>
        <li>The review history of each report.</li>
        <li>Guests use an anonymous session, with no name or email.</li>
        <li>If you continue with Google, Supabase Auth receives your Google account’s identity details, such as your name and email.</li>
        <li>Staff accounts use an email address and password.</li>
      </ul>
      <p>
        Please leave personal details and people’s faces out of your reports.
      </p>
      <h2>Cookies and browser storage</h2>
      <p>
        We use session cookies to keep you signed in and to connect you to your
        reports, and your browser stores your light or dark preference. We don’t
        use advertising or analytics cookies.
      </p>
      <h2>AI analysis</h2>
      <p>
        If you leave the AI option ticked, your words, photo and voice note are
        sent to Google Gemini to rate severity and suggest routing. Free-tier
        inputs may be used by Google for product improvement. Untick the option
        to skip AI.
      </p>
      <h2>Who can see your report</h2>
      <ul>
        <li>Anyone can see the public summary: issue type, severity, assigned authority, status, dates, and a location rounded to about a kilometre.</li>
        <li>Your words, photos, voice notes and exact location are visible to you, to officers of the assigned authority, and to project administrators.</li>
      </ul>
      <p>Nothing is sent to any government authority automatically.</p>
      <h2>Service providers</h2>
      <ul>
        <li>Supabase stores the database, accounts and evidence.</li>
        <li>Vercel hosts the site.</li>
        <li>Google provides AI analysis and optional sign-in.</li>
        <li>OpenStreetMap provides map tiles, and receives normal browser requests, including your IP address.</li>
      </ul>
      <h2>Keeping and removing data</h2>
      <p>
        Reports and evidence are kept for the project. There is no self-service
        deletion yet, so please ask us if you want a report removed. Guest access
        depends on your browser session: if you clear it, you lose access to
        your reports, though they stay on record.
      </p>
      <h2>Contact</h2>
      <p>
        Reach us through the{" "}
        <a href={contactUrl} target="_blank" rel="noreferrer">
          project’s issue page
        </a>
        . Issues are public, so don’t post personal details there. See also the{" "}
        <Link href="/terms">terms of service</Link>.
      </p>
    </LegalPage>
  );
}
