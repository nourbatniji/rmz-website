/**
 * One gesture = one step for pinned, scroll-linked sections (touch swipe + settle). Wheel input uses `useWheelSteps` (src/lib/use-wheel-steps.ts).
 *
 * The section keeps its tall track + sticky stage, but the page scroll inside the pinned range is driven here: a swipe (or wheel gesture) moves
 * exactly one item — the page glides to that item's scroll position (≈ 0.7 s, eased) and stops there — never half way between two. At the first /
 * last item the gesture passes through natively, so the section is never a trap. A scroll that ends between items (scrollbar, keys, approach
 * momentum) settles on the nearest one.
 */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const SWIPE = 40; // px of finger travel that counts as a step
const DUR = 700;
const SETTLE_MS = 160;

export type StepScroll = {
  goTo: (i: number) => void;
  step: (dir: number) => void;
  canStep: (dir: number) => boolean;
  seated: () => boolean;
  destroy: () => void;
};

type Opts = {
  count: number;
  /** pinned stage is seated under the header (inside the pinned range) and the effect is live */
  seated: () => boolean;
  /** item currently shown (at rest) */
  index: () => number;
  /** absolute scrollY at which item i is fully shown */
  target: (i: number) => number;
};

export function attachStepScroll({ count, seated, index, target }: Opts): StepScroll {
  let raf = 0, busyUntil = 0, to = -1, touching = false, st = 0;
  const cur = () => (performance.now() < busyUntil && to >= 0 ? to : index());
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const glide = (i: number) => {
    const j = clamp(i, 0, count - 1);
    to = j;
    stop();
    const y0 = window.scrollY, y1 = target(j);
    if (Math.abs(y1 - y0) < 2) { busyUntil = 0; return; }
    const t0 = performance.now();
    busyUntil = t0 + DUR;
    const f = (now: number) => {
      const t = clamp((now - t0) / DUR, 0, 1);
      window.scrollTo(0, t < 1 ? y0 + (y1 - y0) * ease(t) : y1);
      if (t < 1) raf = requestAnimationFrame(f); else { raf = 0; busyUntil = 0; }
    };
    raf = requestAnimationFrame(f);
  };
  const canStep = (dir: number) => { const j = cur() + dir; return j >= 0 && j <= count - 1; };
  const step = (dir: number) => { if (canStep(dir)) glide(cur() + dir); };

  const settle = () => {
    if (touching || raf || performance.now() < busyUntil || !seated()) return;
    const y = window.scrollY;
    if (y < target(0) - 2 || y > target(count - 1) + 2) return; // leaving the section at either end: don't pull back
    let best = 0, bd = Infinity;
    for (let i = 0; i < count; i++) { const d = Math.abs(target(i) - y); if (d < bd) { bd = d; best = i; } }
    if (bd > 2) glide(best);
  };
  const onScroll = () => { window.clearTimeout(st); st = window.setTimeout(settle, SETTLE_MS); };

  // touch: decided at touchstart (a swipe that begins outside the pinned range is never taken over), then one step per finger-down
  let g: { x: number; y: number; on: boolean; mode: "" | "native" | "handled"; fired: boolean } | null = null;
  const onStart = (e: TouchEvent) => {
    touching = true;
    window.clearTimeout(st);
    const t = e.touches[0];
    g = { x: t.clientX, y: t.clientY, on: seated(), mode: "", fired: false };
    if (g.on && raf) { stop(); busyUntil = 0; } // catching the page mid-glide: stay where it is, settle on release
  };
  const onMove = (e: TouchEvent) => {
    if (!g || !g.on) return;
    const t = e.touches[0];
    const dx = g.x - t.clientX, dy = g.y - t.clientY;
    if (!g.mode) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy)) { g.mode = "native"; return; }
      g.mode = canStep(dy > 0 ? 1 : -1) ? "handled" : "native";
    }
    if (g.mode !== "handled") return;
    if (e.cancelable) e.preventDefault();
    if (!g.fired && Math.abs(dy) >= SWIPE) { g.fired = true; step(dy > 0 ? 1 : -1); }
  };
  const onEnd = () => { touching = false; g = null; window.clearTimeout(st); st = window.setTimeout(settle, SETTLE_MS); };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd, { passive: true });
  window.addEventListener("touchcancel", onEnd, { passive: true });
  return {
    goTo: glide,
    step,
    canStep,
    seated,
    destroy() {
      stop();
      window.clearTimeout(st);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    },
  };
}
