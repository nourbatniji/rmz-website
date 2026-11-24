"use client";

import { useEffect, useRef, useState } from "react";
import { Heading, Logo, optical, useMedia, type CollabProps } from "./shared";

/**
 * B — THE TURNING WALL. A shallow wall of logo positions, no cards, no borders. When the wall scrolls into view each position makes ONE restrained turn from its dark reverse to its logo
 * face, in a composed, slightly staggered order; then the whole wall rests. A pointer can gently tip a position (the logo never hides). Not the hero's prism, not pinned. Without
 * JavaScript, or with reduced motion, the logo faces are simply there — the "reverse" state is only ever applied by script.
 */
export function CollabB({ label, headingLead, headingEmphasis, partners, reduced }: CollabProps) {
  const phone = useMedia("(max-width: 767px)");
  const [wall, setWall] = useState<"face" | "pre" | "go" | "rest">("face");
  const root = useRef<HTMLUListElement>(null);
  const cols = phone ? 2 : 4;
  useEffect(() => {
    if (reduced || !root.current || typeof IntersectionObserver === "undefined") return;
    const t0 = window.setTimeout(() => setWall("pre"), 0); // reverse faces are prepared by script only
    let done = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done) return;
      done = true;
      io.disconnect();
      setWall("go");
      window.setTimeout(() => setWall("rest"), 2200);
    }, { threshold: 0.3 });
    io.observe(root.current);
    return () => { window.clearTimeout(t0); io.disconnect(); setWall("face"); };
  }, [reduced, partners.length]);
  return (
    <section className="cb cb-b" aria-labelledby="cb-b-h" data-wall={wall}>
      <div className="cb-wrap">
        <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
        <ul ref={root} className={`cb-tw-wall${partners.length < 7 ? " is-few" : ""}`} style={{ ["--cols" as string]: cols }}>
          {partners.map((p, i) => {
            const r = Math.floor(i / cols), c = i % cols;
            const d = c * 90 + r * 150 + ((i * 53) % 130); // composed, slightly irregular, always the same
            return (
              <li key={p.name} className="cb-tw-pos" style={{ ["--d" as string]: `${d}ms` }}>
                <div className="cb-tw-in">
                  <div className="cb-tw-face"><Logo p={p} width={optical(p, phone ? 5200 : 9000, phone ? 96 : 130, phone ? 160 : 280, phone ? 62 : 88)} /></div>
                  <div className="cb-tw-back" aria-hidden="true" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
