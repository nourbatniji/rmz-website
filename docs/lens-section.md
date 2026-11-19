# Home — Services lens (ServicesLens)

Source: canvas board **"HOME - SERVICES SECTION"** — file `project/R2-01-Iris-e01.dc.html` (1440 × 900, playable). Mobile: the canvas offers **three alternatives** (`Mobile04a` arrows, `Mobile04b` scroll-snap, `Mobile04c` one screen) and none is marked approved — see "Mobile".
Component: `src/components/home/lens/ServicesLens.tsx`, `lens-scenes.tsx`, `services-lens.css`. Content (typed): `homepage.lens` → `LensContent` (`src/content/types.ts`), values in `src/content/dev/homepage.ts`. Section id: `services` (between the featured-work marker and the fins).

## What it is (as designed)
Red (#D52518) 1440 × 900 composition. Left: kicker "What we do, as focal lengths", heading "Seven ways of *looking.*", intro, and a 7-row accordion list (focal chip + service name; the open row shows description, three bullets). Right: a 800 px lens (centre 1140, 470 — it runs off the right edge by design): a black ring with minor/major ticks and the focal marks, a 722 px glass showing one illustrated "study" per service, and an 8-blade iris over it. A yellow pointer and a rail with yellow nodes connect the selected row to the lens axis.

**Interaction** — select by list row, ring mark, Previous/Next, dragging the ring (angular, snaps to the nearest mark) or arrow keys.
- Ring turns to the mark (24° per service, .65 s).
- **Iris sequence**: blades close to 4 % (380 ms) → study swaps (waits for its images, max 1.5 s) → 100 ms hold → blades open to that service's aperture (520 ms). Resting apertures: 94 / 66 / 84 / 74 / 96 / 60 / 80 %. A selection made during the sequence is queued and resolved after it (rapid clicks settle on the last choice).
- Row expands (.55 s), name grows 24 → 30 px, rail/dots slide to the row, "Aperture opening N %" caption follows.
- Initially selected: the third service (canvas: Creative Direction; here Content Production — provisional).

## Implementation notes
- **Taxonomy**: names/order/ids come from the shared `services` list (Branding, Creative Strategy, Content Production, Social Media, Design, Paid Media, Web Experiences). Per-service focal chip, ring mark, description, bullets and study are in `lens.items` keyed by `serviceId`. The canvas listed the *old* seven services (24mm Brand Strategy … Tele Growth & Marketing); those names, descriptions and bullets were **not** carried over.
- **Studies**: the seven illustrated studies (triptych, detail, full frame, collage, devices, contact sheet, reach) are ported 1:1 (layout, labels, SVG paths) into code. Each service points at one via `scene`. Provisional assignment by meaning: Branding→detail, Creative Strategy→triptych, Content Production→contact sheet, Social Media→collage, Design→full frame, Paid Media→reach, Web Experiences→devices. Studies carry small annotation labels from the canvas (e.g. "Detail ×2", "Poster / Social / Out of home", "RMZ 400 · Contact sheet").
- **Imagery**: the nine pictures in the canvas are hosted blobs that cannot be exported (the canvas' asset store is empty). Slots `a`–`i` in `lens.images` take an `ImageRef`; until then each slot shows a restrained, labelled placeholder ("Image A…"). Image-ready gating is in place for when they exist.
- **Scaling**: desktop (≥ 1100 px) renders the 1440 × 900 stage, scaled down below 1440 and centred above it (the ring then shows in full). Section height follows the scale.
- **Layout vs content**: everything visual lives in code; only copy, names, focal data, scene choice, links and images are content.
- **Not shipped (prototype only)**: the "Motion: full / reduced (preview)" toggle (the OS setting is used), the "visual study, provisional imagery" caption suffix, the `#` "Explore service →" link (rendered only when a service has an `href`; none yet — service pages are deferred), the three prototype `sel`/state props.
- **No scroll capture**: no wheel handler; the ring captures pointer/touch only on the ring band; the glass allows vertical scrolling (swipe sideways to change). Section is normal flow (not pinned).

## Mobile — pending visual review
Implemented: canvas **Mobile04a ("option 1, arrows")** — 330 px lens (scaled), Previous/Next, captions, then the accordion list (tap a row to open it; one open at a time), glass swipe sideways to change, lens keyboard-focusable. Not used: Mobile04b (scroll-snap) — it captures the wheel and pins a 1000 px stage, which conflicts with the no-trapping rule; Mobile04c (one screen). Used below 1100 px (max 540 px wide, centred).
Deviation: the canvas mobile heading shows only "Seven ways of"; "looking." is added on a second line (it does not fit on one line at 390 px).

## Deviations from the canvas (flagged)
1. **"looking." colour**: the desktop canvas sets the italic word to `#D52518` on a `#D52518` background (invisible). The mobile canvas uses `#FFCA26`; yellow is used for both. **Pending confirmation.**
2. **Small-text contrast**: cream (#F3E8CC) on the red is 4.3 : 1 — marginally under 4.5 : 1 for 11–15 px text (kicker, captions, chips, bullets). Kept as designed; unselected names and captions use full/near-full cream instead of the canvas' 74–82 % opacity (which was below 3 : 1 / 4 : 1). Needs a design decision if 4.5 : 1 is required.
3. Ring-mark buttons are decorative duplicates of the list rows: `aria-hidden`, not tab stops. The list rows and Previous/Next are the keyboard path; on mobile the lens group itself takes arrow keys.
4. The "Explore service →" link is hidden until services have pages.

## Copy — provisional, pending approval
Kicker, heading, intro, both hints, and **all seven descriptions, bullets, focal chips and ring marks** are build-team wording for the approved taxonomy (`copyStatus: "provisional"`). The canvas copy (old services) is not reused. The Minds section (the eight columns) no longer lists services at all.

## Accessibility
List rows are real `<button aria-pressed>` inside a labelled group; arrow keys / Home / End move selection and focus; a polite live region announces "Selected: name, focal" once per change; visible yellow focus ring; reduced motion = no transitions and an instant swap; touch targets ≥ 48 px (rows ≥ 54 px).

## Verification
`docs/review/milestone-8/tests/lens-tests.mjs` (puppeteer-core, real Chrome, production build): structure and taxonomy; the iris sequence per service; rapid selection; connector tracking; Previous/Next; ring-mark click; ring drag + snap; keyboard (Arrow/Home/End, focus, tab order, focus ring, live region); no wheel handler and real wheel scrolling; anchor + header clearance; entry/exit butting; resize 1280 / 1100 / 1920 / 1024 / 1440; mobile taps, arrows, glass swipe, vertical scroll over the glass, touch ring drag, keyboard on the lens, 390/360/320 overflow; reduced motion (desktop + mobile). `screenshots.mjs` / `record-interaction.mjs` regenerate the review media.

## Update — entrance
When ≥ 30% of the section is visible below the fixed header (never while offscreen) it plays once: the outer ring turns in from −12° and settles (0.85s), the aperture blades start slightly more closed and open to the selected service's aperture (0.52s), and the kicker/heading/intro/list/arrows/captions fade in and lift 14px with a 0–125ms stagger. Everything lands in ≈ 0.9s with ease-out deceleration, no bounce. It is layered on the existing lens state (CSS `rotate`/`opacity`/`translate` and a start-state blade angle, driven by a `data-entrance` attribute) so it cannot overwrite the selected service, reset the lens, or fight dragging/clicking/keys: any pointer, key or focus interaction finishes it instantly and the interaction proceeds normally. See `docs/entrances.md`.
