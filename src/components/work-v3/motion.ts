"use client";

import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * V3 motion vocabulary — the same curves the homepage CSS uses, named once.
 *   rmz       cubic-bezier(.2,.8,.2,1)   the default: fast out, long settle (entrances, selections)
 *   rmzSlow   cubic-bezier(.16,.84,.24,1) reveals and long settles
 *   rmzInOut  cubic-bezier(.7,0,.2,1)     scroll-bound transformations (frames opening, panels taking over)
 */
let ready = false;
export function setupMotion() {
  if (ready || typeof window === "undefined") return { gsap, ScrollTrigger };
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  CustomEase.create("rmz", "0.2,0.8,0.2,1");
  CustomEase.create("rmzSlow", "0.16,0.84,0.24,1");
  CustomEase.create("rmzInOut", "0.7,0,0.2,1");
  ScrollTrigger.config({ ignoreMobileResize: true });
  ready = true;
  return { gsap, ScrollTrigger };
}

export const MQ = {
  motion: "(prefers-reduced-motion: no-preference)",
  desktop: "(min-width: 820px)",
};

/** Splits `*word*` into plain + Playfair-italic accent parts. */
export function accent(text: string): { t: string; em: boolean }[] {
  return text.split(/(\*[^*]+\*)/g).filter(Boolean).map((t) => (t.startsWith("*") ? { t: t.slice(1, -1), em: true } : { t, em: false }));
}
