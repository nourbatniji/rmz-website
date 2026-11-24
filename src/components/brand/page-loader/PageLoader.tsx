"use client";

import { useLayoutEffect, useRef } from "react";
import { LogoStage } from "@/components/brand/logo-animation/LogoStage";
import { useLogoTimeline } from "@/components/brand/logo-animation/useLogoTimeline";
import { LOADER_ID } from "./loader-config";
import { loaderGate } from "./loader-gate";
import { entryDecision, isReturningVisitor, LoaderRun, markShown } from "./loader-run";
import "./page-loader.css";

/**
 * Homepage loader: an opaque cover over the page (the homepage renders underneath it) that plays the approved RMZ logo animation — the shared timeline,
 * not a copy — and leaves when the first view is ready. See docs/page-loader.md.
 *
 * The cover is part of the server HTML, so nothing of the page shows before it; the boot script (before hydration) hides it for entries that should not show
 * it, <noscript> hides it without JavaScript, and a CSS animation removes it if this component never starts. Everything is driven imperatively
 * (attributes on the cover, one polite status line): no React state, so nothing re-renders while the animation plays.
 */
export function PageLoader() {
  const coverRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const runRef = useRef<LoaderRun | null>(null);
  const decisionRef = useRef<{ run: boolean; returning: boolean } | null>(null); // decided once (the session/seen flags are written here), stable across a StrictMode re-run
  const aliveRef = useRef(false);

  // Layout effect: before the first paint on a client-side navigation, so a cover that should not appear is never painted.
  useLayoutEffect(() => {
    const cover = coverRef.current;
    if (!cover) return;
    aliveRef.current = true;
    if (decisionRef.current === null) {
      const run = cover.getAttribute("data-state") !== "off" && entryDecision().run;
      const returning = run && isReturningVisitor(); // read BEFORE this visit is recorded
      decisionRef.current = { run, returning };
      if (run) markShown();
    }
    const decision = decisionRef.current;
    if (!decision.run) {
      cover.setAttribute("data-state", "off");
      loaderGate.release("skipped");
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const run = new LoaderRun(cover, statusRef.current, svgRef.current, { reduced, returning: decision.returning });
    runRef.current = run;
    run.start();
    return () => {
      aliveRef.current = false;
      run.dispose();
      runRef.current = null;
      // A StrictMode simulated unmount is followed by an immediate re-mount; only a real unmount abandons the run.
      window.setTimeout(() => {
        if (!aliveRef.current) run.abandon();
      }, 0);
    };
  }, []);

  // The shared timeline is built here; the run decides when it is revealed and played (false = keep the svg hidden, e.g. no loader for this entry).
  useLogoTimeline(svgRef, (tl) => {
    const run = runRef.current;
    return run ? run.attach(tl) : false;
  });

  return (
    <>
      <div id={LOADER_ID} ref={coverRef} className="rmz-loader" data-state="on" data-hold="1" aria-hidden="true" suppressHydrationWarning>
        <LogoStage ref={svgRef} className="rmz-loader__svg" />
        <div className="rmz-loader__activity" />
      </div>
      <p ref={statusRef} className="sr-only" role="status" aria-live="polite" />
    </>
  );
}
