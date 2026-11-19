"use client";

import { useEffect, useLayoutEffect, type RefObject } from "react";

/**
 * One-shot section entrance, driven entirely by a `data-entrance` attribute on the section element (CSS does the motion):
 *   (no attribute / "done") → final layout, fully visible.   "pre" → hidden start state (opacity / small offsets only; layout never changes).
 *   "playing" → the CSS transitions run once.   "instant" → one frame with transitions disabled, then "done".
 *
 * Rules (so content is never lost):
 *  • Nothing is applied during SSR or without JS: the server markup is the final state. The attribute is set only after hydration, in a layout
 *    effect (before paint), and only when motion is allowed, IntersectionObserver exists, and the visitor did not navigate to this section by hash.
 *  • Plays when ≥ `threshold` of the section is visible BELOW the fixed header — never while it is offscreen — and only once per page load.
 *    If it sits partly on screen below the threshold for 700 ms (e.g. after a long jump) it is revealed anyway: visible space is never left empty.
 *  • Any pointer/keyboard/focus interaction inside the section, a hash navigation, or scrolling past the section finishes it INSTANTLY.
 *  • A timer guarantees the final state even if the transitions never run.
 *  • No scroll handlers, no pinning, no extra scroll distance; the observers are removed when it is done.
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useEntrance(
  ref: RefObject<HTMLElement | null>,
  { threshold = 0.3, playMs = 1000, mediaQuery }: { threshold?: number; playMs?: number; mediaQuery?: string } = {},
) {
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    if (mediaQuery && !window.matchMedia(mediaQuery).matches) return; // only where this entrance applies (checked at load)
    if (el.id && window.location.hash === `#${el.id}`) return; // direct navigation: never land on hidden content

    let state: "pre" | "playing" | "done" = "pre";
    let timer = 0;
    let sliver = 0;
    let raf = 0;
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
    el.dataset.entrance = "pre";

    const teardown = () => {
      io.disconnect();
      pass.disconnect();
      el.removeEventListener("pointerdown", instant, true);
      el.removeEventListener("keydown", instant, true);
      el.removeEventListener("focusin", instant, true);
      window.removeEventListener("hashchange", instant);
    };
    const finish = (immediately: boolean) => {
      if (state === "done") return;
      state = "done";
      window.clearTimeout(timer);
      window.clearTimeout(sliver);
      teardown();
      if (immediately) {
        el.dataset.entrance = "instant"; // transitions off for this frame, so everything snaps to its final state
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => {
            el.dataset.entrance = "done";
          });
        });
      } else el.dataset.entrance = "done";
    };
    function instant() {
      finish(true);
    }
    const play = () => {
      state = "playing";
      el.dataset.entrance = "playing";
      timer = window.setTimeout(() => finish(false), playMs);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (state === "pre") {
          if (e.isIntersecting && e.intersectionRatio >= threshold) {
            window.clearTimeout(sliver);
            play();
          } else if (e.isIntersecting && e.intersectionRatio > 0) {
            // Partly on screen but under the threshold (e.g. after a long jump): never leave visible space empty — reveal it if it stays that way.
            if (!sliver) sliver = window.setTimeout(() => state === "pre" && play(), 700);
          } else {
            window.clearTimeout(sliver);
            sliver = 0;
            if (e.boundingClientRect.bottom <= (e.rootBounds ? e.rootBounds.top : hh)) finish(true); // already passed it
          }
        } else if (state === "playing" && !e.isIntersecting) finish(true); // left the screen mid-entrance: complete now, don't animate offscreen
      },
      { rootMargin: `-${hh}px 0px 0px 0px`, threshold: [0, threshold] },
    );
    io.observe(el);
    // An IntersectionObserver only reports threshold CROSSINGS, so a jump from "below the fold" to "far above" would report nothing.
    // This second observer's root is extended far upward: the section becomes "intersecting" as soon as it is anywhere above the
    // viewport bottom, so being passed (bottom edge above the header) is a state change we can catch.
    const pass = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (state !== "done" && e.isIntersecting && e.boundingClientRect.bottom <= hh) finish(true);
      },
      { rootMargin: "100000px 0px 0px 0px", threshold: [0] },
    );
    pass.observe(el);
    el.addEventListener("pointerdown", instant, true);
    el.addEventListener("keydown", instant, true);
    el.addEventListener("focusin", instant, true);
    window.addEventListener("hashchange", instant);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      teardown();
      if (state !== "done") el.dataset.entrance = "done"; // unmounting (or strict-mode re-run): never leave content hidden
    };
  }, [ref, threshold, playMs, mediaQuery]);
}
