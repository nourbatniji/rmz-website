"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CollectiveContent, CollectivePartner } from "@/content/closing-types";
import { useEntrance } from "@/lib/use-entrance";
import { useFit } from "@/lib/use-fit";
import { SLOTS } from "./layout";
import { WORDMARKS, Wordmark } from "./wordmarks";
import "./collective.css";

/**
 * Collaborations — "A · The Collective" (canvas CollabA-e01 desktop 1440×900 artboard; "Mobile08c Drift Rails" for < 1024px).
 * Twelve single-colour marks scattered over the board. Hover / focus / tap a mark: it lights up, the others dim, and the caption names it.
 * Click / tap pins it (click again or Esc to clear). The marks gather in once when the section is reached (useEntrance → data-entrance).
 */
const two = (n: number) => String(n + 1).padStart(2, "0");
const DUR = [46, 58, 50]; // seconds per drift loop, one per rail

export function Collective({ content }: { content: CollectiveContent }) {
  const rootRef = useRef<HTMLElement>(null);
  const dWrap = useRef<HTMLDivElement>(null);
  const dBox = useRef<HTMLDivElement>(null);
  const railsRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(-1);
  const [pin, setPin] = useState(-1);
  const partners = content.partners.slice(0, SLOTS.length);
  const active = hover >= 0 ? hover : pin;
  const cur = active >= 0 ? partners[active] : null;

  useEntrance(rootRef, { threshold: 0.35, playMs: 2500, repeat: true });
  useFit(dWrap, dBox, 1440);

  const rails = [0, 1, 2].map((r) => partners.map((_, i) => i).slice(r * 4, r * 4 + 4));
  const swipe = useRef<number | null>(null);
  const fitW = (p: CollectivePartner, maxW: number, maxH: number) => {
    const w = p.logo?.width ?? WORDMARKS[p.mark].w;
    const h = p.logo?.height ?? WORDMARKS[p.mark].h;
    return Math.min(maxW, (maxH * w) / h);
  };
  // pick a partner on a touch screen: pause the drift, open the sheet and bring the rails above it
  const select = useCallback((i: number) => {
    setPin(i);
    if (i < 0) return;
    const el = railsRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top > 120 || top < 0) window.scrollBy({ top: top - 90, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  const mark = (p: CollectivePartner, width: number) =>
    p.logo ? (
      // eslint-disable-next-line @next/next/no-img-element -- approved partner artwork, sized by the board slot
      <img src={p.logo.src} alt={p.name} width={width} height={(width * p.logo.height) / p.logo.width} loading="lazy" decoding="async" />
    ) : (
      <Wordmark id={p.mark} width={width} label={p.name} />
    );

  const items = () =>
    partners.map((p, i) => {
      const s = SLOTS[i];
      const style = {
        left: s.dx,
        top: s.dy,
        "--sx": `${s.sx}px`,
        "--sy": `${s.sy}px`,
        "--sr": `${s.sr}deg`,
        "--d": `${s.d}ms`,
      } as CSSProperties;
      return (
        <div key={p.name} className={`cl-it${i === active ? " sel" : ""}`} style={style}>
          <span className="cl-ix" aria-hidden="true">{two(i)}</span>
          <button
            type="button"
            className="cl-b"
            aria-pressed={pin === i}
            aria-label={`${p.name}, ${p.role}${p.copyStatus === "placeholder" ? " (placeholder)" : ""}`}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(i)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(-1)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(-1)}
            onClick={() => setPin((v) => (v === i ? -1 : i))}
          >
            {mark(p, s.dw)}
          </button>
        </div>
      );
    });

  const caption = (hint: string) => (
    <>
      <div className="cl-cn" style={{ opacity: cur ? 1 : 0.5 }} aria-live="polite">{cur ? cur.name : hint}</div>
      <div className="cl-cr">{cur?.role}</div>
      <div className="cl-cx">{cur ? (cur.copyStatus === "placeholder" ? content.partnerLine : "") : ""}</div>
    </>
  );

  return (
    <section
      ref={rootRef}
      id="collaborations"
      aria-labelledby="cl-h"
      className={`cl-root${active >= 0 ? " has" : ""}`}
      onKeyDown={(e) => { if (e.key === "Escape") { setPin(-1); setHover(-1); } }}
    >
      {/* ── Desktop: the 1440 × 900 artboard, scaled to the width ── */}
      <div ref={dWrap} className="cl-dwrap">
        <div ref={dBox} className="cl-dbox">
          <p className="cl-hd cl-label" style={{ left: 64, top: 56 }}>{content.label}</p>
          <h2 id="cl-h" className="cl-hd cl-h" style={{ left: 64, top: 92, width: 1000, ["--hd" as string]: "100ms" }}>
            {content.headingLead} <span className="cl-iv">{content.headingEmphasis}</span>
          </h2>
          <p className="cl-hd cl-intro" style={{ left: 1000, top: 100, width: 376, ["--hd" as string]: "200ms" }}>{content.intro}</p>
          {items()}
          <div className="cl-cap">{caption(content.hint)}</div>
          <p className="cl-note" style={{ left: 64, top: 866 }}>{content.placeholderNote}</p>
        </div>
      </div>

      {/* ── Mobile / tablet (< 1024 px): three marks rails drifting in alternating directions; tap a mark to pause and open a bottom sheet ── */}
      <div className="cl-mob">
        <div className="cl-mhd">
          <p className="cl-hd cl-label">{content.label}</p>
          <p className="cl-hd cl-h" style={{ ["--hd" as string]: "100ms" }} aria-hidden="true">
            {content.headingLead} <span className="cl-iv">{content.headingEmphasis}</span>
          </p>
          <p className="cl-hd cl-intro" style={{ ["--hd" as string]: "200ms" }}>{content.introTouch}</p>
        </div>
        <p className="cl-hd cl-label cl-mdrift" style={{ ["--hd" as string]: "300ms" }}>Drifting · tap to pause</p>
        <div ref={railsRef} className="cl-rails">
          {rails.map((ids, r) => (
            <div key={r} className="cl-rail cl-it-rail" style={{ ["--d" as string]: `${r * 160}ms` } as CSSProperties}>
              <ul className="cl-tr" style={{ animationDuration: `${DUR[r]}s`, animationDirection: r % 2 ? "reverse" : "normal" }}>
                {[0, 1].map((copy) =>
                  ids.map((i) => {
                    const p = partners[i];
                    return (
                      <li key={`${copy}-${p.name}`} className={`cl-ri${i === pin ? " sel" : ""}`} aria-hidden={copy ? true : undefined}>
                        <button
                          type="button"
                          className="cl-b"
                          tabIndex={copy ? -1 : 0}
                          aria-pressed={pin === i}
                          aria-label={`${p.name}, ${p.role}${p.copyStatus === "placeholder" ? " (placeholder)" : ""}`}
                          onClick={() => select(pin === i ? -1 : i)}
                        >
                          {mark(p, fitW(p, 210, 58))}
                        </button>
                      </li>
                    );
                  }),
                )}
              </ul>
            </div>
          ))}
        </div>
        <p className="cl-note cl-mnote">{content.placeholderNote}</p>
        <div className="cl-sheetwrap">
          <div className="cl-sheet" role="dialog" aria-label="Partner detail" aria-hidden={!cur} inert={!cur}
            onTouchStart={(e) => { swipe.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (swipe.current == null) return;
              const dx = e.changedTouches[0].clientX - swipe.current;
              swipe.current = null;
              if (Math.abs(dx) > 50 && pin >= 0) select((pin + (dx < 0 ? 1 : partners.length - 1)) % partners.length);
            }}>
            <div className="cl-sh-top">
              <span className="cl-label cl-sh-n">{pin >= 0 ? `${two(pin)} / ${String(partners.length).padStart(2, "0")}` : ""}</span>
              <button type="button" className="cl-b44" onClick={() => select(-1)} aria-label="Close and resume drift">Close ✕</button>
            </div>
            <div className="cl-sh-big">{cur ? mark(cur, fitW(cur, 300, 90)) : null}</div>
            <div className="cl-sh-cn" aria-live="polite">{cur?.name}</div>
            <div className="cl-sh-cr">{cur?.role}</div>
            <div className="cl-sh-cx">{cur && cur.copyStatus === "placeholder" ? content.partnerLine : ""}</div>
            <div className="cl-sh-nav">
              <button type="button" className="cl-b44" onClick={() => select((pin + partners.length - 1) % partners.length)} aria-label="Previous partner">← Prev</button>
              <button type="button" className="cl-b44" onClick={() => select((pin + 1) % partners.length)} aria-label="Next partner">Next →</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
