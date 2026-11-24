# Homepage page loader

`src/components/brand/page-loader/` shows the approved RMZ logo animation (`src/components/brand/logo-animation/`, one GSAP timeline) as the first-visit loader on `/`.
`/lab/logo-animation` stays as the review route and uses the same shared implementation.

## Behaviour
* The homepage renders underneath; a server-rendered opaque cover (`#rmz-loader`, z-index 100) sits above it, so there is no white frame or exposed hero.
* **Readiness gate (`loaderGate`)**: required fonts loaded + first hero poster decoded + hero renderer (`PrismEngine`) first paint. Nothing else is awaited.
  Remaining banner sequences start afterwards (`PrismEngine.startSequences()`, existing staged priorities); the showreel and below-the-fold assets are never gated.
* **Pose**: the timeline plays to the resolved lockup (3.9 s of 6.04 s), holds 300 ms, then the cover fades (420 ms). If readiness arrives early the loader still ends at that pose; it never replays.
  If loading is slower, the resolved pose is held with a hairline activity indicator (after 700 ms). No percentage.
* **Timeout**: 7 s from navigation start (at least 1.5 s after init). The loader then exits into the static poster hero (no opening). CSS-only failsafe at 12 s; gate hard limit 11 s.
* **Handoff**: while the gate holds, `HeroThreeWorlds` stays armed and its auto-change countdown does not run. On a normal release it starts the existing opening once, under its existing session rules.
* **Skipped**: internal navigation / same-origin referrer, anchor entry, restored scroll, reload / back-forward, repeat visit in the tab, returning visitor within 30 days (silent skip, no flash), any user input.
* **Reduced motion**: static resolved logo for at least 700 ms, then the normal hero without animated entrances.
* **No JS**: `<noscript>` hides the cover. If scripts never load, the CSS failsafe uncovers the page.
* **Accessibility**: the cover is `aria-hidden`; one polite status line ("Rebel Mind Zone loaded") is announced on exit. Scroll is locked via `html[data-rmz-loading]` and always released; focus is never moved.

Constants: `loader-config.ts`. Checks: `docs/review/milestone-26/tests/loader-checks.mjs`.
