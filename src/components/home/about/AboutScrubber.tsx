"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { FeaturedWorkContent, FeaturedWorkItem } from "@/content/types";
import { LiquidImageFx } from "./liquid-image";
import "./about.css";

/**
 * About — the "scrubber" layout from the Homepage Journey V2 prototype (selected-work stage), used to tell the studio's story.
 *
 * Desktop (≥ 1024 px, motion allowed): a sticky stage inside a track of (n × step) extra scroll. Page scroll position drives ONE continuous value
 * `sc` (0 … n−1): each step's image + text crossfade and slide 40 px as scroll crosses the boundary; the step list jumps to any step. Nothing
 * captures the wheel; the stage simply scrolls away after the last step. First and last step are fully shown at the start / end of the track.
 * Mobile / reduced motion / no JS: a plain vertical list of the same content (CSS decides; the stage is not in the accessibility tree then).
 * Pointer over the current image (desktop, fine pointer, scroll at rest): the subtle liquid effect (liquid-image.ts).
 *
 * Content reuses the existing `featured` section data (name = title, category = kicker, description = text, image), so the admin editor keeps working.
 */

const DESKTOP = "(min-width: 1024px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const HOVER = "(hover: hover) and (pointer: fine)";
const IDLE_MS = 160; // scroll at rest before the liquid effect arms

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const two = (n: number) => String(n).padStart(2, "0");

function StepImage({ item, pending }: { item: FeaturedWorkItem; pending: string }) {
  return item.image ? (
    // eslint-disable-next-line @next/next/no-img-element -- fixed-ratio stage image, sized by CSS
    <img src={item.image.src} alt={item.image.alt} loading="lazy" decoding="async" style={{ objectPosition: item.imagePosition }} />
  ) : (
    <span className="ab-pend">{pending}</span>
  );
}

export function AboutScrubber({ content }: { content: FeaturedWorkContent }) {
  const { items } = content;
  const n = items.length;
  const uid = useId();
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);

  useEffect(() => {
    const root = rootRef.current, track = trackRef.current, stage = stageRef.current;
    if (!root || !track || !stage || n < 1) return;
    const imgs = [...root.querySelectorAll<HTMLElement>("[data-ab-img]")];
    const txts = [...root.querySelectorAll<HTMLElement>("[data-ab-txt]")];
    const idx = [...root.querySelectorAll<HTMLElement>("[data-ab-idx]")];
    const bar = root.querySelector<HTMLElement>("[data-ab-bar]");
    const count = root.querySelector<HTMLElement>("[data-ab-count]");
    const desktop = window.matchMedia(DESKTOP), reduced = window.matchMedia(REDUCED), hover = window.matchMedia(HOVER);
    let fx: LiquidImageFx | null = null;
    let idle = 0, raf = 0, shown = -1;

    const live = () => desktop.matches && !reduced.matches;
    const hh = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
    const extra = () => Math.max(1, track.offsetHeight - stage.offsetHeight);

    const paint = () => {
      raf = 0;
      if (!live()) { fx?.setEnabled(false); return; }
      const p = clamp((hh() - track.getBoundingClientRect().top) / extra());
      const sc = clamp(p * n - 0.5, 0, n - 1); // first step fully shown at the start of the track, last at its end
      for (let i = 0; i < n; i++) {
        const d = Math.abs(sc - i);
        const op = clamp(1 - (d - 0.25) / 0.5); // full within ±0.25 of its step, true crossfade (0.5 + 0.5) at the boundary
        const y = ((sc - i) * -40).toFixed(1);
        const top = clamp(1 - (d - 0.15) / 0.25); // text turns over faster than the image so two big titles never overlap
        const on = top > 0.5;
        const img = imgs[i], txt = txts[i];
        if (img) { img.style.opacity = op.toFixed(3); img.style.transform = `translateY(${y}px)`; img.style.pointerEvents = op > 0.5 ? "auto" : "none"; img.style.visibility = op < 0.01 ? "hidden" : "visible"; }
        if (txt) { txt.style.opacity = top.toFixed(3); txt.style.transform = `translateY(${y}px)`; txt.style.pointerEvents = on ? "auto" : "none"; txt.style.visibility = top < 0.01 ? "hidden" : "visible"; if (on) txt.removeAttribute("aria-hidden"); else txt.setAttribute("aria-hidden", "true"); }
        if (idx[i]) idx[i].style.opacity = Math.round(sc) === i ? "1" : "0.5";
      }
      const r = Math.round(sc);
      if (bar) bar.style.width = `${(((sc + 1) / n) * 100).toFixed(2)}%`;
      if (count) count.textContent = `${two(r + 1)} / ${two(n)}`;
      if (r !== shown) { shown = r; setCur(r); }
      // liquid effect: only once the scroll has come to rest
      fx?.setEnabled(false);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (!live() || !hover.matches) return;
        fx ??= new LiquidImageFx();
        fx.setEnabled(true);
      }, IDLE_MS);
    };
    // always re-request: an rAF callback that never ran (throttled / backgrounded page) must not block later scroll updates
    const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };
    const jump = (i: number) => {
      const top = window.scrollY + track.getBoundingClientRect().top - hh() + ((i + 0.5) / n) * extra();
      window.scrollTo({ top, behavior: "smooth" });
    };
    const onIdx = (e: Event) => { const b = (e.currentTarget as HTMLElement).dataset.abIdx; if (b != null) jump(Number(b)); };
    idx.forEach((b) => b.addEventListener("click", onIdx));
    paint();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    desktop.addEventListener("change", kick);
    reduced.addEventListener("change", kick);
    const ro = new ResizeObserver(kick);
    ro.observe(stage);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      desktop.removeEventListener("change", kick);
      reduced.removeEventListener("change", kick);
      idx.forEach((b) => b.removeEventListener("click", onIdx));
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      fx?.destroy();
    };
  }, [n]);

  const pending = "Image pending";
  const cta = { href: "#services", label: "What we do ↓" };

  return (
    <section ref={rootRef} id="selected" aria-labelledby={`${uid}-h`} className="ab-root" style={{ "--ab-n": n } as CSSProperties}>
      <h2 id={`${uid}-h`} className="sr-only">
        {content.label}
      </h2>

      {/* ── Scroll-linked stage (desktop, motion allowed) ── */}
      <div className="ab-flip">
        <div ref={trackRef} className="ab-track">
          <div ref={stageRef} className="ab-stage">
            <div className="ab-top">
              <p className="ab-label">{content.label}</p>
              <p className="ab-label" data-ab-count aria-hidden="true">
                {two(cur + 1)} / {two(n)}
              </p>
              <div className="ab-bar" aria-hidden="true">
                <i data-ab-bar />
              </div>
            </div>
            <div className="ab-grid">
              <ol className="ab-index">
                {items.map((item, i) => (
                  <li key={item.id}>
                    <button type="button" data-ab-idx={i} className="ab-idx" aria-label={`Go to ${item.name}`} aria-current={i === cur ? "true" : undefined}>
                      <span>{item.number}</span>
                      <b>{item.name}</b>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="ab-imgcol">
                {items.map((item, i) => (
                  <div key={item.id} data-ab-img className="ab-img" data-liquid="" style={{ "--c": item.placeholderColor, opacity: i === 0 ? 1 : 0 } as CSSProperties}>
                    <StepImage item={item} pending={pending} />
                  </div>
                ))}
              </div>
              <div className="ab-txtcol">
                {items.map((item, i) => (
                  <div key={item.id} data-ab-txt className="ab-txt" style={{ opacity: i === 0 ? 1 : 0 }} aria-hidden={i === 0 ? undefined : true}>
                    <p className="ab-kicker">
                      {item.category}
                      {item.copyStatus === "placeholder" && <span className="ab-prov">Provisional copy</span>}
                    </p>
                    <h3 className="ab-title">{item.name}</h3>
                    <p className="ab-body">{item.description}</p>
                    <a className="ab-cta" href={cta.href}>
                      {cta.label}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Plain list: mobile, reduced motion, no JavaScript ── */}
      <div className="ab-static">
        <p className="ab-label">{content.label}</p>
        <ol className="ab-list">
          {items.map((item) => (
            <li key={item.id} className="ab-item">
              <div className="ab-simg" style={{ "--c": item.placeholderColor } as CSSProperties}>
                <StepImage item={item} pending={pending} />
              </div>
              <p className="ab-kicker">
                {item.category}
                {item.copyStatus === "placeholder" && <span className="ab-prov">Provisional copy</span>}
              </p>
              <h3 className="ab-title">{item.name}</h3>
              <p className="ab-body">{item.description}</p>
            </li>
          ))}
        </ol>
        <a className="ab-cta" href={cta.href}>
          {cta.label}
        </a>
      </div>
      <noscript>
        <style>{`.ab-flip{display:none!important}.ab-static{display:block!important}`}</style>
      </noscript>
    </section>
  );
}
