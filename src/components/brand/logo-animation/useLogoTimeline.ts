"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { buildLogoTimeline } from "./logo-timeline";

/**
 * Builds the ONE logo timeline (buildLogoTimeline) for an <svg> rendered by <LogoStage>, reveals the svg, and hands the paused timeline to `onBuilt`
 * (which decides how it is driven: the lab scrubs it, the page loader plays it to the resolved pose; returning `false` keeps the svg hidden until the consumer reveals it). Everything is reverted on unmount.
 * `onBuilt` is read through a ref: changing it never rebuilds the timeline.
 */
export function useLogoTimeline(svgRef: RefObject<SVGSVGElement | null>, onBuilt: (tl: gsap.core.Timeline) => void | false) {
  const cb = useRef(onBuilt);
  useEffect(() => {
    cb.current = onBuilt;
  });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctx = gsap.context(() => {
      const tl = buildLogoTimeline(svg);
      // The svg is revealed once the timeline has set the start pose, unless the consumer returns false and reveals it itself.
      if (cb.current(tl) !== false) gsap.set(svg, { visibility: "visible" });
    }, svg);
    return () => ctx.revert();
  }, [svgRef]);
}
