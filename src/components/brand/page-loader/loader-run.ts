import gsap from "gsap";
import { LOGO_RESOLVED_AT } from "@/components/brand/logo-animation/logo-timeline";
import {
  EXIT_FADE_MS,
  FAST_READY_MS,
  LOADER_LOCK_ATTR,
  LOADER_MIN_AFTER_INIT_MS,
  LOADER_SEEN_KEY,
  LOADER_SEEN_TTL_MS,
  LOADER_SESSION_KEY,
  LOADER_TIMEOUT_MS,
  REDUCED_MIN_SHOWN_MS,
  RESOLVED_HOLD_MS,
} from "./loader-config";
import { loaderGate, type LoaderOutcome } from "./loader-gate";

/**
 * Whether THIS entry shows the loader. The server-side half (boot-script.tsx) hides the cover before hydration with the same rules; this one also
 * covers client-side navigation to "/" (the document was another page) and storage that was unreadable there.
 */
export function entryDecision(): { run: boolean; why: string } {
  const no = (why: string) => ({ run: false, why });
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      if (nav.type !== "navigate" && nav.type !== "prerender") return no("reload or back/forward");
      try {
        if (new URL(nav.name).pathname !== window.location.pathname) return no("client-side navigation"); // the document was another page
      } catch { /* unparsable entry name: ignore */ }
    }
    if (window.location.hash) return no("anchor entry");
    if (window.scrollY > 8) return no("restored/non-zero scroll");
    if (sessionStorage.getItem(LOADER_SESSION_KEY)) return no("already shown in this tab");
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) return no("internal navigation");
  } catch { /* storage blocked etc.: show it (it is bounded and skippable) */ }
  return { run: true, why: "" };
}

/** A returning visitor (saw the loader within the TTL): the loader is only shown if the first view is NOT ready almost at once. */
export function isReturningVisitor(): boolean {
  try {
    const t = Number(localStorage.getItem(LOADER_SEEN_KEY));
    return t > 0 && Date.now() - t < LOADER_SEEN_TTL_MS;
  } catch {
    return false;
  }
}

export function markShown() {
  try { sessionStorage.setItem(LOADER_SESSION_KEY, "1"); } catch { /* ignore */ }
  try { localStorage.setItem(LOADER_SEEN_KEY, String(Date.now())); } catch { /* ignore */ }
}

/** Every required font face (next/font declares only the two the design uses), or settle after a bounded wait. Failure counts as settled. */
async function fontsSettled(): Promise<void> {
  try {
    const fonts = document.fonts;
    if (!fonts) return;
    await Promise.all(Array.from(fonts).map((f) => (f.status === "loaded" ? 0 : f.load().catch(() => 0))));
    await fonts.ready;
  } catch { /* never blocks */ }
}

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "Fn", "OS"]);

/**
 * One loader run: drives the shared logo timeline to its resolved pose, holds there if needed, and exits as soon as the first view is ready.
 *
 *   mount ─ logo plays ─ resolved pose (3.9 s) ─┬─ first view ready → brief rest → fade out → release the hero
 *                                               └─ not ready → hold the pose + restrained indicator ─ … ─ timeout → fade out → hero shows its static state
 *
 * The animation is never restarted or sped up; the page scroll is locked (never reset) only while the cover is up; focus is never moved.
 */
export class LoaderRun {
  private tl: gsap.core.Timeline | null = null;
  private revealed = false;
  private driven = false;
  private resolved = false;
  private ready = false;
  private exiting = false;
  private finished = false;
  private revealedAt = 0;
  private resolvedAt = 0;
  private timers = new Set<number>();
  private cleanups: Array<() => void> = [];

  constructor(
    private cover: HTMLElement,
    private status: HTMLElement | null,
    private svg: SVGSVGElement | null,
    private opts: { reduced: boolean; returning: boolean },
  ) {}

  start() {
    const { cover, opts } = this;
    document.documentElement.setAttribute(LOADER_LOCK_ATTR, "");
    cover.setAttribute("data-hold", "0");
    this.say("Loading Rebel Mind Zone");

    // Interaction is the user's escape hatch: the cover leaves at once and the hero (which treats the same input as "finish the opening") shows its final state.
    const skip = (e: Event) => {
      if (e.type === "keydown" && MODIFIER_KEYS.has((e as KeyboardEvent).key)) return;
      this.exit("skipped");
    };
    for (const ev of ["pointerdown", "touchstart", "wheel", "keydown"] as const) {
      window.addEventListener(ev, skip, { passive: true });
      this.cleanups.push(() => window.removeEventListener(ev, skip));
    }

    // Bounded: from navigation start, but a late hydration still gets LOADER_MIN_AFTER_INIT_MS for a clean exit.
    this.timer(() => this.exit("timeout"), Math.max(LOADER_TIMEOUT_MS - performance.now(), LOADER_MIN_AFTER_INIT_MS));

    void fontsSettled().then(() => loaderGate.signal("fonts"));
    void loaderGate.whenSettled().then(() => {
      this.ready = true;
      this.maybeExit();
    });

    if (opts.returning && !opts.reduced) this.timer(() => this.reveal(), FAST_READY_MS);
    else this.reveal();
  }

  /** The shared timeline arrives (paused, start pose set). Returns false when the svg must stay hidden for now. */
  attach(tl: gsap.core.Timeline): void | false {
    this.tl = tl;
    if (this.finished) return false;
    if (!this.revealed) return false;
    this.drive();
  }

  private reveal() {
    if (this.revealed || this.exiting) return;
    this.revealed = true;
    this.revealedAt = performance.now();
    this.drive();
    this.maybeExit();
  }

  private drive() {
    const tl = this.tl;
    if (!tl || !this.revealed || this.driven) return;
    this.driven = true;
    if (this.svg) gsap.set(this.svg, { visibility: "visible" });
    if (this.opts.reduced) {
      tl.time(LOGO_RESOLVED_AT, true); // the static, correct logo: no motion at all
      this.onResolved();
      return;
    }
    tl.call(() => {
      tl.pause(LOGO_RESOLVED_AT);
      this.onResolved();
    }, [], LOGO_RESOLVED_AT);
    tl.play(0);
  }

  private onResolved() {
    if (this.resolved) return;
    this.resolved = true;
    this.resolvedAt = performance.now();
    if (!this.ready) this.cover.setAttribute("data-hold", "1"); // holding the resolved pose: show the indicator (after its own short delay)
    this.maybeExit();
  }

  private maybeExit() {
    if (this.exiting || !this.ready) return;
    if (!this.revealed) {
      this.exit("ready", true); // returning visitor and the first view was ready before the logo would even appear: no loader at all
      return;
    }
    if (!this.resolved) return; // the choreography is still running: exit from onResolved
    const since = this.opts.reduced ? this.revealedAt : this.resolvedAt;
    const rest = this.opts.reduced ? REDUCED_MIN_SHOWN_MS : RESOLVED_HOLD_MS;
    this.timer(() => this.exit("ready"), Math.max(0, rest - (performance.now() - since)));
  }

  private exit(outcome: LoaderOutcome | "ready", instant = false) {
    if (this.exiting) return;
    this.exiting = true;
    this.cleanups.splice(0).forEach((f) => f());
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
    document.documentElement.removeAttribute(LOADER_LOCK_ATTR); // released the moment the exit begins, so nothing can stay locked
    this.cover.setAttribute("data-hold", "0");
    if (instant || this.opts.reduced) {
      this.finish(outcome);
      return;
    }
    this.cover.setAttribute("data-state", "exiting");
    this.timer(() => this.finish(outcome), EXIT_FADE_MS + 60); // transitionend is not relied on
  }

  private finish(outcome: LoaderOutcome | "ready") {
    if (this.finished) return;
    this.finished = true;
    this.cover.setAttribute("data-state", "off");
    this.tl?.pause();
    this.say("Rebel Mind Zone loaded");
    loaderGate.release(outcome);
  }

  /** Always safe to call (unmount, StrictMode re-run): releases the lock and, if the run never finished, hands the hero back. */
  dispose() {
    this.cleanups.splice(0).forEach((f) => f());
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
    document.documentElement.removeAttribute(LOADER_LOCK_ATTR);
  }

  /** Called when the component really unmounted (not a StrictMode simulation): never leave the page covered or the hero waiting. */
  abandon() {
    this.dispose();
    if (!this.finished) {
      this.finished = true;
      this.cover.setAttribute("data-state", "off");
      loaderGate.release("skipped");
    }
  }

  private say(text: string) {
    if (this.status) this.status.textContent = text; // one polite status line; animation frames are never announced
  }

  private timer(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }
}
