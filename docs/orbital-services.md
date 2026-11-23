# Orbital services — preview-only exploration

Route: `/lab/orbital-services` (`?v=A|B|M`), not linked, `noindex`. The homepage Services section is unchanged.

- **Lens:** `src/components/lens-orbit/LensDial.tsx` is the existing homepage lens (`ServicesLens` `dial()`): ring + ticks, 8 aperture blades with the same
  math / gradients / shadow, glass with the same `<LensScene>` studies, specular highlight, yellow pointer — copied verbatim, interaction removed, pointer turned to
  12 o'clock. Homepage files are not edited. The ring turns one focal step per selection, as on the homepage (it is the only part of the dial that moves).
- **Orbit:** `OrbitServices.tsx`. Item *i* sits at (i − kf) × 360/7° from 12 o'clock, labels upright, text anchor glides from right- to left-aligned so labels never touch the lens.
  Selection = nearest to 12 o'clock with hysteresis (switches when within 0.38 step), then: aperture dips 20 %, image crossfades (140 ms), aperture reopens (380 ms).
- **A scroll-linked:** sticky stage, travel `clamp(1000px, 140svh, 1400px)` (1260 px at 900 tall); orbit = scroll × 6 steps, damped 70 ms; click → scrolls to that step; "Skip services ↓" jumps past the scene; no wheel interception.
- **B interactive:** normal flow; click, prev/next (wrap), angular drag around the lens (settles to nearest), shortest circular path, no autoplay.
- **Mobile (< 900 px or `?v=M`):** curved selector above the lens, swipe + prev/next, description below, no pinned scene.
- **Reduced motion:** no pinned scene, immediate selection (no travel, no aperture animation). **No JS:** plain text list of all seven services.
- Tests: `docs/review/milestone-19/tests/orbit-tests.mjs` (scripted Chrome); recordings in `docs/review/milestone-19/`.

## Comparison
| | A scroll-linked | B interactive |
|---|---|---|
| Discoverability | Rotates by simply scrolling; nothing to learn | Needs a first click / drag (labels read as buttons) |
| Cost | ≈ 1,260 px of extra scroll for 7 services | none |
| Control | Position tied to scroll; direct jumps are smooth scrolls | Direct and precise; shortest path; drag feels physical |
| Risk | Pinned scene on short screens; some visitors dislike scroll-driven stages | Visitors may never interact and see only service 1 |
| Mobile | Falls back to the B/mobile pattern | Same as mobile |

**Recommendation: B as the default**, with the orbit laid out so the first service is already readable without interaction. It adds no scroll cost, keeps the
page's pacing (the Journey V2 goal), and the drag/click interaction is the one the lens already teaches. Use A only if the studio wants Services to be a
guided moment; if so keep the travel near the 1,000 px floor.

## Variant A refinement (curved names + rise / hold / return)
- Lens 330 → 360 design units (+9 %) in variant A only; B and mobile unchanged.
- Names are SVG text along circles just outside the rim (baseline radius 208, rim 180 → 28 clear), Figtree weight 400, 18 design px, each name fitted to ≤ 84 % of its 51.4° slot.
  Top-half names run clockwise with letters outward; bottom-half names run counter-clockwise with letters inward so every word reads left to right (cross-fade over ±8° at the sides).
- One label per service: its path radius flattens (1/R → 0) while it moves to the title position, grows 30 % and turns yellow — the same SVG text, no second heading.
- One timeline (`orbit-timeline.ts`, units): hold 0.6 · return 0.3 · travel 0.5 · rise 0.3 · hold 0.6 … (first hold 0.6, last hold ends the scene) = 10.8 units over `clamp(1300px, 190svh, 1800px)` (1,710 px at 900 tall, +36 %).
  ≈ 95 px selected hold, 47 px rise / return, 79 px travel per service at 900 tall. The orbit is exactly still during every hold. Smoothing: 70 ms exponential, applied to the timeline position.
- Click / prev / next land in the middle of the service's hold. Heading moved up 12 px and the composition starts 64 px lower; a dedicated title zone sits between them and the lens.
- Short screens (< 640 px tall): heading kicker and the details line are hidden, spacing shrinks and the composition scales (at 1280×600 curved names are ≈ 12 px on screen; lens ≈ 225 px).
- Tests: `tests/orbit-a2-tests.mjs` (36 checks, 1440×900 and 1280×600), recording `orbit-A-refined.mp4`.

## Variant A, third pass (side blocks, bigger lens, bold title)
- Layout (stage ≥ 1240 px wide): description LEFT (left-aligned, all seven stacked in one grid cell so nothing shifts, with prev/next under it), lens CENTRE (420 design units, +17 %,
  centred in the section), heading RIGHT. Below 1240 px the side content stacks (heading top-left, description under the lens) instead of shrinking everything.
- Orbit radius 238 (rim 210, 28 clear); names 19 px at weight 400; lifted title 28.5 px at weight 700 (+22 % over the previous 23.4 px), interpolated per frame with the same
  flattening / rise, so the label is one SVG text. Figtree is the variable font, so 400 → 700 is a genuine weight axis, not synthesized bold.
- At 1280×600 the composition now uses the full height (no description below): lens ≈ 350 px, curved names ≈ 16 px. Preview switch moved to the bottom-right corner.
- Tests: `orbit-a2-tests.mjs` updated for the new layout (42 checks, 1440×900 and 1280×600); screenshots `A3-*.png`; recording `orbit-A-title-rise-bold-return.mp4`.

## Variant A, fourth pass (diagonal composition)
- Lens 420 → 483 design units (+15 %), orbit radius 238 → 270 (rim 241.5, 28.5 clear). Heading upper left, lens + orbit centred, description / details / link / prev-next lower right (stationary blocks, all seven descriptions share one reserved cell).
- Side layout from stage width 1180 px up; below it the heading stays top-left and the description stacks under the lens. Active title unchanged (28.5 px, weight 700, yellow). Preview switch moved bottom-left.
- Tests: `orbit-a2-tests.mjs` (44 checks incl. no label ever touches either block over 55 timeline positions); screenshots `A4-*.png`.
- Fifth pass: lens 483 → 600 design units; renders at exactly 600 px at 1440×900 (stage scale 1), 386 px at 1280×600 (largest that fits). Orbit radius 328 (rim 300, 28 clear). Screenshots A5-*.png.

## Variant A, sixth pass (slower, smoother scroll)
- Travel `clamp(1780px, 260svh, 2460px)` = 2,340 px at 900 tall (+37 % over 1,710). Timeline weights: hold 0.6, rise / return 0.36, travel 0.62 (12.24 units) → at 900 tall ≈ 115 px hold (was 95), 69 px rise / return (was 47), 119 px travel (was 79).
- One shared smoothed timeline position drives orbit, title curve / position / size / weight, lens and description. Damping τ = 120 ms, exponential, frame-rate independent (`1 − e^(−dt/τ)`);
  it tightens when more than 6 % of the scene behind (a fling), a jump over 25 % or a stalled frame snaps exactly, and the last 0.004 unit (< 1 px of motion) snaps. Measured at 1440×900: a 100 px wheel notch settles in ≈ 330 ms, a fast jump across the scene in ≈ 33 ms, no drift after settling.
- Direct selection / prev-next land in each hold centre (computed from the same timeline). Recording `orbit-A-slower-smoother.mp4`.
