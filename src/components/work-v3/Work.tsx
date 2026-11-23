"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { Media, Project } from "@/content/work-v3/types";
import { mediaOf } from "@/content/work-v3/projects";
import { Plate } from "./art";
import { Frame } from "./Frame";
import { Detail } from "./Detail";
import { LivingCanvas } from "./LivingCanvas";
import { Bridge } from "./Bridge";
import { MQ, setupMotion } from "./motion";

/**
 * PART 03 — THE WORK. A sequence of a few composition types (see content/work-v3/types.ts):
 *  quiet compositions (full / trio / pair / strip / film), the Living Canvas, and one cinematic bridge.
 *  Quiet frames share one vocabulary only: a clip-path reveal on entry and a slow parallax inside the frame.
 */
export function Work({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const { gsap, ScrollTrigger } = setupMotion();
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
      const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
      if (!motion) return;
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((mask) => {
        const pl = mask.querySelector<HTMLElement>("[data-par]");
        const tl = gsap.timeline({ paused: true });
        tl.to(mask, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.15, ease: "rmzSlow" }, 0);
        if (pl) tl.fromTo(pl, { scale: 1.14 }, { scale: 1, duration: 1.5, ease: "rmzSlow" }, 0);
        ScrollTrigger.create({ trigger: mask.parentElement, start: "top 88%", once: true, onEnter: () => tl.play() });
        if (pl)
          gsap.fromTo(pl, { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: mask.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
      // Detail copy rises once, in reading order.
      el.querySelectorAll<HTMLElement>("[data-rise]").forEach((n) => {
        ScrollTrigger.create({ trigger: n, start: "top 90%", once: true, onEnter: () => gsap.to(n, { opacity: 1, y: 0, duration: 1, ease: "rmz", delay: Number(n.dataset.rise) * 0.08 }) });
      });
      // Strip frames drift at different speeds as the row crosses the screen (wide screens only, transform-only).
      if (desktop) el.querySelectorAll<HTMLElement>("[data-drift]").forEach((f) => {
        const k = Number(f.dataset.drift);
        gsap.fromTo(f, { yPercent: k * 6 }, { yPercent: k * -6, ease: "none", scrollTrigger: { trigger: f.closest(".v3-strip"), start: "top bottom", end: "bottom top", scrub: true } });
      });
    });
    return () => mm.revert();
  }, [project.slug]);

  const get = (id: string) => mediaOf(project, id);

  return (
    <section ref={root} className="v3-work" id="work" aria-labelledby="v3-work-h">
      <h2 id="v3-work-h" className="v3-sr">The work</h2>
      {project.sequence.map((b, i) => {
        switch (b.type) {
          case "full":
            return <Full key={i} project={project} media={get(b.id)} />;
          case "trio":
            return <Trio key={i} project={project} main={get(b.main)} details={[get(b.details[0]), get(b.details[1])]} flip={b.flip} />;
          case "pair":
            return <Pair key={i} project={project} a={get(b.a)} b={get(b.b)} flip={b.flip} />;
          case "strip":
            return <Strip key={i} project={project} items={b.ids.map(get)} />;
          case "film":
            return <Film key={i} project={project} media={get(b.id)} />;
          case "canvas":
            return <LivingCanvas key={i} project={project} items={b.ids.map(get)} />;
          case "bridge":
            return <Bridge key={i} project={project} a={get(b.a)} b={get(b.b)} c={get(b.c)} note={b.note} />;
        }
      })}
      {project.detail && <Detail project={project} />}
    </section>
  );
}

/* ── compositions ─────────────────────────────────────────────────────────── */

/** One massive image, cropped hard. */
function Full({ project, media }: { project: Project; media: Media }) {
  return (
    <div className="v3-full">
      <figure className="v3-full-fr">
        <div className="v3-fr-mask" data-reveal data-dir="up">
          <div className="v3-fr-pl" data-par><Plate media={media} project={project} ratio={1.9} /></div>
        </div>
      </figure>
      <div className="v3-rowcap">
        <b>{media.tag}</b>
        <span>{media.title}</span>
        <span className="v3-rowcap-r">{media.caption}</span>
      </div>
    </div>
  );
}

/** One dominant image with two smaller details that sit half on, half off its edge. */
function Trio({ project, main, details, flip }: { project: Project; main: Media; details: [Media, Media]; flip?: boolean }) {
  return (
    <div className={`v3-trio${flip ? " is-flip" : ""}`}>
      <Frame project={project} media={main} className="v3-trio-main" dir={flip ? "right" : "left"} />
      <div className="v3-trio-side">
        <Frame project={project} media={details[0]} className="v3-trio-d1" bare />
        <Frame project={project} media={details[1]} className="v3-trio-d2" dir="up" />
      </div>
    </div>
  );
}

/** Asymmetric pair: a tall and a wide frame, deliberately off each other. */
function Pair({ project, a, b, flip }: { project: Project; a: Media; b: Media; flip?: boolean }) {
  return (
    <div className={`v3-pair${flip ? " is-flip" : ""}`}>
      <Frame project={project} media={a} className="v3-pair-a" dir={flip ? "right" : "left"} />
      <Frame project={project} media={b} className="v3-pair-b" dir="up" />
    </div>
  );
}

/** A horizontal campaign sequence. Desktop: one staggered row. Touch: a native swipe row (no scroll takeover). */
function Strip({ project, items }: { project: Project; items: Media[] }) {
  return (
    <div className="v3-strip" role="group" aria-label="Campaign sequence">
      <div className="v3-strip-row">
        {items.map((m, i) => (
          <div key={m.id} className="v3-strip-item" data-drift={[1, -1, 0.6, -0.6][i % 4]} style={{ "--k": i } as CSSProperties}>
            <Frame project={project} media={m} dir="up" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-bleed project film. Uses the real video when given, otherwise the prototype plate. */
function Film({ project, media }: { project: Project; media: Media }) {
  return (
    <div className="v3-film">
      <figure className="v3-film-fr">
        <div className="v3-fr-mask" data-reveal data-dir="up">
          <div className="v3-fr-pl" data-par>
            {media.video ? <video className="v3-plate" src={media.video} poster={media.src} autoPlay muted loop playsInline aria-label={media.alt} style={media.pos ? { objectPosition: media.pos } : undefined} /> : <Plate media={media} project={project} ratio={1.78} />}
          </div>
        </div>
        <figcaption className="v3-film-cap"><b>{media.tag}</b><span>{media.title}</span></figcaption>
      </figure>
    </div>
  );
}
