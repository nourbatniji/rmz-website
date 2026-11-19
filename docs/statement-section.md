# StatementRotator — change log

Authorised change to the previously frozen component (`src/components/home/statement/`).

## 2000 ms rotation, no progress bar
1. **Progress bar removed**: the track, the animated fill, its keyframes and CSS are gone. The "NN / NN" counter stays (same position, same style, `aria-hidden`).
2. **Rotation interval = 2000 ms**, measured from one transition **start** (letters begin to exit) to the next, scheduled drift-free against `performance.now()` (each target is the previous target + 2000, not "now + 2000"). A cycle: exit starts at T → the next word swaps in at T + 620 ms → entrance runs → next exit at T + 2000 ms. The first transition comes 1.8 s later (the sentence's intro), as before (≈ 3.8 s after the section starts running).
3. **No overlapping animations**: exit (≈ 0.56 s) always finishes before the swap, and the entrance (≈ 1.07 s for the longest word) finishes before the next exit starts. To fit 2 s the per-letter staggers were tightened (exit 26 → 16 ms, rotating entrance 55 → 30 ms; the intro keeps the source's 55 ms). Transition style, durations, easing curves, blur/skew/slide and the springy entrance are unchanged.
4. **Unchanged**: typography, colours, layout, word order (broken → rewritten → exceeded → challenged), the one-grid-cell slot (no layout shift), ≥ 45% visibility start / leave-and-reset behaviour, hidden-tab pause (resuming restarts the hold, no burst), reduced-motion static state (no counter, no rotation), the sr-only sentence.
5. **Statement does not move**: the footer is absolutely positioned, so removing the bar changes nothing about the statement; verified against geometry recorded before the change (section, text block, both lines, every fixed word, font size and the counter position at 1440×900, 1280×720 and 390×844 — identical).

Tests: `docs/review/milestone-11/tests/statement-tests.mjs` (uses a before-change geometry baseline) and the updated statement block of `docs/review/milestone-3/tests/sections.mjs`.
