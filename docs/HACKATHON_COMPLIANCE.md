# Hackathon compliance audit

Checked November 1, 2026 (IST) against the submission template and rules supplied in this chat. The user confirmed the event window is October 30 through November 1, 11:59 pm IST, and that AI assistance is allowed. This is an evidence-based project review, not an organizer's eligibility ruling.

**Verdict: the data-integrity checks pass; the project is not yet submission-complete.** Live deployment, a real live-AI demonstration, a video link, and a pitch-deck link remain outstanding. No judging score or model-accuracy claim has been invented.

## 1. Data integrity and a clean app

The user explicitly chose to retain real archive records. The running SQLite database and `/api/dashboard` independently reported:

- 5,000 imported source records.
- 1,573 source-marked closures; these are not described as field-verified repairs.
- 467 distinct source ward labels; these are not described as the current official ward count.
- 23 categories.
- Zero citizen reports and zero citizen review events.

These are audit-time database results, not constants used by the application. Counts, category shares, search results, dates, and source statuses are computed from the active backend. Native report IDs are generated on actual submission. Empty citizen workspaces remain empty.

The map uses real OpenStreetMap tiles and a real Bengaluru city centre. Archive coordinates are never fabricated from ward names. Only actual geolocated reports belonging to the signed-in citizen are added as private markers.

The archive importer streams compressed CSV from [Vonter's Sahaaya dataset](https://github.com/Vonter/bbmp-citizen-grievances), whose README attributes the records to Bengaluru Smart City Limited/BBMP. This is a community-maintained mirror of government-origin historical records, **not a direct official live API**. Preserve the attribution, ODbL notice, import time, and historical-source labels. If organizers interpret “official open dataset” as requiring a government-hosted URL, confirm acceptance of the mirror; do not describe it as an official live feed.

No canned AI success path was found. Missing credentials, provider failures, quota limits, and missing evidence return errors rather than simulated assessments. Input hints, category names, policy thresholds, map coordinates, and enum values are configuration/UI text, not invented grievance data.

Test fixture definitions are committed in test/verification code for repeatability; they are not application content. The local integration runner creates a random `.data/verification/...` directory. The cloud runner refuses non-loopback Supabase URLs and CI starts a disposable stack. Generated verification databases/media are ignored by Git, never imported into the citizen app, and never presented as genuine evidence.

### Corrections made during this audit

- Removed raw source staff remarks from local public-dashboard responses, matching the already-redacted archive/cloud responses.
- Replaced initial zero report counts with an unknown/loading state until an actual query completes.
- Exposed the model's structured observations and evidence citations in the private analysis view. Attachment links still pass through ownership-protected endpoints.
- The retry action now reruns the archive query as well as dashboard metrics; failed queries show an unavailable state rather than an endless loading label.

## 2. Submission requirements

- **Problem statement and audience — documented.** README and `docs/SUBMISSION.md` identify Bengaluru residents, civic evidence, project operators, and the difference between administrative closure and verified repair.
- **Solution and architecture — documented and implemented, with limits.** README includes setup, stack, source attribution, and a Mermaid architecture flow. The submission draft describes the actual AI and workflow boundaries.
- **Hosted prototype URL — missing.** `http://127.0.0.1:3000` is a working local app, not a public hosted submission URL. No hosted URL has been supplied or verified.
- **2–3 minute demo video URL — missing.** No recording or video link was found in the repository or supplied in this session. A demonstration must use the running backend and real inference. A screen recording of a real working run is distinct from passing off a mockup or prerecorded inference as live execution during judging.
- **Public repository — verified.** [CivicLens GitHub](https://github.com/SaravananRamar06/civiclens-bengaluru) is public and includes source, dependency lockfile, migrations, tests, Docker configuration, setup instructions, and an architecture diagram.
- **5–7 slide deck URL — missing.** No final deck or deck link has been supplied. The submission draft contains a six-slide content outline, not a claimed finished deck.

## 3. Evaluation pillars

### Engineering depth — implemented; production deployment still requires verification

Evidence includes PostgreSQL/PostGIS, report/evidence RLS, a private Storage bucket, MIME/signature/size checks, transactional review transitions, immutable evidence, citizen-controlled closure/reopening, audit events, bounded submissions and AI quotas, source ingestion, and spatial proximity suggestions. This is more than a static frontend or a single model API call.

Unit and isolated local/cloud integration checks exist and run in GitHub Actions. Passing these does not establish production uptime, load capacity, latency guarantees, or the availability of an unconfigured external account. No load-test benchmark is claimed. One persistent application instance is the supplied deployment configuration; multiple replicas need a shared Workflow backend.

### AI reasoning and workflow execution — integrated; live account test outstanding

Native report analysis sends the real description and selected private attachments to Gemini with consent. Output is schema-validated, observations cite an allowed evidence ID or description, and reported/visible/inferred claims are separated. The UI labels results provisional and displays uncertainty and source citations.

**Priority is currently a conservative deterministic keyword policy on the reported description.** It is not a trained visual severity classifier and does not derive severity from measured road depth, contamination levels, or structural inspection. Suggested AI categories do not autonomously dispatch authorities. Do not claim these capabilities.

The optional archive workflow uses durable read → extract → persist steps with bounded retries and recorded failure. It does not implement an open-ended autonomous planner or a multi-agent government-dispatch loop. No RAG pipeline, fine-tuned model, accuracy percentage, or hallucination-free guarantee is claimed.

Google's [Gemini 3.8 Flash model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash/) lists the configured model ID and text/image/audio inputs with structured output support. This verifies the documented capability, **not access, quota, or successful inference in this project's account**. No real inference has been verified because `GEMINI_API_KEY` is absent.

### Relevance, impact, and differentiation — supported concept; impact not measured

The differentiating implementation is the evidence-to-review trail: private media, explicit uncertainty, immutable resolution evidence, and citizen-confirmed closure/reopening, with historical source status kept separate. Actual users, municipal partnerships, adoption, repair rates, response-time improvements, and other impact metrics have not been measured and must not be fabricated in a pitch.

The current public dashboard covers the historical archive. Native citizen reports and their review history are private to owners and authorized operators. An anonymized live public accountability dashboard for native reports is not implemented; do not present the archive as that capability.

### Live demonstration and robustness — local system verified; hosted and live-AI proof incomplete

Existing checks cover invalid inputs, geographic bounds, ownership, cross-origin requests, evidence access, invalid transitions, concurrent upload limits, and missing AI credentials. A full deployed-domain Google OAuth run, live Gemini output, and recovery from an actual provider/network failure still need to be demonstrated. Do not equate a local integration test or a recorded mockup with the live judging flow.

## 4. Hackathon-window and ownership rules

The first repository commit is `6ee917c`, dated October 31, 2026, 21:07:19 IST. The inspected commit dates fall within the event window provided by the user. This is supporting evidence, not proof of when all original work began or an external plagiarism audit. Preserve the history; do not rewrite dates to imply eligibility.

Open-source dependencies are declared and pinned; project code has an MIT license and the archive has its separate ODbL terms. The reviewed design references are documented in `docs/DESIGN.md`; no third-party template source or screenshot artwork is bundled. AI coding assistance is allowed according to the user's confirmation. Team members still need to understand and independently explain their submission, as the supplied rules require.

Every presenting member should be able to trace:

1. A submitted report through `api/reports`, validation, local/cloud persistence, and the real review queue.
2. A private upload through type/signature checks, ownership, Storage, and authenticated download.
3. An AI request through consent, quota reservation, actual evidence loading, Gemini, citation validation, and saved result.
4. A resolution through operator permissions, current-cycle photo evidence, and citizen-only confirmation/reopening.
5. The historical archive through import, attribution, database aggregation, and filtered search.

## 5. Remaining launch/submission blockers

Current checks found `CIVIC_LOCAL_MODE=true`, no public `APP_ORIGIN`, no server-only Supabase key, no Gemini key, and disabled hosted Google OAuth. The hosted project has the original three migrations and still needs `20261031154739_cloud_reporting.sql`; migration filenames in the hosted history differ from the local originals, so reconcile history rather than rerunning initial DDL.

Before submitting:

1. Complete the production cloud setup in `docs/HOSTING.md`; retain the private evidence bucket and assign actual project operators.
2. Run `npm run cloud:check` and verify `/api/health` reports `supabase-postgresql` on the hosted HTTPS origin.
3. Demonstrate real text/photo/audio analysis with the configured account. No fabricated report or staged repair should be presented as a real civic outcome. Test fixtures stay in a separate staging environment.
4. Publish the hosted prototype URL, upload the 2–3 minute working-system video, and supply the 5–7 slide deck link.
5. Ensure each presenter can explain the code and clearly state that government delivery and field verification are not integrated.

These blockers are configuration, verification, and submission-material gaps. They cannot be replaced by placeholders, a simulated model response, or an invented URL.
