"use client";

import { useEffect, type RefObject } from "react";

/**
 * Scales a fixed-size designed artboard (`box`, w × h px) uniformly to the width of its wrapper (never stretched, capped at `max`),
 * centred. The wrapper's own height is `calc(var(--bh) * var(--sc))`, set in CSS, so the page flow follows the scaled size.
 * Without JS the server markup is the 1× artboard.
 */
export function useFit(
  wrap: RefObject<HTMLElement | null>,
  box: RefObject<HTMLElement | null>,
  w: number,
  max = 1.25,
  enabled = true,
  /** Optional: also keep the artboard (height `h`) inside the viewport height, but never scale below `floor`. For pinned full-screen sections. */
  fitH?: { h: number; floor: number },
) {
  useEffect(() => {
    const el = wrap.current;
    const b = box.current;
    if (!el || !b || !enabled) return;
    const fit = () => {
      if (!el.clientWidth) return; // hidden at this breakpoint
      const sc = Math.min(el.clientWidth / w, max, fitH ? Math.max(fitH.floor, window.innerHeight / fitH.h) : Infinity);
      el.style.setProperty("--sc", sc.toFixed(5));
      b.style.setProperty("transform", `translateX(${((el.clientWidth - w * sc) / 2).toFixed(2)}px) scale(${sc.toFixed(5)})`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (fitH) window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      if (fitH) window.removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitH is a constant literal at the call site
  }, [wrap, box, w, max, enabled, fitH?.h, fitH?.floor]);
}
