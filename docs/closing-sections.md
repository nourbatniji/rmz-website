# Closing sections — Collaborations ("The Collective") and Footer

Order on the home page: … → Minds → work archive → **Collaborations** (`#collaborations`) → **Footer** (`#contact`).

## Collaborations — `src/components/home/collective/`
Canvas "A · The Collective · desktop (PLAYABLE) — Enhanced 01" (`CollabA-e01`), mobile = "Mobile08c · Collective Drift Rails".
- **Desktop (≥ 1024 px):** the 1440 × 900 artboard scaled to the width (`useFit`, max 1.25×). Twelve single-colour marks at the board's positions, index numbers, caption bar. Hover / focus a mark → it turns yellow and scales 1.04, the others dim to 20 %, the caption names it (name, role, placeholder line). Click pins it (click again or Esc clears). Entrance: the marks gather in from their scattered offsets (1.3 s, staggered 0–840 ms), header lines rise — once, via `useEntrance` (`data-entrance`), final state without JS / with reduced motion.
- **Mobile / tablet (< 1024 px):** header, then three rails of marks (4 each) drifting in alternating directions (46 / 58 / 50 s loops, edge-faded). Tap a mark → the drift pauses, the others dim, the mark turns yellow and a cream bottom sheet (sticky to the viewport bottom) shows it large with name, role, placeholder line, Prev / Next (also swipe) and Close; tapping it again, Close or Esc resumes the drift.
- Dropped from the canvas (prototype chrome): the "↻ Replay entrance" button and the "Concept A" tag. The "Placeholder wordmarks …" note stays (content is placeholder).
- Content: `CollectiveContent` in `src/content/closing-types.ts`, demo values in `src/content/dev/closing.ts`, read via `src/lib/content/closing.ts`. Slots (positions) are layout, in `layout.ts`; marks are JSX placeholders in `wordmarks.tsx`. Real artwork: set `logo` (`src`, `width`, `height`) on a partner; the slot width is kept. Up to 12 partners are laid out.

## Footer — `src/components/home/footer/`
Canvas "Footer-e01". Desktop = the 1440 × 900 artboard scaled to the width (headline mask-slide, circular "Say hello" CTA, email with fill-on-hover, four columns, bottom bar, live Cairo clock via `Intl`, client-only). **Below 1024 px: the canvas "FooterM-B-Accordion" layout — headline, tilted circular CTA, email, an accordion (Studio open by default; Explore / What we do / Elsewhere) and a cream strip with socials, © and back to top.** Explore links point at the real home anchors (`/#work`, `/#selected`, `/#services`, `/#minds`, `/#collaborations`); "Back to top" → `/#top`. Social links and the email are placeholders (visible note, as in the canvas). Content: `FooterContent`.

## Pending
- Admin / database wiring for both sections (content is static for now).
- Real partner marks, real social profiles, confirmed footer copy; case-study pages for partners (`href`).
- Not browser-tested here (eslint + tsc only).
