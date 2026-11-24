"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heading, Logo, optical, useMedia, type CollabProps, type Partner } from "./shared";

const SLOTS = 6;
const SLIDE_MS = 800;

/** Deterministic, irregular schedule: the same sequence every visit. Intervals 3.0–5.6 s between single swaps, slots visited in seeded shuffled rounds (never the same slot twice in a row). */
function makeSchedule(rounds: number) {
  let seed = 20240607;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const events: { slot: number; wait: number }[] = [];
  let last = -1;
  for (let r = 0; r < rounds; r++) {
    const order = [0, 1, 2, 3, 4, 5];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order[0] === last) [order[0], order[1]] = [order[1], order[0]];
    for (const slot of order) events.push({ slot, wait: Math.round(3000 + rnd() * 2600) });
    last = order[order.length - 1];
  }
  return events;
}
const SCHEDULE = makeSchedule(8);

type Slot = { cur: number; prev: number | null; k: number };

/**
 * A — THE SWITCHBOARD. Six borderless positions, each holding one logo. Now and then ONE position hands its logo over to a partner that is not on show, with a short vertical masked
 * slide (about 0.8 s). The order and timing are irregular but fixed (a seeded schedule), a position keeps its logo for ~20 s, and two never change together. A visible Pause/Play
 * control exists; the board also stops while it is off screen or the tab is hidden. "View all" opens the complete static roster in the page flow. Reduced motion (or too few logos to
 * swap) shows the complete static roster only.
 */
export function CollabA({ label, headingLead, headingEmphasis, partners, reduced }: CollabProps) {
  const phone = useMedia("(max-width: 767px)");
  const swap = !reduced && partners.length > SLOTS;
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [slots, setSlots] = useState<Slot[]>(() => partners.slice(0, SLOTS).map((_, i) => ({ cur: i, prev: null, k: 0 })));
  const [queue, setQueue] = useState<number[]>(() => partners.map((_, i) => i).slice(SLOTS));
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const running = swap && !paused && inView && !hidden;

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    if (root.current) io.observe(root.current);
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    vis();
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  useEffect(() => {
    if (!running) return;
    const ev = SCHEDULE[step % SCHEDULE.length];
    const t = window.setTimeout(() => {
      const incoming = queue[0];
      if (incoming === undefined) return;
      setSlots((s) => s.map((x, i) => (i === ev.slot ? { cur: incoming, prev: x.cur, k: x.k + 1 } : x)));
      setQueue((q) => [...q.slice(1), slots[ev.slot].cur]);
      setStep((n) => n + 1);
      window.setTimeout(() => setSlots((s) => s.map((x, i) => (i === ev.slot ? { ...x, prev: null } : x))), SLIDE_MS + 60);
    }, ev.wait);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queue/slots are read when the timer fires; the schedule advances with `step`
  }, [running, step]);

  const area = phone ? 5200 : 9200;
  const w = (p: Partner) => optical(p, area, phone ? 96 : 130, phone ? 168 : 300, phone ? 64 : 92);
  const shown = swap ? slots : partners.slice(0, SLOTS).map((_, i) => ({ cur: i, prev: null, k: 0 }));
  const roster = useMemo(() => partners, [partners]);

  return (
    <section className="cb cb-a" aria-labelledby="cb-a-h">
      <div className="cb-wrap" ref={root}>
        <div className="cb-a-top">
          <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
          {swap && (
            <div className="cb-a-ctl">
              <button type="button" className="cb-ctl" aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">{paused ? <path d="M1 0 9 5 1 10Z" /> : <><rect x="1" y="0" width="3" height="10" /><rect x="6" y="0" width="3" height="10" /></>}</svg>
                {paused ? "Play" : "Pause"}
              </button>
            </div>
          )}
        </div>
        {!reduced && (
          <ul className="cb-sw-board" aria-label="Collaborations — a selection (the complete list is under View all)">
            {shown.map((s, i) => (
              <li key={i} className="cb-sw-slot">
                {s.prev !== null && <div className="cb-sw-layer is-out" aria-hidden="true"><Logo p={partners[s.prev]} width={w(partners[s.prev])} /></div>}
                <div key={s.k} className={`cb-sw-layer${s.k > 0 ? " is-in" : ""}`}><Logo p={partners[s.cur]} width={w(partners[s.cur])} /></div>
              </li>
            ))}
          </ul>
        )}
        {!reduced && (
          <div className="cb-a-all">
            <button type="button" className="cb-ctl" aria-expanded={open} aria-controls="cb-a-roster" onClick={() => setOpen((v) => !v)}>{open ? "Hide all" : "View all"}<span aria-hidden="true">{open ? "−" : "+"}</span></button>
          </div>
        )}
        <ul id="cb-a-roster" className="cb-sw-roster" hidden={!reduced && !open} aria-label="All collaborations">
          {roster.map((p) => (
            <li key={p.name}><Logo p={p} width={optical(p, phone ? 3600 : 5200, phone ? 78 : 104, phone ? 140 : 210, phone ? 54 : 66)} /></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
