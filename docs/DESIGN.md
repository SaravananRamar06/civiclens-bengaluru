# CivicLens interface design

The frontend is an original Next.js implementation, informed by the four design sites reviewed in the browser. It keeps the real civic database, provenance, reporting, and evidence workflows intact.

- [Awwwards](https://www.awwwards.com/): restrained typography, generous spacing, and a clear introduction. The Korda listing called the template free, but the Framer catalogue showed a price, so its template code and assets were excluded.
- [Framer — Conversion](https://www.framer.com/marketplace/templates/conversion/): reviewed the free template and its live preview for primary/secondary actions, section rhythm, and minimal dark surfaces. Framer lists a limited licence; no Framer template source or assets are redistributed here.
- [Mobbin — Web](https://mobbin.com/explore/web): segmented controls, compact navigation, and readable dashboard flows. Reference screens are inspiration, not bundled assets.
- [Dribbble — CRM & Communication Management Dashboard](https://dribbble.com/shots/27853435-CRM-Communication-Management-Dashboard-UI-Design): compact metric hierarchy and balanced data panels. No shot artwork or template code is included.

## Implementation

- Shared semantic colour tokens cover light and dark surfaces, text, borders, status colours, map controls, and dialogs.
- Light, dark, and system preferences persist locally and synchronize across tabs. An inline bootstrap resolves appearance before first paint.
- Report cards and the table use the same live archive query and open the same evidence drawer. Small screens start with cards.
- Short entrance, chart, hover, and dialog animations respect `prefers-reduced-motion`.
- The dark map filter applies only to the map canvas; uploaded evidence is displayed without colour alteration.

No additional UI framework or animation dependency is required. Icons use the existing Lucide library; motion uses CSS.
