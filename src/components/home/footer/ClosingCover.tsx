"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * The "cover" of the closing sequence (desktop ≥ 1024 px): the logos stay pinned at the bottom of the viewport while the cream contact panel rises over them
 * (the logos ease up, shrink slightly and dim as it arrives); the whole block is then the curtain over the folded footer — see FooterUnfold.
 * `--hl` / `--hf` = heights of the logos / form, `--p` = how far the form has risen over the logos (0 → 1).
 * Below 1024 px, or with reduced motion, nothing is pinned: logos and form simply stack.
 */
export function ClosingCover({ logos, form }: { logos: ReactNode; form: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const lg = useRef<HTMLDivElement>(null);
  const fm = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const a = lg.current;
    const b = fm.current;
    if (!el || !a || !b) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const calc = () => {
      raf = 0;
      if (mq.matches) {
        el.style.setProperty("--p", "0");
        return;
      }
      const vh = window.innerHeight;
      const top = b.getBoundingClientRect().top;
      const span = Math.min(b.offsetHeight, vh);
      const p = Math.min(1, Math.max(0, (vh - top) / span));
      const e = p * p * (3 - 2 * p); // smoothstep
      el.style.setProperty("--p", e.toFixed(3));
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    const set = () => {
      el.style.setProperty("--hl", `${a.offsetHeight}px`);
      el.closest<HTMLElement>(".fu-wrap")?.style.setProperty("--cc-hl", `${a.offsetHeight}px`); // lets FooterUnfold seat the #contact anchor outside the moving cover
      el.style.setProperty("--hf", `${b.offsetHeight}px`);
      window.dispatchEvent(new Event("rmz:layout")); // the #contact anchor sits at --cc-hl: tell the anchor navigator it moved
      req();
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(a);
    ro.observe(b);
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", req);
      window.removeEventListener("resize", req);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={root} className="cc">
      <div className="cc-t1">
        <div ref={lg} className="cc-lg">{logos}</div>
      </div>
      <div ref={fm} className="cc-fm">{form}</div>
    </div>
  );
}
