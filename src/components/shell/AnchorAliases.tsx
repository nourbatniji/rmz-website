"use client";

import { useEffect } from "react";
import { ANCHOR_ALIASES } from "@/lib/anchors";

/** Old homepage anchors (see lib/anchors.ts) → the current section: rewrites the hash and scrolls there. A real element with the requested id always wins. */
export function AnchorAliases() {
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const to = ANCHOR_ALIASES[id];
      if (!to || document.getElementById(id)) return;
      const el = document.getElementById(to);
      if (!el) return;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${to}`);
      el.scrollIntoView();
    };
    go();
    const onLoad = () => go();
    window.addEventListener("hashchange", go);
    if (document.readyState !== "complete") window.addEventListener("load", onLoad, { once: true });
    return () => {
      window.removeEventListener("hashchange", go);
      window.removeEventListener("load", onLoad);
    };
  }, []);
  return null;
}
