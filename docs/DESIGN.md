# CivicLens interface design

The idea is one sentence: closed isn't fixed. Everything visual comes from the world that sentence belongs to, the Indian government complaint slip and the rubber stamp that closes a file.

The direction was set after reviewing the showcases [Awwwards](https://www.awwwards.com/websites/) and [Recent](https://recent.design/), which suggested large type as the image, an identity drawn from the subject, and one memorable interaction. No layouts, source or artwork come from any showcased site.

## Identity

- **Colour:** carbon-copy indigo ink on cool form paper, with road-marking yellow reserved for the main action. Dark mode is the carbon sheet itself, not near-black.
- **Type:** [Big Shoulders](https://fonts.google.com/specimen/Big+Shoulders) for headlines, a condensed face made for city signage. [Public Sans](https://fonts.google.com/specimen/Public+Sans) for reading, a civic-service typeface. [Noto Sans Kannada](https://fonts.google.com/noto/specimen/Noto+Sans+Kannada) for the stamps.
- **The stamp:** `CivicStamp` prints "Closed" and "Received" in English and Kannada. It lands once on the hero after the wall has filled, and marks closed records in the drawer and new reports in the form. The rough edge is an inline SVG filter.
- **Structure:** square corners, solid 2px rules and ruled ledgers instead of rounded cards and shadows. The dark section and the map are the only full-bleed bands.

## The complaint wall

`src/components/city-wall.tsx` draws every complaint in the archive as one square on a canvas, oldest first. Solid squares are marked closed by the source; hollow squares are not. Hover reads the real record and click opens it. Category buttons dim everything else and state that category's closed share.

The wall loads from `/api/wall`, which reads the active backend and caches at the edge for an hour. It holds no constants: if the archive changes, the wall changes. Keyboard and screen reader users get the same records on the Records page, and the canvas carries a text alternative.

## Motion

There is one orchestrated moment: the wall fills chronologically, then the stamp lands. With `prefers-reduced-motion` both appear immediately. All other motion answers an action.

## Copy

Sentence case, plain words, no all-caps labels, and no dot-separated metadata. Buttons say what they do. Kannada strings should be reviewed by a native reader before any public launch.

## Logo

The monogram combines an open circular C (the lens) with a geometric L (a street corner). The reusable component is `src/components/civic-mark.tsx`, and `src/app/icon.svg` supplies the browser icon. Transparent SVG assets are in `public/brand/`.

## Data integrity

The application never seeds citizen reports, resolution histories or map pins. Public entries come from the imported Sahaaya archive, with their source and historical status identified. Figures in the hero, wall and insights are calculated at runtime. Test records are confined to isolated verification databases.
