# CivicLens: hackathon submission draft

Everything below describes what is built. Items still open are marked. Nothing here claims a government partnership or measured impact.

## 1. Problem statement

Transparent Civic Grievance & Infrastructure Triage System: an open platform where citizens submit visual or audio reports of localized civic issues (road or bridge damage, pollution, water leaks). The system automatically evaluates severity, routes issues to relevant authorities, and maintains public accountability dashboards.

**Our angle: closed isn't fixed.** In the Sahaaya archive, 1,573 of 5,000 Bengaluru complaints are marked closed, and nothing records whether anyone checked the repair. An administrative status is not evidence.

**Audience:** Bengaluru residents reporting issues, reviewers preparing handoffs, and anyone who wants to see which authority is responding.

## 2. Solution

1. **Show it or say it.** A resident adds a photo or a voice note, up to 60 seconds, and places the issue on a map. Typing is optional and no account is needed.
2. **AI rates severity.** Gemini reads the photo, voice and text together, transcribes English audio, and rates severity from Critical to Low with its reasons and uncertainty. Deterministic safety rules act as a floor, so AI can raise a rating but cannot lower an obvious danger such as an open manhole.
3. **Routing.** Each report is assigned to the responsible body: BWSSB for water and sewerage, BESCOM for electricity, BSWML for solid waste, KSPCB for pollution, and the city corporation under the Greater Bengaluru Authority for roads, bridges, stormwater drains and street lights. If the resident isn't sure of the type, AI chooses it. A handoff packet is prepared for that authority.
4. **Public accountability.** A public dashboard shows, per authority, reports routed, acknowledged, typical response time and repairs confirmed, with a live feed and map pins. Descriptions, evidence, identities and exact locations stay private, and pins are rounded to about a kilometre.
5. **Closing takes proof.** An operator must attach a photo of the repair, and only the person who reported the issue can confirm it or reopen it.

**The Complaint Wall** shows all 5,000 archive records as one square each, solid if marked closed. It makes the scale of the problem visible immediately.

## 3. Architecture

- Next.js 16, React 19 and TypeScript for the interface and server routes, with MapLibre and OpenStreetMap tiles.
- Supabase Auth with guest and Google sign-in, PostgreSQL with PostGIS and row-level security, and private Storage for evidence and audit history.
- AI SDK 7 with Gemini for multimodal structured analysis. Workflow SDK 5 for durable analysis of archive records.
- The public dashboard reads a database function that returns only anonymised fields.
- [Sahaaya archive maintained by Vonter](https://github.com/Vonter/bbmp-citizen-grievances), attributed to Bengaluru Smart City Limited/BBMP, under ODbL. It is a historical archive, not a live government feed.

Integration tests run against a real production server and a disposable Supabase stack in GitHub Actions.

## 4. Links

- **Live site:** https://civiclens-bengaluru.vercel.app
- **Repository:** https://github.com/SaravananRamar06/civiclens-bengaluru
- **Demo video:** not yet recorded.
- **Deck:** not yet made.

## 5. Suggested demo, 2 to 3 minutes

- 0:00 Open the site. Let the Wall fill and the stamp land. State the problem in one sentence.
- 0:20 Hover the Wall, filter to Street lights, and open a closed record: nobody checked it.
- 0:45 Report a genuine issue with a photo and a voice note, no typing. Show the AI severity, its reasons, and the authority chosen.
- 1:40 Open Accountability and show the report in the public feed and the authority table, then the private details staying private.
- 2:10 Show the handoff packet and a repair that needs a photo and the reporter's confirmation.
- 2:40 State the limits and the roadmap.

Use a real issue with permission, or say clearly that it is a test report. During live judging, operate the real system.

## 6. Deck outline

1. CivicLens and the team.
2. The problem: closed isn't fixed, using the archive figures.
3. The solution: photo or voice, AI severity, routing, public record, confirmed repair.
4. Architecture and privacy.
5. Live proof: the hosted site.
6. Limits and roadmap.

## 7. What to say about limits

- Authorities are not integrated. CivicLens assigns the right body and prepares a packet; it does not deliver to them or speak for them.
- AI severity is provisional and needs human verification. No accuracy figure has been measured.
- Assigning a report to one of the five specific corporations needs their boundary data, which is on the roadmap.
- Adoption and repair outcomes have not been measured, so don't state impact figures.
