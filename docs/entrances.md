# Section entrances (Services lens, Minds)

One shared hook, `src/lib/use-entrance.ts`, drives both. It sets a `data-entrance` attribute on the section element; **all motion is CSS** (`services-lens.css`, `minds.css`). No React state, no scroll handler, no pinning, no extra scroll distance.

| Attribute | Meaning |
|---|---|
| (none) / `done` | Final layout and state — what the server renders, what JS-off and reduced-motion visitors see. |
| `pre` | Hidden start state: opacity and small offsets only (layout never changes, so nothing shifts). Set after hydration, before paint. |
| `playing` | Start state removed → the CSS transitions run once. |
| `instant` | One frame with transitions disabled, then `done`: an interaction/navigation arrived first, so everything snaps to the correct final state. |

## Rules
- **Trigger**: ≥ 30% of the section is visible below the fixed header (IntersectionObserver with the header height as a top margin). Never while offscreen. **Once per page load** — scrolling back never replays or hides anything.
- **Partly visible**: if a section sits on screen under the threshold for 700ms (e.g. after a long jump) it is revealed anyway, so visible space is never left empty.
- **Passed / fast scroll**: a second observer (root extended far upward) detects "scrolled past"; the entrance completes instantly rather than animating offscreen. Leaving the screen mid-entrance also completes it immediately.
- **Interaction wins**: any pointerdown, keydown or focusin inside the section, or a `hashchange`, finishes it instantly. Anchor navigation (`#services`, `#minds`, header nav) and keyboard focus therefore never land on hidden content; loading directly on the section's hash skips the entrance.
- **Failsafes**: a timer guarantees the final state; no `IntersectionObserver` → no entrance; cleanup always leaves `done`.
- **Reduced motion**: the hook does nothing — final state immediately (and the existing reduced-motion CSS removes transitions).
- **No JS**: the server markup is the final state; nothing is hidden.

## Timing
Lens ≈ 0.9s (ring 0.85s, blades 0.52s, text 0.8s + ≤125ms stagger). Minds ≈ 0.95s desktop (50ms × 8 columns + 0.6s), ≈ 0.7s mobile (35ms × 8 + 0.45s). Curve `cubic-bezier(.25,.85,.3,1)` — fast start, long deceleration, no overshoot.

## Tests
`docs/review/milestone-10/tests/entrance-tests.mjs` (frame-sampled timing/easing, thresholds, interaction during the entrance, once-only, fast scroll, anchors, focus, reduced motion, JS-off, layout stability, mobile) and the updated `minds-tests.mjs` (spacing).
