"use client";

import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { Project } from "@/content/work-v3/types";
import { Hero } from "./Hero";
import { Story } from "./Story";
import { Work } from "./Work";
import { Handoff } from "./Handoff";
import { setupMotion } from "./motion";
import "./v3.css";

/**
 * Project Details V3 — "The Living Case Study".
 * Hero (frame break) → Story (editorial shift) → Work (quiet compositions, Living Canvas, bridge, creative detail) → Handoff (next world).
 * The first <section> inside <main id="top"> is the hero on purpose: the existing site header treats it as the page's hero
 * and stays transparent over it, exactly as on the homepage.
 */
export function ProjectPageV3({ project, next }: { project: Project; next: Project }) {
  const style = { "--p-g": project.palette[0], "--p-d": project.palette[1], "--p-s": project.palette[2], "--p-k": project.palette[3] } as CSSProperties;
  return (
    <>
      <Curtain />
      <main id="top" className={`v3${project.hero ? " v3-real" : ""}`} style={style} data-project={project.slug}>
        <Hero project={project} />
        <Story project={project} />
        <Work project={project} />
        <Handoff project={project} next={next} />
      </main>
    </>
  );
}

/** Arrival half of the project-to-project transition: the previous page leaves a colour behind; wipe it away. */
function Curtain() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    let color: string | null = null;
    try { color = sessionStorage.getItem("rmz-v3-curtain"); } catch { /* ignore */ }
    if (!el || !color) return;
    const { gsap } = setupMotion();
    el.style.background = color;
    el.style.display = "block";
    el.style.clipPath = "inset(0% 0% 0% 0%)";
    const t = gsap.to(el, {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 0.95,
      delay: 0.12,
      ease: "rmzInOut",
      onComplete: () => {
        el.style.display = "none";
        try { sessionStorage.removeItem("rmz-v3-curtain"); } catch { /* ignore */ }
      },
    });
    return () => { t.kill(); };
  }, []);
  return <div ref={ref} className="v3-curtain" aria-hidden="true" />;
}
