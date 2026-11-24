"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/content/work-v3/types";
import { accent, MQ, setupMotion } from "./motion";

/**
 * PART 02 — THE EDITORIAL SHIFT. One transition, not six.
 *  Start    the statement owns the width of the page, huge, with nothing beside it.
 *  Trigger  the section scrolling into view (scrubbed, no pin).
 *  Middle   the statement settles to the left column while the facts and brief slide into the freed right column.
 *  End      a balanced two-column editorial layout; everything readable; nothing moves after that.
 */
export function Story({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const { gsap, ScrollTrigger } = setupMotion();
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
      const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
      if (!motion) return;
      const lead = el.querySelector<HTMLElement>("[data-lead]")!;
      const info = el.querySelector<HTMLElement>("[data-info]")!;
      const rows = el.querySelectorAll<HTMLElement>("[data-row]");
      const rule = el.querySelector<HTMLElement>("[data-rule]")!;
      const tl = gsap.timeline({
        defaults: { ease: "rmzInOut" },
        scrollTrigger: { trigger: el, start: "top 78%", end: desktop ? "top 8%" : "top 20%", scrub: 0.5, invalidateOnRefresh: true },
      });
      tl.fromTo(lead, { scale: desktop ? 1.78 : 1.16, y: desktop ? "5vh" : 0 }, { scale: 1, y: 0, duration: 1, transformOrigin: "0% 0%" }, 0)
        .fromTo(info, { x: desktop ? 90 : 0, y: desktop ? 0 : 40, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.8, ease: "rmz" }, 0.28)
        .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, transformOrigin: "0 50%" }, 0.3)
        .fromTo(rows, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "rmz" }, 0.4);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => mm.revert();
  }, []);

  const facts: [string, string][] = [
    ["Client", project.client ?? "Name pending"],
    ["Project", project.name],
    ["Year", project.year],
    ["Services", project.services.join(", ")],
  ];
  const blocks: [string, string][] = [
    ["Brief", project.brief],
    ["Challenge", project.challenge],
    ["Solution", project.solution],
  ];

  return (
    <section ref={root} className="v3-story" id="story" aria-label="Project overview">
      <div className="v3-story-grid">
        <div className="v3-story-leadwrap">
          <p className="v3-lead" data-lead>
            {accent(project.lead).map((p, i) => (p.em ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>))}
          </p>
        </div>
        <div className="v3-story-info" data-info>
          <div className="v3-rule" data-rule />
          <dl className="v3-facts">
            {facts.map(([k, v]) => (
              <div key={k} data-row>
                <dt>{k}</dt>
                <dd className={k === "Client" && !project.client ? "v3-pending" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="v3-brief">
            {blocks.map(([k, v], i) => (
              <div key={k} data-row>
                <h2><span>{String(i + 1).padStart(2, "0")}</span>{k}</h2>
                <p>{v}</p>
              </div>
            ))}
          </div>
          {project.placeholder && (
            <p className="v3-proto" data-row>Prototype — copy is placeholder and imagery is borrowed from the RMZ homepage; no client results or credits are claimed.</p>
          )}
        </div>
      </div>
    </section>
  );
}
