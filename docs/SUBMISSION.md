# CivicLens — hackathon submission draft

This draft describes the implemented system. Missing submission links are explicitly identified; this is not a completed submission.

## 1. Problem statement

**Target issue and context:** Bengaluru residents encounter damaged streets, water leaks, waste, obstructions, and electrical hazards. Reports need sufficient evidence, a consistent review path, and a traceable outcome. Historical administrative closure is different from a repair that the reporting citizen has confirmed.

**Target audience:** Bengaluru residents submitting civic issues and project operators reviewing evidence and preparing handoffs. The public can inspect the attributed historical grievance archive. This project is not an official government service.

## 2. Solution description

**High-level overview:** Citizens submit a description and Bengaluru location, then attach a photograph or record/upload audio. With explicit consent, Gemini extracts evidence-backed observations, an English transcript when appropriate, a summary, a suggested category, and uncertainty. A deterministic policy assigns a provisional text-based priority; a category rule chooses a project review queue. Operators record their review actions and may propose a resolution using new photographic evidence. The reporting citizen confirms closure or reopens the issue.

The public archive preserves source dates and statuses and clearly separates source closure from verified repair. Native citizen report histories remain private to owners/operators; a live anonymized public dashboard for those reports is a roadmap item. No fake complaints, fabricated measurements, made-up map coordinates, or simulated AI success responses are used.

**Technical architecture:**

- Next.js 16 / React 19 / TypeScript UI and server routes; MapLibre with real OpenStreetMap tiles.
- Supabase Auth, PostgreSQL/PostGIS, ownership/operator RLS, and private Storage for cloud reports, immutable evidence, and audit history.
- Node.js 24 SQLite and private filesystem evidence for the local workspace; local receipt sessions are not presented as Google OAuth.
- AI SDK 7 with Gemini 3.8 Flash for real multimodal structured extraction. Credentials and live inference are not yet configured/verified in the current workspace.
- Workflow SDK 5 for the optional durable historical-source analysis workflow: read source, extract evidence, persist outcome, record failure.
- Historical [Sahaaya archive maintained by Vonter](https://github.com/Vonter/bbmp-citizen-grievances), attributed upstream to Bengaluru Smart City Limited/BBMP, under ODbL. The active backend holds the imported records; this is not a direct live government feed.
- Real authentication/database/storage integration tests run against a disposable Supabase stack. Application data and test fixtures are isolated.

The architecture diagram and installation instructions are in the repository README. There is no trained visual severity model, autonomous government dispatch, or measured impact/accuracy benchmark to claim.

## 3. Prototype link

**Not yet deployed/supplied.** The app currently runs locally. A public HTTPS URL must be added after the cloud configuration and deployed-domain checks pass. Localhost does not satisfy the hosted-app requirement.

## 4. Demo video

**Not yet recorded/uploaded.** Supply a 2–3 minute video URL after recording an actual working run. During live judging, operate the real system rather than playing prerecorded inference as if it were live.

Suggested recording flow:

- 0:00–0:20 — Define the problem, audience, and difference between source closure and citizen confirmation.
- 0:20–0:45 — Inspect a real archive entry and its source/date/status. Explain that archive ward names do not produce invented issue pins.
- 0:45–1:20 — Submit a genuine issue with permission to use the location/media, or explicitly identify a separate staging test. Show backend persistence and private evidence.
- 1:20–2:05 — Consent to AI processing and trigger real inference. Show the actual result, observations/citations, uncertainty, provisional priority, and project queue. Do not use cached or canned output as live model execution.
- 2:05–2:40 — Show authorized review/history and access protection. Use an isolated staging case for simulated resolution transitions; do not claim an unperformed civic repair.
- 2:40–3:00 — State the deployment, source, limitations, and roadmap.

Practice with the actual network and account quota. If an inference call fails, show the real failure and retry path; do not replace it with a fabricated response.

## 5. GitHub repository

https://github.com/SaravananRamar06/civiclens-bengaluru

Public repository with README setup instructions, architecture flowchart, pinned dependencies, migrations, Docker configuration, tests, and source code. Runtime credentials, imported raw data, private reports, and uploaded evidence are excluded from Git.

## 6. Presentation / pitch deck

**Final deck and link not yet supplied.** Recommended six-slide outline:

1. **CivicLens and team:** project name, actual team members and roles, Bengaluru focus. Team details must be supplied by the team.
2. **The problem:** fragmented civic evidence and the gap between an administrative status and confirmed repair. Use cited source context rather than invented impact figures.
3. **The solution:** real submission → private evidence → provisional AI extraction/policy triage → project review → citizen confirmation/reopening.
4. **Architecture and engineering:** Next.js, Supabase/PostGIS/private Storage, structured multimodal extraction, durable archive workflow, RLS, immutable evidence, and audit states.
5. **Working proof:** actual hosted URL and live workflow; show real source provenance and results, not placeholder charts. Mention verified tests separately from AI accuracy.
6. **Roadmap and limits:** official authority integration, measured pilot evaluation, broader language support, and scaling with a shared workflow backend. Clearly separate these plans from implemented functionality.

## Submission truthfulness

The user confirmed an October 30–November 1, 11:59 pm IST event window and that AI assistance is allowed. The inspected repository starts on October 31. Team members must still be able to explain the implementation. See `HACKATHON_COMPLIANCE.md` for the evidence, current blockers, and limits of this audit.
