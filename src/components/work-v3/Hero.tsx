"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { Project } from "@/content/work-v3/types";
import { ResponsivePlate } from "./art";
import { accent, MQ, setupMotion } from "./motion";

/**
 * PART 01 — THE FRAME BREAK.
 *  Start    the art sits inside a deliberate window (right, off-centre); the title is set across and out of it:
 *           inside the window the letters flip to ink, outside they are cream.
 *  Trigger  native scroll over ~85vh (a sticky stage, no wheel hijacking).
 *  Middle   the window opens (clip-path), the art settles from a tight crop, the title scales down independently.
 *  End      full-bleed art with the title tucked bottom-left. The Story section follows immediately.
 *  Exit     sticky releases, the page scrolls on normally.
 */
const arriving = () => { try { return !!sessionStorage.getItem("rmz-v3-curtain"); } catch { return false; } };

export function Hero({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);
  const letters = project.name.toUpperCase().split("");
  const hero = { art: "hero" as const, ratio: 1.6, alt: project.hero ? `${project.name} — RMZ identity sequence still` : `${project.name} — prototype artwork`, src: project.hero?.src, pos: project.hero?.pos };

  useEffect(() => {
    const { gsap, ScrollTrigger } = setupMotion();
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
      const { motion } = ctx.conditions as { motion: boolean };
      if (!motion) return;
      const q = (s: string) => el.querySelectorAll<HTMLElement>(s);
      const open = "inset(0% 0% 0% 0%)";

      // Entrance (plays once): wipe the window in, letters rise through their masks, copy follows.
      const intro = gsap.timeline({ delay: arriving() ? 0.55 : 0.1 });
      intro
        .to(q("[data-wipe]"), { clipPath: open, duration: 1.25, ease: "rmzInOut" }, 0)
        .to(q("[data-art]"), { scale: 1.2, duration: 1.8, ease: "rmzSlow" }, 0)
        .fromTo(q(".v3-ch"), { yPercent: 112, opacity: 1 }, { yPercent: 0, duration: 1.15, ease: "rmz", stagger: 0.07 }, 0.25)
        .to(q("[data-in]"), { opacity: 1, y: 0, duration: 0.9, ease: "rmz", stagger: 0.09 }, 0.7);

      // Scroll: one scrubbed timeline across the sticky stage.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true },
      });
      tl.to(q("[data-frame]"), { clipPath: open, ease: "rmzInOut", duration: 0.92 }, 0)
        .to(q("[data-art]"), { scale: 1, ease: "power1.out", duration: 1 }, 0)
        .to(q("[data-title]"), { scale: 0.34, yPercent: 3, ease: "power3.inOut", duration: 0.95, transformOrigin: "0% 100%" }, 0)
        .to(q("[data-fade]"), { opacity: 0, y: -36, ease: "power2.in", duration: 0.34 }, 0)
        .to(q("[data-cue]"), { opacity: 0, duration: 0.15 }, 0);

      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(refresh);
      return () => {
        intro.kill();
      };
    });
    return () => mm.revert();
  }, []);

  const title = (ink: boolean) => {
    const Tag = ink ? "div" : "h1";
    return (
      <Tag className={`v3-hero-title${ink ? " v3-hero-title--ink" : ""}`} data-title aria-label={ink ? undefined : project.name} style={{ "--n": letters.length } as CSSProperties}>
        <span className="v3-ln" aria-hidden="true">
          {letters.map((ch, i) => (
            <span className="v3-ch" key={i}>{ch}</span>
          ))}
        </span>
      </Tag>
    );
  };

  return (
    <section ref={root} className="v3-hero" aria-label={`${project.name} — case study`}>
      <div className="v3-hero-pin">
        {/* cream title: visible outside the window */}
        <div className="v3-hero-titlewrap">
          {title(false)}
        </div>

        <div className="v3-hero-frame" data-frame>
          <div className="v3-hero-wipe" data-wipe>
            <div className="v3-hero-art" data-art>
              <ResponsivePlate media={hero} project={project} ratio={1.6} ratioM={0.5} />
            </div>
          </div>
          {/* ink title: the same letters, clipped by the same window — this is the frame break */}
          <div className="v3-hero-titlewrap v3-hero-titlewrap--ink" aria-hidden="true">{title(true)}</div>
        </div>

        <div className="v3-hero-copy" data-fade>
          <p className="v3-kicker" data-in>
            {project.number} — {project.category} <span aria-hidden="true">·</span> {project.year}
          </p>
          <p className="v3-hero-statement" data-in>
            {accent(project.statement).map((p, i) => (p.em ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>))}
          </p>
          <p className="v3-cue t-meta" data-cue data-in aria-hidden="true">Scroll ↓</p>
        </div>
      </div>
    </section>
  );
}
