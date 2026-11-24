"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type { Project } from "@/content/work-v3/types";
import { ResponsivePlate } from "./art";
import { MQ, setupMotion } from "./motion";

/**
 * PART 05 — THE NEXT WORLD.
 *  Start    the current project's closing frame (the entrance composition again) fills the screen; the next project already
 *           sits in a small window, lower right, labelled and clickable.
 *  Trigger  scroll over ~90vh (sticky stage), or a click on the window at any time.
 *  Middle   the window opens to the whole screen in the next project's own colours; its title rises; the current frame recedes.
 *  End      the next project owns the stage, with a clear "Open project" invitation.
 *  Exit     click → the next colour sweeps the screen, the route changes, and the next page's own entrance wipes it away.
 */
export function Handoff({ project, next }: { project: Project; next: Project }) {
  const root = useRef<HTMLElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const router = useRouter();
  const letters = next.name.toUpperCase().split("");
  const href = `/work-v3/${next.slug}`;
  const heroLike = { art: "hero" as const, ratio: 1.6 };
  const curLike = { ...heroLike, src: project.hero?.src, pos: project.hero?.pos };
  const nextLike = { ...heroLike, src: next.hero?.src, pos: next.hero?.pos };

  useEffect(() => {
    const { gsap, ScrollTrigger } = setupMotion();
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add({ motion: MQ.motion }, (ctx) => {
      if (!(ctx.conditions as { motion: boolean }).motion) return;
      const q = (s: string) => el.querySelectorAll<HTMLElement>(s);
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true },
      });
      tl.to(q("[data-clip]"), { clipPath: "inset(0% 0% 0% 0%)", ease: "rmzInOut", duration: 0.82 }, 0)
        .to(q("[data-npl]"), { scale: 1, ease: "power2.out", duration: 0.9 }, 0)
        .to(q("[data-curpl]"), { scale: 1.08, xPercent: -3, ease: "power1.inOut", duration: 1 }, 0)
        .to(q("[data-peek]"), { opacity: 0, duration: 0.14 }, 0)
        .fromTo(q("[data-ntitle] .v3-ch"), { yPercent: 112, opacity: 1 }, { yPercent: 0, ease: "rmz", duration: 0.34, stagger: 0.04 }, 0.5)
        .to(q("[data-nin]"), { opacity: 1, y: 0, ease: "rmz", duration: 0.3, stagger: 0.06 }, 0.66);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => mm.revert();
  }, []);

  // Exit: take the whole screen in the next colour, then change route. The next page reads the colour and wipes it away.
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || busy.current) return;
    e.preventDefault();
    busy.current = true;
    try { sessionStorage.setItem("rmz-v3-curtain", next.palette[0]); } catch { /* storage unavailable: the transition just skips its second half */ }
    const { gsap } = setupMotion();
    const motion = window.matchMedia(MQ.motion).matches;
    if (!motion) { router.push(href); return; }
    const tl = gsap.timeline({ onComplete: () => router.push(href) });
    tl.to(root.current!.querySelector("[data-clip]"), { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "rmzInOut" }, 0)
      .fromTo(veil.current, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "rmzInOut" }, 0.35);
  };

  return (
    <section ref={root} className="v3-next" aria-label="Next project">
      <div className="v3-next-pin">
        <div className="v3-next-cur" aria-hidden="true">
          <div className="v3-next-curpl" data-curpl><ResponsivePlate media={{ ...curLike, alt: "" }} project={project} ratio={1.6} ratioM={0.5} /></div>
          <p className="v3-next-curtitle" style={{ "--n": project.name.length } as CSSProperties}>{project.name.toUpperCase()}</p>
          <p className="v3-kicker v3-next-curkick">{project.number} — End of case study</p>
        </div>

        <Link href={href} onClick={open} className="v3-next-region" data-region aria-label={`Next project: ${next.name}. Open project`} style={{ "--ng": next.palette[0], "--nk": next.palette[3] } as CSSProperties}>
          <span className="v3-next-clip" data-clip>
            <span className="v3-next-pl" data-npl><ResponsivePlate media={{ ...nextLike, alt: "" }} project={next} ratio={1.6} ratioM={0.5} /></span>
            <span className="v3-next-copy">
              <span className="v3-kicker" data-nin>Next project — {next.number}</span>
              <span className="v3-next-title" data-ntitle style={{ "--n": letters.length } as CSSProperties}>
                <span className="v3-ln">
                  {letters.map((ch, i) => <span className="v3-ch" key={i}>{ch}</span>)}
                </span>
              </span>
              <span className="v3-next-meta" data-nin>{next.category} · {next.year}</span>
              <span className="v3-next-cta" data-nin>Open project <i aria-hidden="true">↗</i></span>
            </span>
          </span>
          <span className="v3-next-peek t-meta" data-peek>Next — {next.name} <i aria-hidden="true">↗</i></span>
        </Link>
      </div>
      <div ref={veil} className="v3-next-veil" style={{ background: next.palette[0] }} aria-hidden="true" />
    </section>
  );
}
