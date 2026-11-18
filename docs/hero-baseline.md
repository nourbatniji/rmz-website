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
- Banner 1 test imagery: the six original photographic keyframes (`public/media/hero/cloche`). The interpolated experiment
  was rejected and removed.

Media requirement: final smooth imagery needs a continuous source video or a coherent frame sequence from the content team
(see `docs/asset-checklist.md`).
