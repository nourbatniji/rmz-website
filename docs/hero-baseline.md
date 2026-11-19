# HeroWall — approved baseline

Approved by the product owner. **Do not change its visual or behavioural design while building later sections unless
explicitly requested.** Intended experience: scrolling visibly changes the picture, inviting visitors to explore and reverse.

Frozen behaviour:
- Hero stays in **normal page flow** — no sticky/pinned behaviour. Later frames may leave the viewport; that is accepted.
- Sequence progress = triangle wave of absolute `scrollY`; **720 px per full sequence** (`heroConfig.sequenceScrollDistancePx`),
  reversible ping-pong (first → last → first …), deterministic: stop = hold, reverse = exact retrace, top = first frame.
- Every banner has its own image sequence (own frame count) driven by the same normalised progress.
- Prism rotation, 5 s settled auto-switching (pause/resume, paused for hidden tab / reduced motion), manual controls
  (chips, arrow keys, swipe, click), fixed crop, offscreen rendering skip, no wheel capture.
- Banner 1 imagery: 25 delivered frames (woman among golden fish and red grass), `public/media/hero/identity/frame-01.webp … frame-25.webp` (WebP, 1478 × 622, ≈ 145 KB each; see `public/media/hero/README.md`). Frame 01 is the poster and is preloaded with `fetchPriority="high"`; the other 24 load in the background (nearest first). The existing shared scroll mapping is unchanged: progress 0 → frame 01, 1 (scroll 720 px) → frame 25, then the existing ping-pong plays them back in reverse. A frame that is still loading never blanks the banner or substitutes another frame: the last rendered frame stays until it arrives.

Media requirement: final smooth imagery needs a continuous source video or a coherent frame sequence from the content team
(see `docs/asset-checklist.md`).
