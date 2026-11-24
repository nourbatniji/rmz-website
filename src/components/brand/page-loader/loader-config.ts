/**
 * Homepage loader tuning. Change values here only (the CSS failsafe in page-loader.css must stay longer than LOADER_GATE_HARD_LIMIT_MS).
 *
 * The loader plays the approved logo animation (components/brand/logo-animation) to its RESOLVED pose, then waits for the essential first view only:
 *   1. the required fonts, 2. the first hero image decoded, 3. the hero renderer ready to paint. Nothing else is waited for.
 */
export const LOADER_ID = "rmz-loader";
/** sessionStorage: the loader plays once per tab session (and is skipped for any later entry in the tab). */
export const LOADER_SESSION_KEY = "rmz-loader-v1";
/** localStorage: a returning visitor. With assets cached the first view is ready almost at once; then no loader is shown at all. */
export const LOADER_SEEN_KEY = "rmz-loader-seen-v1";
export const LOADER_SEEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Set on <html> while the loader is up (page scroll is locked, never reset); always released on exit, failure and unmount. */
export const LOADER_LOCK_ATTR = "data-rmz-loading";

/** Hard bound: the loader is dismissed into the usable poster/static hero at the latest this long after navigation start… */
export const LOADER_TIMEOUT_MS = 7000;
/** …but never sooner than this after the loader initialised (a late hydration still gets a clean exit). */
export const LOADER_MIN_AFTER_INIT_MS = 1500;
/** The hero stops holding on a loader that never reports (e.g. it failed to hydrate). Longer than the loader's own bound. */
export const LOADER_GATE_HARD_LIMIT_MS = 11000;

/** The finished logo rests this long before the exit, so the mark is read as a whole. */
export const RESOLVED_HOLD_MS = 300;
/** Reduced motion: the static logo is shown at least this long (no sub-second flash). */
export const REDUCED_MIN_SHOWN_MS = 700;
/** Returning visitor: if the first view is ready within this time, the loader never appears. */
export const FAST_READY_MS = 250;
/** Fade of the cover into the hero (kept in sync with page-loader.css). Zero with reduced motion. */
export const EXIT_FADE_MS = 420;
