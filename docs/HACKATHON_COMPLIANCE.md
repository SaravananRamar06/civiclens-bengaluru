# Hackathon compliance audit

Checked 1 November 2026 against the submission template, scoring rubric and rules supplied by the team. This is an evidence-based project review, not an organiser's ruling.

**Verdict: no disqualifying issue was found, but the project is not ready to submit.** AI has not run live, reporting is off on the hosted site, and the video and deck do not exist yet.

## Submission template

| Item | Status | Evidence or gap |
|---|---|---|
| Problem statement and audience | Ready | `docs/SUBMISSION.md` |
| Solution and architecture | Ready | `docs/SUBMISSION.md`, README |
| Live prototype | **Partial** | Site is live, but reports and AI don't work there yet |
| 2 to 3 minute demo video | **Missing** | Must show real-time AI, so it depends on the Gemini key |
| Public repository and README | Ready | Public repo; README has setup steps and an architecture diagram |
| 5 to 7 slide deck | **Missing** | Outline in `docs/SUBMISSION.md` |

## Disqualification rules

| Rule | Status | Evidence |
|---|---|---|
| No dummy data | Pass | No JSON fixtures, mock datasets or hardcoded statistics in `src`; figures are computed from a live Supabase database |
| No pre-existing project | Pass | All 14 commits are dated inside the build window; the first is 31 October 2026, 21:07 IST |
| No plagiarism | Pass, as far as checked | Open-source dependencies are declared and the data is attributed; no external plagiarism check was run |
| No mockups passed off as live | **Depends on the team** | Show the real system. The required video must be a real run. Don't play a recording as live during judging |
| No unauthorized assistance | **Confirm** | The team reports AI assistance is allowed. If unsure, confirm with organisers |
| Code ownership | **Team action** | Every member must be able to explain the code, data flow and AI logic independently |
| No secrets in the repository | Pass | No keys in tracked files or history |

**Data source caveat:** the rule allows live databases or official open datasets. The archive sits in a live database, but its source is a community mirror of government-origin records, not a government-hosted dataset. If organisers read the rule strictly, confirm with them. Never describe it as a live official feed.

## Problem statement

| Requirement | Implementation | Verified |
|---|---|---|
| Open platform | Public dashboard, feed and map with no account; guest reporting | Local build |
| Visual or audio reports | Photo and voice note in the report form; text optional | Photo end to end; audio upload; full voice cycle not run |
| Automatic severity | Gemini rates Critical to Low; safety rules set a floor | Rules tested; **live Gemini not run** |
| Routes to authorities | BWSSB, BESCOM, BSWML, KSPCB or city corporation, with a packet | Unit tested; no automatic delivery |
| Public accountability | Per-authority totals, response time, confirmed repairs | Local build |

## Scoring rubric

- **Technical depth (20):** strong. Row-level security, private evidence, audited state transitions, durable workflows, PostGIS and anonymised public views go well beyond a wrapper.
- **AI reasoning and execution (25):** the biggest risk. Guardrails exist, including citation checks, a safety floor and uncertainty, but nothing has run live and no accuracy is measured. Report analysis is one model call and fails on a bad citation; it doesn't self-correct.
- **Relevance, impact and USP (25):** strong concept. Evidence-based closure and the Complaint Wall are distinctive. Impact is unmeasured, so don't claim figures.
- **Live demo and robustness (30):** at risk until reporting works on the hosted site. Invalid input, cross-origin requests, missing AI and failed uploads are handled locally, but the hosted flow is untested. Gemini quota is a live-demo risk.

## Privacy

The public view exposes only a short reference, category, authority, severity, status, dates and a location rounded to about a kilometre. Descriptions, evidence, identities and exact coordinates are never returned, and an integration test checks this.

## Outstanding before submission

1. Add `GEMINI_API_KEY` on Vercel and run real analyses with a photo and a voice note.
2. Apply both pending migrations to the hosted database and enable anonymous sign-ins.
3. Assign at least one reviewer in `civic_operators`.
4. Rehearse the full flow on the live site.
5. Record the video and make the deck.
6. Have a Kannada speaker check the stamp text.
7. Make sure every member can explain the system.
