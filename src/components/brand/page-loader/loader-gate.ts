import { LOADER_GATE_HARD_LIMIT_MS, LOADER_ID } from "./loader-config";

/**
 * The handshake between the homepage loader and the hero (a tiny module-level store, no framework state).
 *
 *  - The hero HOLDS while the loader cover is up: no opening, no auto-change countdown, no ready-timeouts running behind it.
 *  - The hero reports the first-view needs it owns ("image", "renderer"); the loader reports "fonts" itself.
 *  - The loader RELEASES with an outcome: "ready" (everything settled), "timeout" (dismissed into the static hero) or "skipped" (no loader / interaction).
 *
 * Nothing here is shown unless a loader cover exists in the DOM: on every other route (lab, admin preview, repeat visits) the gate is simply open.
 */
export type LoaderOutcome = "ready" | "timeout" | "skipped";
export type LoaderNeed = "fonts" | "image" | "renderer";
const NEEDS: readonly LoaderNeed[] = ["fonts", "image", "renderer"];

const got = new Set<LoaderNeed>();
const subs = new Set<() => void>();
let started = false;
let holding = false;
let outcome: LoaderOutcome | null = null;
let hard = 0;

const emit = () => subs.forEach((f) => f());

/** The cover is server-rendered (and decided by the inline boot script before hydration), so the DOM is the source of truth for "is a loader up". */
function init() {
  if (started || typeof document === "undefined") return;
  started = true;
  const state = document.getElementById(LOADER_ID)?.getAttribute("data-state");
  if (state === "on" || state === "exiting") {
    holding = true;
    hard = window.setTimeout(() => loaderGate.release("timeout"), Math.max(0, LOADER_GATE_HARD_LIMIT_MS - performance.now()));
  }
}

export const loaderGate = {
  isHolding(): boolean {
    init();
    return holding;
  },
  outcome(): LoaderOutcome | null {
    return outcome;
  },
  subscribe(cb: () => void): () => void {
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  },
  /** A first-view need is settled (success OR failure: a failed asset must never keep the loader up). Idempotent. */
  signal(need: LoaderNeed) {
    if (got.has(need)) return;
    got.add(need);
    emit();
  },
  settled(): boolean {
    return NEEDS.every((n) => got.has(n));
  },
  release(o: LoaderOutcome) {
    init();
    if (outcome) return;
    outcome = o;
    holding = false;
    window.clearTimeout(hard);
    emit();
  },
  whenReleased(): Promise<void> {
    init();
    if (!holding) return Promise.resolve();
    return new Promise((resolve) => {
      const off = loaderGate.subscribe(() => {
        if (!holding) {
          off();
          resolve();
        }
      });
    });
  },
  whenSettled(): Promise<void> {
    if (loaderGate.settled()) return Promise.resolve();
    return new Promise((resolve) => {
      const off = loaderGate.subscribe(() => {
        if (loaderGate.settled()) {
          off();
          resolve();
        }
      });
    });
  },
};
