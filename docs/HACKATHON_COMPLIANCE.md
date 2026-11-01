# Hackathon compliance audit

Checked 1 November 2026 against the problem statement and rules supplied by the team. This is an evidence-based project review, not an organiser's ruling.

## Problem statement

| Requirement | Implementation | Verified |
|---|---|---|
| Open platform | Public dashboard, feed and map with no account needed; guest reporting | Local build; hosted after migration |
| Visual or audio reports | Photo and voice note in the report form; text optional | Photo end to end; audio upload and error handling; recording not exercised with a real microphone |
| Automatic severity | Gemini rates Critical to Low from the evidence; safety rules set a floor | Rules tested; **live Gemini not yet run** |
| Routes to authorities | Category and text map to BWSSB, BESCOM, BSWML, KSPCB or the city corporation; packet addressed to them | Unit tested; no automatic delivery to any authority |
| Public accountability dashboards | Per-authority totals, response time and confirmed repairs, plus archive figures by department | Local build; hosted after migration |

## Rules

- **No dummy data:** records come from the imported Sahaaya archive and real submissions. All figures are computed from the active backend. An empty dashboard stays empty. The archive is a community mirror of government-origin records, not a live official API; confirm with organisers if that matters.
- **Built in the window:** the first commit is dated 31 October 2026. Preserve the history.
- **Explain the code:** every member must be able to trace a report through validation, storage, analysis, routing, the public view and closure.
- **Live demo:** operate the real system. A screen recording of a real run is fine for the video, but don't present a recording as live during judging.

## Privacy

The public view exposes only a short reference, category, authority, severity, status, dates and a location rounded to two decimal places, about a kilometre. Descriptions, evidence, identities and exact coordinates are never returned, and an integration test checks this. Staff remarks from the source are not shown.

## Outstanding before submission

1. Apply both pending migrations to the hosted database and enable anonymous sign-ins.
2. Add `GEMINI_API_KEY` on Vercel and run a real analysis with a photo and with a voice note.
3. Assign at least one reviewer in `civic_operators` so the review steps can be shown.
4. Record the 2 to 3 minute video and make the deck.
5. Have a Kannada speaker check the stamp text.
