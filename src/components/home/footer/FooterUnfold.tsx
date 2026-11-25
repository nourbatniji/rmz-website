"use client";

import { elsewhereLinks } from "./social";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FooterContent } from "@/content/closing-types";
import { useFit } from "@/lib/use-fit";
import { FooterCompact } from "./FooterCompact";
import { LogoGhost } from "./LogoGhost";
import { LogoMark } from "./LogoMark";
import "./footer-unfold.css";

/**
 * Closing sequence (desktop ≥ 1024 px): the Collaborations section is a curtain. It scrolls up and stops with its bottom edge on top of a
 * 400 px footer that waits underneath, still folded. Once the footer is fully uncovered, continued scrolling unfolds it (four cream panels,
 * a 3D accordion) into one compact, continuous footer (no dividers). Canvas: "UNFOLD V3-A" + "RMZ Footer · Unfold on scroll" (1440 artboard, scaled to the width).
 * Below 1024 px, or with reduced motion, nothing is scroll-driven: the cover is followed by the existing stacked footer / the flat footer.
 *
 * Layout: .fu-wrap = cover (sticky, stops at the footer's top) + .fu-track (pulls up under the cover) holding the sticky footer stage.
 * Progress `t` is read from the wrapper's position: 0 when `START_AT` of the footer is uncovered, 1 after `UNFOLD_VH` viewport heights of scrolling.
 */
const UNFOLD_VH = 1.2;
const DWELL = 0.32; // viewport heights the contact form stays pinned, fully in view, before the footer is pulled
const PULL = 0.8; // viewport heights of scrolling it takes to pull the form up off the footer: heavy, slow to start
const START_AT = 0.15; // the paper starts unfolding when this fraction of the folded footer is uncovered
const cl = (x: number) => Math.max(0, Math.min(1, x));
const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, m: number) => {
  const A = hx(a);
  const B = hx(b);
  return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * m)).join(",")})`;
};
const shade = (a: number, b: number) => `linear-gradient(90deg,rgba(0,0,0,${a.toFixed(3)}),rgba(0,0,0,${b.toFixed(3)}))`;
const isExternal = (href: string) => /^https?:/.test(href);
const ext = (href: string) => (isExternal(href) ? { target: "_blank", rel: "noopener noreferrer" } : {});

/** `solo`: the footer on its own, already open (project pages) — same paper, same columns, no curtain and no scroll motion. */
export function FooterUnfold({ cover, content, solo = false }: { cover?: ReactNode; content: FooterContent; solo?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [clock, setClock] = useState(content.place);

  useFit(wrap, box, 1440);

  // the studio's local time (client only: the server renders the plain place name)
  useEffect(() => {
    const tick = () => {
      try {
        const time = new Intl.DateTimeFormat("en-GB", { timeZone: content.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
        setClock(`${content.place} · ${time}`);
      } catch {
        setClock(content.place);
      }
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [content.place, content.timeZone]);

  // the cover may be taller than one artboard (e.g. a pinned section); the wrapper's height and the curtain's stop point follow its real height
  useEffect(() => {
    const el = wrap.current;
    const c = el?.firstElementChild as HTMLElement | null;
    if (!el || !c) return;
    const set = () => {
      el.style.setProperty("--hc", `${c.offsetHeight}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // progress from the scroll position (no scroll hijacking: the page scrolls normally; only the pinned footer reacts)
  useEffect(() => {
    const el = wrap.current;
    if (!el || solo) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const calc = () => {
      raf = 0;
      const sc = parseFloat(el.style.getPropertyValue("--sc")) || 1;
      const hf = 300 * sc;
      const coverEl = el.firstElementChild as HTMLElement | null;
      const hc = coverEl ? coverEl.offsetHeight : 900 * sc;
      const vh = window.innerHeight;
      // S = scroll distance since the form (the cover's bottom edge) reached the bottom of the viewport; the cover stays pinned there
      const S = vh - (el.getBoundingClientRect().top + hc);
      const u = cl((S - DWELL * vh) / (PULL * vh));
      const g = u * u * (3 - 2 * u); // smoothstep: it gives way slowly, as if the footer were heavy
      if (coverEl) coverEl.style.transform = mq.matches ? "" : `translate3d(0, ${(-hf * g).toFixed(2)}px, 0)`;
      const past = S - DWELL * vh - PULL * vh * START_AT;
      const next = Math.round(cl(past / (UNFOLD_VH * vh)) * 1000) / 1000;
      setT((p) => (p === next ? p : next));
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    const sync = () => {
      setReduced(mq.matches);
      req();
    };
    req();
    const first = requestAnimationFrame(sync);
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    mq.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(first);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", req);
      window.removeEventListener("resize", req);
      mq.removeEventListener("change", sync);
    };
  }, [solo]);

  // same easing / angles as the approved "Unfold on scroll" footer
  const tt = reduced || solo ? 1 : t;
  const k = cl(tt / 0.85);
  const o = k * k * (3 - 2 * k);
  const lerp = (a: number, b: number) => a + (b - a) * o;
  const e = 1 - o;
  const cr = cl((o - 0.72) / 0.28);
  const live = cr > 0.9;
  const m = cl((o - 0.65) / 0.3);
  const H = Math.round(lerp(170, 300));
  const ang = [lerp(78, 0), lerp(-156, 0), lerp(156, 0), lerp(-156, 0)];
  const sh = [shade(0.5 * e, 0.28 * e), shade(0.1 * e, 0.27 * e), shade(0.55 * e, 0.27 * e), shade(0.1 * e, 0.29 * e)];
  const fg = mix("#f3e8cc", "#0f0f0e", m);
  const kc = mix("#ffca26", "#d52518", m);
  const [mailUser, mailHost] = content.email.split("@");

  const social = elsewhereLinks(content.elsewhere.links);
  const bodies: ReactNode[] = [
    <>
      <Link href="/#top" className="fu-lg" aria-label="RMZ — home"><LogoMark /></Link>
      <p className="fu-lead">{content.studio.body}</p>
      <a className="fu-mail" href={`mailto:${content.email}`}>{content.email} ↗</a>
    </>,
    <>
      <p className="fu-k">{content.explore.heading}</p>
      <nav className="fu-nav" aria-label={content.explore.heading}>
        {content.explore.links.map((l) => <a key={l.label} className="fu-lk" href={l.href}>{l.label}</a>)}
      </nav>
    </>,
    <>
      <p className="fu-k">{content.services.heading}</p>
      <div className="fu-sv">{content.services.items.map((s) => <span key={s}>{s}</span>)}</div>
    </>,
    social.length ? <>
      <p className="fu-k">{content.elsewhere.heading}</p>
      <div className="fu-soc">
        {social.map((l) => (l.href.trim() ? <a key={l.label} className="fu-so" href={l.href} {...ext(l.href)}>{l.label} <span aria-hidden="true">↗</span></a> : <span key={l.label} className="fu-so">{l.label}</span>))}
      </div>
    </> : null,
  ];

  const panel = (i: number): ReactNode => (
    <div className={`fu-p${i === 0 ? " fu-p0" : ""}`} style={{ height: H, transform: `rotateY(${ang[i]}deg)` }}>
      <div className="fu-fc">
        <div className={`fu-gh${i === 3 ? " fu-gh-dot" : ""}`} aria-hidden="true" style={{ opacity: [0.13, 0.1, 0.09, 0.9][i] }}><LogoGhost glyph={(["r", "m", "z", "dot"] as const)[i]} /></div>
        <div className="fu-pc" style={{ opacity: cr, pointerEvents: live ? "auto" : "none" }} inert={!live}>{bodies[i]}</div>
        <div className="fu-sh" aria-hidden="true" style={{ background: sh[i] }} />
      </div>
      {i < 3 ? panel(i + 1) : null}
    </div>
  );

  return (
    <div ref={wrap} className={`fu-wrap${reduced ? " is-static" : ""}${solo ? " fu-solo" : ""}`}>
      {!solo && <div className="fu-cover">{cover}</div>}
      <div className="fu-track">
        <footer className="fu-stage" aria-label={content.label}>
          <div ref={box} className="fu-box">
            <div className="fu-persp">
              <div className="fu-strip" style={{ top: (300 - H) / 2, height: H, transform: `translateX(${lerp(520, 0)}px)` }}>
                {panel(0)}
              </div>
            </div>
            <div className="fu-top" style={{ color: fg, opacity: cr }}>
              <span className="fu-lab">{content.label}</span>
              <span className="fu-clock">{clock}</span>
              <Link href="/#top" className="fu-up" style={{ borderColor: fg }}>{content.toTop}</Link>
            </div>
            <div className="fu-bar" style={{ color: fg }}>
              <span>{content.copyright}</span>
              {content.placeholderNote ? <span>{content.placeholderNote}</span> : <span />}
            </div>
          </div>
        </footer>
      </div>
      <span id="contact" className="fu-anchor" />
      <div className="fu-stack"><FooterCompact content={content} id="contact-stack" /></div>
    </div>
  );
}
