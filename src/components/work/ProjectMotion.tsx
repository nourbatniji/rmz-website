"use client";

import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll motion for the project page (same language as the SIDRA case study): pictures open with a clip-path mask while
 * their image settles from a slight zoom, real images drift with a light parallax, text rises in, lists and facts stagger.
 * It is alive only while scrolling DOWN: each element plays once as it arrives. As soon as the visitor scrolls back up, everything
 * jumps to its final state and the page is static (no replay, no parallax). No effect (final layout, nothing hidden) with prefers-reduced-motion or without JS.
 * It only animates what is already in the markup; nothing here changes layout or colours.
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const REPLAY = "play none none none"; // plays once when the element arrives from below; never resets or replays
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
      const drift: gsap.core.Tween[] = [];
      const tweens: gsap.core.Animation[] = [];
      const track = <A extends gsap.core.Animation>(a: A) => (tweens.push(a), a);
      const st = (trigger: Element, start = "top 90%") => ({ trigger, start, end: "bottom 8%", toggleActions: REPLAY });

      // Top of the page: plays on load, and again when scrolling back up to it.
      const top = root.querySelector<HTMLElement>(".wk-top");
      if (top) {
        track(gsap.fromTo(top.querySelectorAll(".wk-back, .wk-nm, .wk-nl"), { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.08, scrollTrigger: st(top, "top 98%") }));
        const h1 = top.querySelector("h1");
        if (h1) track(gsap.fromTo(h1, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power4.out", scrollTrigger: st(top, "top 98%") }));
      }

      // Text, facts, list rows and cards rise in.
      all(TEXT).filter((el) => !top?.contains(el) && !el.parentElement?.closest(TEXT)).forEach((el) => {
        track(gsap.fromTo(el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, ease: "power3.out", scrollTrigger: st(el) }));
      });

      // Pictures: mask open + image settle, then a light parallax drift on the real ones.
      all(".wk-ph").forEach((ph) => {
        const img = ph.querySelector("img");
        const t = st(ph, "top 88%");
        track(gsap.fromTo(ph, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.25, ease: "power3.inOut", scrollTrigger: t }));
        if (img) {
          track(gsap.fromTo(img, { scale: 1.16 }, { scale: 1, duration: 1.6, ease: "power3.out", scrollTrigger: t }));
          drift.push(gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: ph, start: "top bottom", end: "bottom top", scrub: true } }));
        }
      });

      // Scrolling back up ends all motion: everything snaps to its final state and the page stays static.
      let maxY = window.scrollY;
      let frozen = false;
      const freeze = () => {
        frozen = true;
        window.removeEventListener("scroll", onScroll);
        tweens.forEach((a) => {
          a.scrollTrigger?.kill();
          a.progress(1).kill();
        });
        drift.forEach((d) => {
          d.scrollTrigger?.kill();
          d.kill();
          gsap.set(d.targets(), { yPercent: 0 });
        });
      };
      function onScroll() {
        const y = window.scrollY;
        if (y > maxY) maxY = y;
        else if (!frozen && maxY - y > 80) freeze();
      }
      window.addEventListener("scroll", onScroll, { passive: true });

      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);
      const t = window.setTimeout(onLoad, 600);
      return () => {
        window.removeEventListener("load", onLoad);
        window.removeEventListener("scroll", onScroll);
        window.clearTimeout(t);
        root.classList.remove("wk-gsap");
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
