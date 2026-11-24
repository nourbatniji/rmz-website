"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Caption, Entry, Heading, Logo, optical, useMedia, useSelect, type CollabProps } from "./shared";

const GAP = 96; // px between marks in the ribbon
const SPEED = 30; // px per second — slow

/**
 * B — CONTINUOUS RIBBON. One horizontal line of marks drifting slowly and seamlessly to the left: no track, no container, no fade. Hover or keyboard focus pauses it and names the
 * mark in the reserved caption line beneath; there is also an explicit Pause / Play control. Reduced motion, or too few marks to fill the width without an obvious repeat, shows a
 * calm static arrangement instead of a loop.
 */
export function CollabB({ label, headingLead, headingEmphasis, hint, partnerLine, placeholderNote, partners, reduced }: CollabProps) {
  const { active, pin, bind } = useSelect();
  const phone = useMedia("(max-width: 767px)");
  const [paused, setPaused] = useState(false);
  const [vw, setVw] = useState(1440);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setVw(e.contentRect.width));
    if (root.current) ro.observe(root.current);
    return () => ro.disconnect();
  }, []);
  const widths = useMemo(() => partners.map((p) => optical(p, phone ? 4200 : 5600, phone ? 78 : 96, phone ? 140 : 210, phone ? 56 : 60)), [partners, phone]);
  const gap = phone ? 56 : GAP;
  const total = widths.reduce((a, w) => a + w + gap, 0);
  const loop = !reduced && total > vw * 1.35; // enough marks to fill the width twice over; otherwise no loop
  const cur = active >= 0 ? partners[active] : null;
  const stop = paused || active >= 0 || pin >= 0;
  const row = (copy: number) =>
    partners.map((p, i) => (
      <li key={`${copy}-${p.name}`} className="cb-b-item" style={{ marginRight: gap }} aria-hidden={copy ? true : undefined}>
        {copy ? (
          <span className="cb-entry" aria-hidden="true"><Logo p={p} width={widths[i]} /></span>
        ) : (
          <Entry p={p} i={i} bind={bind} pressed={pin === i}><Logo p={p} width={widths[i]} /></Entry>
        )}
      </li>
    ));
  return (
    <section className={`cb cb-b${active >= 0 ? " has" : ""}`} aria-labelledby="cb-b-h">
      <div className="cb-wrap"><Heading label={label} lead={headingLead} emphasis={headingEmphasis} /></div>
      <div ref={root} className={`cb-b-ribbon${loop ? "" : " is-static"}${stop ? " is-paused" : ""}`}>
        <ul className="cb-b-track" style={loop ? ({ ["--dur" as string]: `${Math.round(total / SPEED)}s` } as React.CSSProperties) : undefined}>
          {row(0)}
          {loop && row(1)}
        </ul>
      </div>
      <div className="cb-wrap cb-b-foot">
        <Caption cur={cur} hint={hint} line={partnerLine} />
        {loop && (
          <button type="button" className="cb-b-pause" aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">{paused ? <path d="M1 0 9 5 1 10Z" /> : <><rect x="1" y="0" width="3" height="10" /><rect x="6" y="0" width="3" height="10" /></>}</svg>
            {paused ? "Play" : "Pause"}
          </button>
        )}
        <p className="cb-note">{placeholderNote}</p>
      </div>
    </section>
  );
}
