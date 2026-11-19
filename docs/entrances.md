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
Lens ≈ 0.9s (ring 0.85s, blades 0.52s, text 0.8s + ≤125ms stagger). Minds **mobile accordion** ≈ 0.7s (35ms × 8 + 0.45s). Curve `cubic-bezier(.25,.85,.3,1)` — fast start, long deceleration, no overshoot. (Minds on desktop is not timed at all — see the scroll-linked reveal below.)

## Tests
`docs/review/milestone-10/tests/entrance-tests.mjs` (frame-sampled timing/easing, thresholds, interaction during the entrance, once-only, fast scroll, anchors, focus, reduced motion, JS-off, layout stability, mobile) and the updated `minds-tests.mjs` (spacing).

## Minds on desktop: scroll-linked downward reveal (replaces the timed entrance)
The eight columns **grow downward from their fixed top edge as the page scrolls**, as if emerging from the red Services section. There is no timer, fade, lift or `useEntrance` involvement on desktop — the state is a pure function of the scroll position, so stopping holds the exact partial state, scrolling back retracts along the same path, and any jump (anchor, fast scroll, reload) shows the right state at once.

- **Mechanism** (`Minds.tsx`, `minds.css`): columns are laid out at their final size from the start (nothing reflows); each is clipped from the bottom with `clip-path: inset(0 0 (1 − p) × 100% 0)` — never scaled, translated or faded — so surface, text, portrait and biography are revealed together. `p` runs from 8% (short stubs attached to the junction) to 100%.
- **Scroll window**: JS sets one number, `--rp` (0…1), on the list from a passive rAF-coalesced scroll listener (also on resize): `rp = clamp((L0 − listTop) / D, 0, 1)` with `D = clamp(50% of the viewport height, 380, 500)` px (450 at 900px) and `L0 = vh + D − 760 − 20`. `L0` is chosen so the growing front stays **inside the viewport** during the whole range (otherwise it would happen below the fold): the reveal completes with the list top ≈ 120px from the viewport top, i.e. with the complete section on screen. Before `L0` (the boundary has just arrived) only the stubs show.
- **Irregular, shuffled growth**: each column has one slot 0…7 of a single shuffled permutation per page load (module-level, stored as `--o`, stable through reverse scrolling). Column *i* grows while `rp ∈ [0.04·slot, 0.04·slot + 0.72]`, so earlier slots lead; all finish by `rp = 1`.
- **Unrevealed area** is the dark list background (the same dark as the page/next section), never red; the 80px red space above the columns stays seamless with the lens.
- **Interaction**: expansion (`left`/`width`) is independent of the clip. `:focus-within` removes the clip from a column, so keyboard focus is never on hidden content (the others keep following the scroll).
- **Safeguards**: `data-reveal="on"` is set only by JS, only ≥ 1024px and without reduced motion; JS-off, reduced motion and the mobile accordion get the complete layout. No scroll locking, wheel capture or added scroll distance; the section height is reserved (840px) from the start.
- **Mobile accordion unchanged**: it keeps the one-shot `useEntrance` (16px lift, 35ms top→bottom stagger).

## Tests
`docs/review/milestone-10/tests/entrance-tests.mjs` (lens entrance, mobile accordion entrance, interaction, once-only, fast scroll, anchors, focus, reduced motion, JS-off) and `docs/review/milestone-13/tests/reveal-tests.mjs` (pixel-measured reveal: start stubs, forward/reverse path equality, holding, ≈450px range, irregular shuffled growth, completion, fast jumps, no transform/opacity/animation, layout reserved, interaction, focus, other viewports, reduced motion, JS-off, mobile).
