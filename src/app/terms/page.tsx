import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { contactUrl } from "@/components/legal-page";
export const metadata: Metadata = { title: "Terms of service · CivicLens" };
export default function Terms() {
  return (
    <LegalPage title="Terms of service">
      <p>
        CivicLens is an independent student project by Team Re-zero. No
        government body runs or endorses it. By using it, you agree to these
        terms.
      </p>
      <h2>Not an emergency service</h2>
      <p>
        If someone is in immediate danger, contact your local emergency services.
        Don’t rely on CivicLens.
      </p>
      <h2>What a report is</h2>
      <p>
        A report here is not an official complaint. CivicLens assigns an
        authority and prepares a handoff packet, but nothing is delivered to any
        authority automatically. We don’t promise a response or a repair.
      </p>
      <h2>AI ratings</h2>
      <p>
        Severity ratings and suggested categories are provisional and can be
        wrong. They need human verification.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Submit genuine reports only.</li>
        <li>Don’t post abusive or illegal content, or other people’s personal data.</li>
        <li>Don’t try to bypass limits or reach data that isn’t yours.</li>
      </ul>
      <p>
        Limits apply to reports and AI analysis, and we may remove content or
        restrict access to protect the service.
      </p>
      <h2>Availability</h2>
      <p>
        The service is provided as is, with no guarantee that it will be
        available or free of errors.
      </p>
      <h2>Licences</h2>
      <p>
        Archive data comes from the{" "}
        <a href="https://github.com/Vonter/bbmp-citizen-grievances" target="_blank" rel="noreferrer">
          Bengaluru citizen grievances dataset
        </a>{" "}
        under ODbL. The code is under the MIT License.
      </p>
      <h2>Contact</h2>
      <p>
        Reach us through the{" "}
        <a href={contactUrl} target="_blank" rel="noreferrer">
          project’s issue page
        </a>
        . See also the <Link href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
