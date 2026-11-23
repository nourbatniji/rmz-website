# Homepage hero — "Three Worlds"

`src/components/home/hero/HeroThreeWorlds.tsx` (+ `hero-worlds.css`) is the homepage hero. The same component renders the lab route
`/lab/hero-three-worlds`, which passes `preview` (Replay / stage controls), `ghostBanner` (`?ghost=1|2`) and its own `sessionKey`; the homepage passes none of these.

* **Renderer:** `prism-engine.ts` (ribbed 3-face prism, per-banner frame stores) + `config.ts` (page scroll → ping-pong frame progress). The only opening-specific
  engine addition is `setBlankFace` (one face drawn empty so the wall shows nothing until the prism turns the first banner into view).
* **Content (`HeroContent`, see `src/content/types.ts`):** per-banner `phraseLead` / `phraseEmphasis`, plus `tagline`, `ctaLabel`, `ctaHref`, posters and sequences.
  All optional; the component falls back to the built-in copy for older saved content. Editable in the dashboard's Hero section.
* **Opening** (once per tab session, key `rmz-home-hero-opening-v1`): red word → photo sweep through the whole word (one cover-fitted image plane, content-independent) →
  ~450 ms hold → red sweeps back while the existing prism transition turns the upright first banner into view → the word settles into the headline → "A DIFFERENT",
  description, CTA, controls. ≈2.85 s, then the normal 5 s auto-change countdown starts (respecting pause).
* **Skipped / finished at once:** reduced motion, anchor entry, restored scroll position, reload/back-forward, repeat entry in the tab, first image/fonts not ready in time;
  any scroll, key, pointer or banner selection finishes it immediately. No JavaScript: the static hero (poster, word, copy) is shown.
* Review notes and recordings: `docs/review/milestone-21/` (lab) and `docs/review/milestone-22/` (homepage integration check).
