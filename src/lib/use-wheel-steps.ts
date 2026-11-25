"use client";

import { useEffect, useRef } from "react";

/**
 * Wheel → one step per deliberate gesture, only while the pointer is over the cards.
 *
 * - `over(e)`: the pointer is on the interactive card area (and the section is on screen). Anywhere else the wheel is never touched
 *   (no preventDefault): the page scrolls like any page.
 * - `canStep(dir)`: there is a next / previous step. At the first / last step the wheel passes natively, so the page continues to the
 *   next / previous section and the section is never a trap.
 * - `step(dir)`: perform the step (the caller animates it).
 * One gesture = one step: trackpad momentum is swallowed until it ends (200 ms of silence) or a clearly new, deliberate scroll begins.
 * Card state is independent of the page's scroll position.
 */
const SIL = 200; // ms of silence that ends a wheel gesture
const SETTLE_MAX = 450; // ms an approach gesture may keep the wheel native once the cards are in place
const THR = 40; // px of wheel travel that counts as a step
const BUSY = 700; // ms a step takes to land

type Opts = {
  active: boolean;
  over: (e: WheelEvent) => boolean;
  canStep: (dir: number) => boolean;
  step: (dir: number) => void;
  /** Opt-in: a wheel gesture that started while `over` was false (page approach, momentum tail) stays native until it ends (SIL of silence);
   *  the cards never start stepping on the tail of the scroll that brought the section into place. */
  settle?: boolean;
};

export function useWheelSteps(opts: Opts) {
  const ref = useRef(opts);
  const { active } = opts;
  useEffect(() => { ref.current = opts; });
  useEffect(() => {
    if (!active) return;
    let g: { last: number; lastAbs: number; mode: "native" | "handled"; fired: boolean; sum: number; dec: boolean; inc: number } | null = null;
    let busy = 0;
    let offAt = -1e9; // last wheel event seen while the cards were NOT in control (settle option)
    let offFirst = -1e9; // when that run of events began: an approach gesture stays native for at most SETTLE_MAX, however long the momentum lasts
    const onWheel = (e: WheelEvent) => {
      const o = ref.current;
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (!o.over(e)) { const t = performance.now(); if (t - offAt >= SIL) offFirst = t; g = null; offAt = t; return; } // pointer off the cards / stage not in place: ordinary page scrolling, untouched
      if (o.settle && performance.now() - offAt < SIL && performance.now() - offFirst < SETTLE_MAX) { offAt = performance.now(); return; } // same gesture as an approach scroll: stays native
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      if (Math.abs(dy) < 0.5) return;
      const now = performance.now();
      const dir = dy > 0 ? 1 : -1;
      const a = Math.abs(dy);
      let fresh = !g || now - g.last > SIL;
      if (!fresh && g && g.fired && now >= busy) {
        // trackpad momentum keeps one gesture alive for seconds: a clear re-acceleration after the tail is a new, deliberate scroll
        if (a < g.lastAbs) { g.dec = true; g.inc = 0; }
        else if (g.dec && a > g.lastAbs * 1.2 + 2) g.inc++;
        if (g.inc >= 3 && a >= 15) fresh = true;
      }
      // at the first / last step the way out must never wait for the gesture to end: once the step has landed, a real push outwards passes through
      if (!fresh && g && now >= busy && !o.canStep(dir) && a >= 10) fresh = true;
      if (fresh) g = { last: now, lastAbs: a, mode: o.canStep(dir) ? "handled" : "native", fired: now < busy, sum: 0, dec: false, inc: 0 };
      else if (g) {
        g.last = now;
        g.lastAbs = a;
        if (g.mode === "native" && o.canStep(dir)) { g.mode = "handled"; g.fired = true; } // a native scroll never starts stepping mid-gesture
      }
      if (!g || g.mode === "native") return;
      e.preventDefault();
      if (g.fired) return;
      g.sum += dy;
      if (Math.abs(g.sum) >= THR) {
        g.fired = true;
        busy = now + BUSY;
        o.step(g.sum > 0 ? 1 : -1);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [active]);
}

/** True while at least `min` of the element's height is on screen below the fixed header — only then does the wheel drive the cards. */
export function mostlyVisible(el: HTMLElement | null, min = 0.6) {
  if (!el) return false;
  const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
  const r = el.getBoundingClientRect();
  const seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, hh);
  return seen >= r.height * min;
}
