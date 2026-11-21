"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { FeaturedWorkContent, FeaturedWorkItem } from "@/content/types";
import { LiquidImageFx } from "./liquid-image";
import { DESKTOP_BOX, MOBILE_BOX, clamp, deskPose, mobPose } from "./featured-pose";
import "./featured.css";

/**
 * FeaturedWorkFocus — canvas board "HOME - ABOUT SECTION" (titled About; designed as selected work).
 *
 * A pinned stage. Native page scroll through its (reserved-height) track drives ONE continuous step position `s`:
 * even → odd = the centred card turns from its image (front) to its description (back); odd → even = the wall moves on to the next card.
 * Scrolling back reverses exactly. `s` is a pure function of scroll position, lightly smoothed (damped, rAF only while it differs from
 * the target; snaps to the exact value and stops). No wheel capture, no scroll locking, no click-to-continue; the track simply scrolls.
 * Reduced motion and no-JS show a readable static list instead (CSS). See docs/featured-work-section.md.
 */

const DESKTOP = "(min-width: 1024px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const TAU = 55; // ms — damping time constant: ≈ 95 % of a change in ≈ 165 ms
const SNAP = 0.002; // steps (≈ 1 px of scroll)
const JUMP = 1.4; // steps in one frame → show the position immediately (anchors, fast flicks)
const MAX_SCALE = 1.25;

const two = (n: number) => String(n).padStart(2, "0");

function Face({ item, n, pending }: { item: FeaturedWorkItem; n: number; pending: string }) {
  return (
    <>
      <div className="fw-face fw-front">
        <div className="fw-img" style={{ "--c": item.placeholderColor } as CSSProperties}>
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- fixed-ratio decorative card face, sized by the stage
            <img src={item.image.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: item.imagePosition }} />
          ) : (
            <span className="fw-pend">{pending}</span>
          )}
        </div>
        <div className="fw-strip">
          <b>
            {item.number} {item.name}
          </b>
          {item.copyStatus === "placeholder" && <u>Demo</u>}
        </div>
      </div>
      <div className="fw-face fw-back">
        <div className="fw-inner">
          <div className="fw-btop">
            <span>{item.category}</span>
            <span>
              {item.number} / {two(n)}
            </span>
          </div>
          <h3 className="fw-bh">{item.name}</h3>
          <p className="fw-bp">{item.description}</p>
          <div className="fw-bfoot">
            <span>{item.copyStatus === "placeholder" ? "Placeholder copy · demo project" : ""}</span>
            <span className="fw-bbtn">Open case</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function FeaturedWorkFocus({ content }: { content: FeaturedWorkContent }) {
  const { items } = content;
  const n = items.length;
  const last = n * 2 - 1; // final step position (state index)
  const uid = useId();
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const mobileRef = useRef(false);
  const lastRef = useRef(0); // latest step state (for the controls)
  const [step, setStep] = useState(0); // rounded step state: counter, readout, list highlight, button states
  const [announce, setAnnounce] = useState("");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    const box = boxRef.current;
    if (!root || !track || !stage || !box) return;
    const cards = [...root.querySelectorAll<HTMLElement>("[data-fw-card]")].map((card) => ({
      card,
      flip: card.querySelector<HTMLElement>(".fw-turn")!,
      front: card.querySelector<HTMLElement>(".fw-front")!,
      back: card.querySelector<HTMLElement>(".fw-back")!,
      img: card.querySelector<HTMLElement>(".fw-img")!,
      inner: card.querySelector<HTMLElement>(".fw-inner")!,
    }));
    const desktop = window.matchMedia(DESKTOP);
    const reduced = window.matchMedia(REDUCED);
    const hoverQ = window.matchMedia("(hover: hover) and (pointer: fine)");
    let fx: LiquidImageFx | null = null; // one shared WebGL renderer, created on first use (desktop, fine pointer, motion allowed)
    let hh = 92;
    let raf = 0;
    let lastT = 0;
    let cur = -1;
    let shown = -1;
    let mode: "desk" | "mob" | null = null;

    const enabled = () => !reduced.matches;
    const fit = () => {
      hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
      const mob = !desktop.matches;
      mobileRef.current = mob;
      setMobile(mob);
      const b = mob ? MOBILE_BOX : DESKTOP_BOX;
      const sw = stage.clientWidth;
      const sh = stage.clientHeight;
      const sc = Math.min(sw / b.w, sh / b.h, MAX_SCALE);
      box.style.transform = `translate(${((sw - b.w * sc) / 2).toFixed(2)}px, ${((sh - b.h * sc) / 2).toFixed(2)}px) scale(${sc.toFixed(5)})`;
    };
    const stepPx = () => (track.offsetHeight - stage.offsetHeight) / last;
    const target = () => clamp((hh - track.getBoundingClientRect().top) / stepPx(), 0, last);

    const paint = (s: number) => {
      const mob = mobileRef.current;
      const m = mob ? "mob" : "desk";
      cards.forEach((c, j) => {
        const p = mob ? mobPose(j, s, n) : deskPose(j, s, n);
        c.card.style.cssText = p.card;
        c.flip.style.transform = p.flip;
        c.front.style.visibility = p.backShown ? "hidden" : "visible";
        c.back.style.visibility = p.backShown ? "visible" : "hidden";
        if (!mob) {
          c.img.style.height = `${p.imgH}px`;
          c.inner.style.cssText = p.inner!;
        } else if (mode !== m) {
          c.img.style.removeProperty("height");
          c.inner.style.cssText = "";
        }
      });
      mode = m;
      // Liquid image effect: only on the centred, front-facing, settled card (both its 3D angle and the wall position are at rest) — otherwise off + reset.
      const rs = Math.round(s);
      const act = !mob && hoverQ.matches && !reduced.matches && rs % 2 === 0 && Math.abs(s - rs) < 0.02 ? rs / 2 : -1;
      if (act >= 0 && cards[act].img.querySelector("img")) {
        fx ??= new LiquidImageFx();
        fx.setActive(cards[act].img);
      } else fx?.setActive(null);
      if (barRef.current) barRef.current.style.width = `${((s / last) * 100).toFixed(2)}%`;
      const r = Math.round(s);
      if (r !== shown) {
        shown = r;
        lastRef.current = r;
        setStep(r);
      }
    };
    const write = (v: number) => {
      cur = v;
      paint(v);
    };
    const off = () => {
      fx?.setActive(null);
      cancelAnimationFrame(raf);
      raf = 0;
      cur = -1;
      delete root.dataset.ready;
    };
    const tick = (now: number) => {
      raf = 0;
      if (!enabled()) return off();
      const t = target();
      const dt = lastT ? now - lastT : 16;
      lastT = now;
      if (cur < 0 || dt > 100 || Math.abs(t - cur) > JUMP) return write(t); // first paint, stalled frame or large jump: immediate
      const d = t - cur;
      if (Math.abs(d) <= SNAP) return write(t); // settled: exact position, loop stops
      write(cur + d * (1 - Math.exp(-dt / TAU)));
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf && enabled()) {
        lastT = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const resnap = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!enabled()) return off();
      fit();
      mode = null;
      root.dataset.ready = "1";
      write(target());
    };
    resnap();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", resnap);
    desktop.addEventListener("change", resnap);
    reduced.addEventListener("change", resnap);
    const ro = new ResizeObserver(resnap);
    ro.observe(stage);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", resnap);
      desktop.removeEventListener("change", resnap);
      reduced.removeEventListener("change", resnap);
      ro.disconnect();
      off();
      fx?.destroy();
      fx = null;
    };
  }, [n, last]);

  // Screen-reader announcement: only after the position has settled (not on every scrolled frame).
  useEffect(() => {
    const p = Math.floor(step / 2);
    const text = `Project ${items[p].number}, ${items[p].name}, ${step % 2 ? "description" : "image"} (step ${step + 1} of ${last + 1})`;
    const id = window.setTimeout(() => setAnnounce(text), 600);
    return () => window.clearTimeout(id);
  }, [step, items, last]);

  const scrollToStep = (s: number) => {
    const track = trackRef.current;
    if (!track) return;
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
    const stagePx = stageRef.current?.offsetHeight ?? 0;
    const px = (track.offsetHeight - stagePx) / last;
    const top = window.scrollY + track.getBoundingClientRect().top - hh + clamp(s, 0, last) * px;
    window.scrollTo({ top, behavior: "smooth" });
  };
  const release = () => {
    const track = trackRef.current;
    if (!track) return;
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
    window.scrollTo({ top: window.scrollY + track.getBoundingClientRect().bottom - hh, behavior: "smooth" });
  };
  const cp = Math.floor(step / 2);
  const onPrev = () => scrollToStep(mobileRef.current ? (cp - 1) * 2 : lastRef.current - 1);
  const onNext = () => (!mobileRef.current && lastRef.current >= last ? release() : scrollToStep(mobileRef.current ? (cp + 1) * 2 : lastRef.current + 1));
  const readout = `Project ${items[cp].number} · ${items[cp].name} — ${step % 2 ? "Back · description" : "Front · image"} (step ${step + 1} of ${last + 1})`;
  const pending = "Project image pending";

  return (
    <section ref={rootRef} id="selected" aria-labelledby={`${uid}-h`} className="fw-root" style={{ "--fw-n": last } as CSSProperties}>
      <h2 id={`${uid}-h`} className="sr-only">
        {content.label}
      </h2>

      {/* ── Pinned, scroll-linked stage ── */}
      <div className="fw-flip">
        <div ref={trackRef} className="fw-track">
          <div ref={stageRef} className="fw-stage">
            <div ref={boxRef} className="fw-box">
              <p className="fw-label" aria-hidden="true">
                {content.label}
              </p>
              <div className="fw-bar" aria-hidden="true">
                <i ref={barRef} />
              </div>
              <p className="fw-step" aria-hidden="true">
                {two(step + 1)} / {two(last + 1)}
              </p>
              <span className="fw-peek fw-peek-l" aria-hidden="true" />
              <span className="fw-peek fw-peek-r" aria-hidden="true" />
              <div className="fw-wall" aria-hidden="true">
                <div className="fw-cards">
                  {items.map((item) => (
                    <div key={item.id} data-fw-card className="fw-card">
                      <div className="fw-turn">
                        <Face item={item} n={n} pending={pending} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="fw-readout" aria-hidden="true">
                {readout}
              </p>
              <p className="fw-note" aria-hidden="true">
                Placeholder project content · not final
              </p>

              {/* Real controls. They only scroll the page; scrolling alone does everything. */}
              <div className="fw-ctl" role="group" aria-label="Selected work controls">
                <button type="button" className="fw-pfb" onClick={onPrev} disabled={step <= 0}>
                  Previous
                </button>
                <button type="button" className="fw-pfb" onClick={onNext} disabled={mobile && cp >= n - 1}>
                  {!mobile && step >= last ? "Continue" : "Next"}
                </button>
                <button type="button" className="fw-pfb" disabled title="Case pages are not available yet">
                  Open case
                </button>
              </div>
              <ul className="fw-list">
                {items.map((item, j) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`fw-pfr ${j === cp ? "on" : ""}`}
                      aria-label={`Go to project ${item.number}, ${item.name}`}
                      aria-current={j === cp ? "true" : undefined}
                      onClick={() => scrollToStep(j * 2)}
                    >
                      <span>{item.number}</span>
                      <span>{item.name}</span>
                      <span>{item.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Everything on both faces, for screen readers (the 3D stage above is a visual rendering of this). */}
        <ol className="sr-only">
          {items.map((item) => (
            <li key={item.id}>
              <h3>
                {item.number} {item.name}
              </h3>
              <p>{item.category}.</p>
              <p>{item.image ? `Image: ${item.image.alt}` : "Project image pending."}</p>
              <p>{item.description}</p>
              {item.copyStatus === "placeholder" && <p>Placeholder copy, not final.</p>}
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>

      {/* ── Readable static layout: reduced motion and no JavaScript ── */}
      <div className="fw-static">
        <p className="fw-st-label">{content.label}</p>
        <ol className="fw-st-list">
          {items.map((item) => (
            <li key={item.id} className="fw-st-item">
              <div className="fw-st-img" style={{ "--c": item.placeholderColor } as CSSProperties}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static fixed-ratio image
                  <img src={item.image.src} alt={item.image.alt} loading="lazy" decoding="async" style={{ objectPosition: item.imagePosition }} />
                ) : (
                  <span className="fw-pend">{pending}</span>
                )}
              </div>
              <div className="fw-st-text">
                <p className="fw-st-meta">
                  {item.category} · {item.number} / {two(n)}
                </p>
                <h3 className="fw-st-name">{item.name}</h3>
                <p className="fw-st-desc">{item.description}</p>
                {item.copyStatus === "placeholder" && <p className="fw-st-prov">Placeholder copy · demo project</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <noscript>
        <style>{`.fw-flip{display:none!important}.fw-static{display:block!important}`}</style>
      </noscript>
    </section>
  );
}
