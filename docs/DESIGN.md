# CivicLens interface design

The frontend is an original Next.js implementation, informed by the four design sites reviewed in the browser. It keeps the real civic database, provenance, reporting, and evidence workflows intact.

- [Awwwards](https://www.awwwards.com/): restrained typography, generous spacing, and a clear introduction. The Korda listing called the template free, but the Framer catalogue showed a price, so its template code and assets were excluded.
- [Framer — Conversion](https://www.framer.com/marketplace/templates/conversion/): reviewed the free template and its live preview for primary/secondary actions, section rhythm, and minimal dark surfaces. Framer lists a limited licence; no Framer template source or assets are redistributed here.
- [Mobbin — Web](https://mobbin.com/explore/web): segmented controls, compact navigation, and readable dashboard flows. Reference screens are inspiration, not bundled assets.
- [Dribbble — CRM & Communication Management Dashboard](https://dribbble.com/shots/27853435-CRM-Communication-Management-Dashboard-UI-Design): compact metric hierarchy and balanced data panels. No shot artwork or template code is included.

## Implementation

- The city heading uses large Manrope typography, with a custom CL identity, charcoal navigation, stone surfaces, and a vermilion action colour. Three archive metrics replace the previous four-card block.
- A larger map and a category panel form the main workspace. The leading category share is calculated from the database. Category tabs, search, and list/card controls operate on the same archive API.
- Shared semantic colour tokens cover light and dark surfaces, text, borders, status colours, map controls, and dialogs.
- Light, dark, and system preferences persist locally and synchronize across tabs. An inline bootstrap resolves appearance before first paint.
- Report cards and the table use the same live archive query and open the same evidence drawer. Small screens start with cards.
- Short entrance, chart, hover, and dialog animations respect `prefers-reduced-motion`.
- The dark map filter applies only to the map canvas; uploaded evidence is displayed without colour alteration.

No additional UI framework or animation dependency is required. Icons use the existing Lucide library; motion uses CSS.

## Logo

The original CivicLens monogram combines an open circular C (the lens) with a geometric L (a street corner). It uses solid paths, so it stays sharp at small sizes and supports a single-colour treatment. The reusable component is `src/components/civic-mark.tsx`; it appears in the desktop brand, mobile header, and footer. `src/app/icon.svg` supplies the browser icon through Next.js metadata.

Transparent SVG assets are available in `public/brand/`: `civiclens-mark.svg` for light backgrounds and `civiclens-mark-reversed.svg` for dark backgrounds. Keep the proportions intact and leave at least one stroke-width of clear space around the mark. The wordmark uses Manrope.

## Data integrity

The application never seeds citizen reports, resolution histories, or map pins. Public entries come from the imported Sahaaya archive, with their source and historical status identified. Metrics and category shares are derived at runtime. A new citizen workspace has an empty report list. Test records are confined to isolated verification databases and never shown in the app.
