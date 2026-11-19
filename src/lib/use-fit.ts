"use client";

import { useEffect, type RefObject } from "react";

/**
 * Scales a fixed-size designed artboard (`box`, w × h px) uniformly to the width of its wrapper (never stretched, capped at `max`),
 * centred. The wrapper's own height is `calc(var(--bh) * var(--sc))`, set in CSS, so the page flow follows the scaled size.
 * Without JS the server markup is the 1× artboard.
 */
export function useFit(wrap: RefObject<HTMLElement | null>, box: RefObject<HTMLElement | null>, w: number, max = 1.25, enabled = true) {
  useEffect(() => {
    const el = wrap.current;
    const b = box.current;
    if (!el || !b || !enabled) return;
    const fit = () => {
      if (!el.clientWidth) return; // hidden at this breakpoint
      const sc = Math.min(el.clientWidth / w, max);
      el.style.setProperty("--sc", sc.toFixed(5));
      b.style.setProperty("transform", `translateX(${((el.clientWidth - w * sc) / 2).toFixed(2)}px) scale(${sc.toFixed(5)})`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrap, box, w, max, enabled]);
}
