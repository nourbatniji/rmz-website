"use client";

import "./statement.css";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { StatementContent } from "@/content/types";
import { useMedia, useTabHidden } from "@/lib/use-media";

/**
 * StatementRotator — a fixed sentence whose final word rotates (approved canvas: "HOME - TEXT SECTION").
 *
 * Timing is the source timing: the whole sentence animates in once (intro), then every ~3 s only the last
 * word leaves (letters exit at 2.3 s) and the next enters (swap at 3.0 s). The first cycle is 1.8 s longer
 * because of the intro, exactly as in the source.
 *
 * - Runs only while the section is ≥45 % visible AND the tab is active; leaving the viewport returns it to a
 *   static first-word state, re-entering replays the intro (as in the source). A hidden tab pauses in place.
 * - All candidate words occupy one grid cell, so the slot is as wide as the longest word: no layout jumps.
 * - Reduced motion: static, readable statement; no rotation, bar or counter.
 * - Screen readers get ONE static sentence listing every word; the animated copy is aria-hidden, so changing
 *   words are never repeatedly announced.
 * - Mobile (<768px) is a first-pass adaptation, PENDING DESIGN REVIEW: larger type, first line may wrap.
 */

const BASE = 260; // first fixed word delay (ms)
const STEP = 120; // delay between fixed words (ms)
const FIRST_EXTRA = 1800; // intro lengthens the first cycle
const OUT_AT = 2300;
const SWAP_AT = 3000;
const CYCLE = 3000;

const joinWords = (w: string[]) => (w.length < 2 ? w.join("") : `${w.slice(0, -1).join(", ")} or ${w[w.length - 1]}`);

function Letters({ word, enter, exit }: { word: string; enter: number; exit: number }) {
  return (
    <>
      {word.split("").map((c, j) => (
        <span key={j} className="stm-lt" style={{ "--d": `${enter + j * 55}ms`, "--x": `${exit + j * 26}ms` } as CSSProperties}>
          {c}
        </span>
      ))}
    </>
  );
}

type Phase = "idle" | "in" | "out";

function Stage({
  statement,
  active,
  tabActive,
  showProgress,
}: {
  statement: StatementContent;
  active: boolean;
  tabActive: boolean;
  showProgress: boolean;
}) {
  const { lead, connector, words } = statement;
  const n = words.length;
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(active ? "idle" : "in");
  const [entered, setEntered] = useState(!active);
  const [looped, setLooped] = useState(false); // false during the first (intro) cycle
  const phaseRef = useRef<Phase>(active ? "idle" : "in");

  // Intro: start from the hidden state, then add `.in` two frames later so the transitions play.
  useEffect(() => {
    if (!active) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        phaseRef.current = "in";
        setPhase("in");
        setEntered(true);
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [active]);

  // Word cycle. Re-runs on every word change; pausing (hidden tab) clears the timers, resuming reschedules.
  useEffect(() => {
    if (!active || !tabActive || !entered) return;
    const x = looped ? 0 : FIRST_EXTRA;
    const swap = () => {
      phaseRef.current = "in";
      setPhase("in");
      setLooped(true);
      setIdx((i) => i + 1);
    };
    let t1 = 0;
    let t2 = 0;
    if (phaseRef.current === "in") {
      t1 = window.setTimeout(() => {
        phaseRef.current = "out";
        setPhase("out");
      }, OUT_AT + x);
      t2 = window.setTimeout(swap, SWAP_AT + x);
    } else if (phaseRef.current === "out") {
      t2 = window.setTimeout(swap, 450); // resumed mid-exit: finish the swap
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active, tabActive, entered, idx, looped]);

  const cur = idx % n;
  const fixedCount = lead.length + connector.length;
  const letterBase = looped ? 0 : BASE + fixedCount * STEP + 90;
  let k = 0;
  const fixed = (w: string) => (
    <span key={`${w}-${k}`} className="stm-w" style={{ "--d": `${BASE + k++ * STEP}ms` } as CSSProperties}>
      {w}
    </span>
  );

  return (
    <div className={`stm-stage ${active ? "stm-on" : "stm-st"}`}>
      <div className={`stm-txt ${active ? "intro" : "static"} ${entered ? "in" : ""}`}>
        <div className="stm-ln">
          <span className="stm-lni">{lead.map((w, i) => (i ? [" ", fixed(w)] : fixed(w)))}</span>
        </div>
        <div className="stm-ln">
          <span className="stm-lni">
            {connector.map((w) => [fixed(w), " "])}
            <span className="stm-slot">
              {words.map((w, i) => (
                <span key={w} className={`stm-w stm-lw ${i === cur ? (phase === "in" ? "in" : phase === "out" ? "out" : "") : ""}`}>
                  <Letters word={w} enter={letterBase} exit={0} />
                </span>
              ))}
            </span>
          </span>
        </div>
      </div>
      {showProgress && (
        <div className="stm-lab stm-foot">
          <p className="stm-count t-meta" aria-hidden="true">
            {String(cur + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </p>
          <div className="stm-track" aria-hidden="true">
            {active && entered && (
              <span
                key={idx}
                className="stm-bar"
                style={{ animationDuration: `${CYCLE + (looped ? 0 : FIRST_EXTRA)}ms`, animationPlayState: tabActive ? "running" : "paused" }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatementRotator({ statement }: { statement: StatementContent }) {
  const { lead, connector, words } = statement;
  const reduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const tabHidden = useTabHidden();
  const [inView, setInView] = useState(false);
  const [fs, setFs] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // Section visibility (≥45 % in view starts it; fully leaving stops it, as in the source).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.45) setInView(true);
          else if (!e.isIntersecting) setInView(false);
        }
      },
      { threshold: [0, 0.45, 0.75] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Fit: largest size ≤ the source's 116px (scaled below 1440) at which the widest line fits.
  // Measured on a hidden 100px copy that includes the LONGEST rotating word, so it never needs re-fitting.
  useEffect(() => {
    const root = rootRef.current;
    const m = measureRef.current;
    if (!root || !m) return;
    const fit = () => {
      const W = Math.min(root.clientWidth, 1440);
      const gutter = W >= 768 ? 64 : 20;
      const avail = Math.max(240, W - gutter * 2);
      const wrap = W < 768;
      const lineA = m.querySelector<HTMLElement>("[data-a]")!.offsetWidth;
      const lineB = m.querySelector<HTMLElement>("[data-b]")!.offsetWidth;
      const widestLeadWord = Math.max(...[...m.querySelectorAll<HTMLElement>("[data-lw]")].map((e) => e.offsetWidth));
      const need = Math.max(wrap ? widestLeadWord : lineA, lineB); // px at 100px font-size
      let size = wrap ? Math.min(72, (avail * 100) / need) : 116 * Math.min(1, W / 1440);
      if (!wrap && (need * size) / 100 > avail) size = (size * avail) / ((need * size) / 100);
      setFs(Math.floor(size * 10) / 10);
      root.classList.toggle("stm-wrap", wrap);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    fit();
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [statement]);

  const active = inView && !reduced;
  const sentence = `${[...lead, ...connector].join(" ")} ${joinWords(words)}.`;

  return (
    <section
      ref={rootRef}
      id="statement"
      aria-labelledby={headingId}
      className="stm-root"
      style={fs ? ({ "--stm-fs": `${fs}px` } as CSSProperties) : undefined}
    >
      {/* One static sentence for assistive tech; the animated copy below is hidden from it. */}
      <h2 id={headingId} className="sr-only">
        {sentence}
      </h2>

      <div aria-hidden="true" ref={measureRef} className="stm-measure">
        <span data-a="" className="inline-block">
          {lead.map((w, i) => (
            <span key={i} data-lw="" className="inline-block">
              {w}
              {i < lead.length - 1 ? " " : ""}
            </span>
          ))}
        </span>
        <span data-b="" className="inline-block">
          {connector.join(" ")}{" "}
          <span className="stm-slot">
            {words.map((w) => (
              <span key={w} className="stm-lw" style={{ gridArea: "1 / 1" }}>
                {w}
              </span>
            ))}
          </span>
        </span>
      </div>

      <div aria-hidden="true" className="contents">
        <Stage key={active ? "run" : "static"} statement={statement} active={active} tabActive={!tabHidden} showProgress={!reduced} />
      </div>
    </section>
  );
}
