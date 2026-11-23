"use client";

import { useEffect, useRef } from "react";
import type { Media, Project } from "@/content/work-v3/types";
import { Plate, ResponsivePlate } from "./art";
import { MQ, setupMotion } from "./motion";

/**
 * C — THE CINEMATIC BRIDGE. One shot evolving into another, over ~90vh of native scrolling (a sticky stage, never a trap).
 *  Start    a large launch photograph fills nearly the whole screen.
 *  Trigger  scroll (scrubbed).
 *  Middle   the photograph's window closes onto the left while its art pushes in to a detail; a second frame opens from the
 *           right edge, a third slides up into the overlap, and the note arrives.
 *  End      a settled asymmetric three-frame composition — the next gallery state.
 *  Exit     the sticky releases; the next block scrolls in normally.
 */
const FINAL = {
  desk: { a: "inset(14% 40% 8% 4%)", scale: 1.5, origin: "28% 62%" },
  mob: { a: "inset(6% 6% 50% 6%)", scale: 1.35, origin: "30% 60%" },
};

export function Bridge({ project, a, b, c, note }: { project: Project; a: Media; b: Media; c: Media; note: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { gsap, ScrollTrigger } = setupMotion();
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
      const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
      if (!motion) return;
      const f = desktop ? FINAL.desk : FINAL.mob;
      const q = (s: string) => el.querySelector<HTMLElement>(s)!;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true },
      });
      tl.to(q("[data-a]"), { clipPath: f.a, ease: "rmzInOut", duration: 0.8 }, 0)
        .to(q("[data-apl]"), { scale: f.scale, transformOrigin: f.origin, ease: "power2.inOut", duration: 0.9 }, 0)
        .to(q("[data-b]"), { clipPath: "inset(0% 0% 0% 0%)", ease: "rmzSlow", duration: 0.55 }, 0.3)
        .fromTo(q("[data-bpl]"), { xPercent: 14 }, { xPercent: 0, ease: "rmzSlow", duration: 0.7 }, 0.3)
        .fromTo(q("[data-c]"), { yPercent: 135 }, { yPercent: 0, ease: "rmz", duration: 0.5 }, 0.45)
        .fromTo(q("[data-note]"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, ease: "rmz", duration: 0.3 }, 0.72);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className="v3-bridge" id="bridge">
      <div className="v3-bridge-pin">
        <figure className="v3-br-a" data-a>
          <div className="v3-br-apl" data-apl><ResponsivePlate media={a} project={project} ratio={1.6} ratioM={0.5} /></div>
        </figure>
        <figure className="v3-br-b" data-b>
          <div className="v3-br-bpl" data-bpl><Plate media={b} project={project} ratio={1.25} /></div>
        </figure>
        <figure className="v3-br-c" data-c>
          <div className="v3-br-cpl"><Plate media={c} project={project} ratio={1} /></div>
        </figure>
        <p className="v3-br-note" data-note>
          <b>{a.tag}</b>
          {note}
        </p>
      </div>
    </div>
  );
}
