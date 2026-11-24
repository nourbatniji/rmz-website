"use client";

import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll motion for the project page (same language as the SIDRA case study): pictures open with a clip-path mask while
 * their image settles from a slight zoom, real images drift with a light parallax, text rises in, lists and facts stagger.
 * Everything REPLAYS: it resets once an element has left the screen and plays again when the visitor scrolls back to it,
 * in either direction. No effect (final layout, nothing hidden) with prefers-reduced-motion or without JS.
 * It only animates what is already in the markup; nothing here changes layout or colours.
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const REPLAY = "play reset play reset";
const TEXT = ".wk-nm, .wk-stmt, .wk-nl, .wk-nk, .wk-list > div, .wk-meta, .wk-sw, .wk-film, .wk-chip, .wk-cta, .wk-rule";

export function ProjectMotion() {
  useIsoLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(".wk");
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      root.classList.add("wk-gsap");
      const all = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
      const st = (trigger: Element, start = "top 90%") => ({ trigger, start, end: "bottom 8%", toggleActions: REPLAY });

      // Top of the page: plays on load, and again when scrolling back up to it.
      const top = root.querySelector<HTMLElement>(".wk-top");
      if (top) {
        gsap.fromTo(top.querySelectorAll(".wk-back, .wk-nm, .wk-nl"), { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.08, scrollTrigger: st(top, "top 98%") });
        const h1 = top.querySelector("h1");
        if (h1) gsap.fromTo(h1, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power4.out", scrollTrigger: st(top, "top 98%") });
      }

      // Text, facts, list rows and cards rise in.
      all(TEXT).filter((el) => !top?.contains(el) && !el.parentElement?.closest(TEXT)).forEach((el) => {
        gsap.fromTo(el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, ease: "power3.out", scrollTrigger: st(el) });
      });

      // Pictures: mask open + image settle, then a light parallax drift on the real ones.
      all(".wk-ph").forEach((ph) => {
        const img = ph.querySelector("img");
        const t = st(ph, "top 88%");
        gsap.fromTo(ph, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.25, ease: "power3.inOut", scrollTrigger: t });
        if (img) {
          gsap.fromTo(img, { scale: 1.16 }, { scale: 1, duration: 1.6, ease: "power3.out", scrollTrigger: t });
          gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: ph, start: "top bottom", end: "bottom top", scrub: true } });
        }
      });

      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);
      const t = window.setTimeout(onLoad, 600);
      return () => {
        window.removeEventListener("load", onLoad);
        window.clearTimeout(t);
        root.classList.remove("wk-gsap");
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
