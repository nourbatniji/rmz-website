"use client";

import { useEffect } from "react";
import { ANCHOR_ALIASES } from "@/lib/anchors";

/**
 * The single owner of homepage hash arrival (mounted once by HomePage). Two jobs:
 *
 *  1. Old / alternative ids (see lib/anchors.ts) → the current section: the hash is rewritten and the page scrolls there. A real element with the requested id always wins.
 *  2. Arriving WITH a hash (typed URL, a link from another page, a client-side navigation): the browser scrolls to the fragment once, while the document is still short — the
 *     pinned sections only get their real height after hydration — and it stops retrying as soon as `load` fires, so the target ends up wherever the early layout put it
 *     (or at the top). Here the target is re-seated each time the document's height changes, until the visitor takes over (wheel, touch, pointer or key). It is driven by
 *     layout changes, not by timers. Reload and back/forward on the first document keep the browser's own scroll restoration.
 *
 * The same applies to a link or hash change on the page itself: the browser's jump is made once, against whatever the layout is at that instant, and the closing cover
 * (sticky and translated) and late-arriving content move the target afterwards. Back/forward between hash entries therefore returns to that section's landing position.
 * Anything that moves an anchor without changing the document's size (the closing cover measuring its logos) announces it with the `rmz:layout` event.
 */
export const LAYOUT_EVENT = "rmz:layout";
let mounts = 0;

export function AnchorNavigator() {
  useEffect(() => {
    const first = mounts++ === 0;
    let release: (() => void) | null = null;

    const targetOf = (rewrite: boolean): HTMLElement | null => {
      const raw = decodeURIComponent(window.location.hash.slice(1));
      if (!raw) return null;
      const real = document.getElementById(raw);
      if (real) return real;
      const to = ANCHOR_ALIASES[raw];
      const el = to ? document.getElementById(to) : null;
      if (el && rewrite) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${to}`);
      return el;
    };

    const seat = (el: HTMLElement) => {
      release?.();
      const align = () => el.scrollIntoView();
      align();
      const ro = new ResizeObserver(align);
      ro.observe(document.documentElement);
      ro.observe(document.body); // the root element can keep a fixed box while its scrollable content grows
      window.addEventListener(LAYOUT_EVENT, align);
      const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
      const stop = () => {
        ro.disconnect();
        window.removeEventListener(LAYOUT_EVENT, align);
        events.forEach((e) => window.removeEventListener(e, stop));
        release = null;
      };
      events.forEach((e) => window.addEventListener(e, stop, { passive: true }));
      release = stop;
    };

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const restored = first && !!nav && (nav.type === "reload" || nav.type === "back_forward");
    if (!restored) {
      const el = targetOf(true);
      if (el) seat(el);
    }

    // a hash change on the page, including back/forward between hash entries: seat the target (old ids are rewritten to the current one first)
    const onHash = () => {
      const el = targetOf(true);
      if (el) seat(el);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      release?.();
    };
  }, []);
  return null;
}
