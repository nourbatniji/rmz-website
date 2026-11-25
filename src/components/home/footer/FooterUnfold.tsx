"use client";

import { realSocial } from "./social";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FooterContent } from "@/content/closing-types";
import { useFit } from "@/lib/use-fit";
import { Footer } from "./Footer";
import "./footer-unfold.css";

/**
 * Closing sequence (desktop ≥ 1024 px): the Collaborations section is a curtain. It scrolls up and stops with its bottom edge on top of a
 * 400 px footer that waits underneath, still folded. Once the footer is fully uncovered, continued scrolling unfolds it (four cream panels,
 * a 3D accordion) into the flat footer. Canvas: "UNFOLD V3-A" + "RMZ Footer · Unfold on scroll" (1440 artboard, scaled to the width).
 * Below 1024 px, or with reduced motion, nothing is scroll-driven: the cover is followed by the existing stacked footer / the flat footer.
 *
 * Layout: .fu-wrap = cover (sticky, stops at the footer's top) + .fu-track (pulls up under the cover) holding the sticky footer stage.
 * Progress `t` is read from the wrapper's position: 0 when the footer is exactly uncovered, 1 after `UNFOLD_VH` viewport heights of scrolling.
 */
const UNFOLD_VH = 1.2;
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

const GHOST = ["R", "M", "Z", "."];
const GHOST_OP = [0.13, 0.1, 0.09, 0.1];

export function FooterUnfold({ cover, content }: { cover: ReactNode; content: FooterContent }) {
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [clock, setClock] = useState(content.place);

  useFit(wrap, box, 1440);

  // The cover's height is whatever the cover really is (the Collaborations section is content-driven and grows or shrinks with its logos), not a fixed 900 px artboard:
  // the wrapper's height and the cover's sticky offset follow it through --hc.
  useEffect(() => {
    const el = wrap.current;
    const coverEl = el?.firstElementChild as HTMLElement | null;
    if (!el || !coverEl) return;
    const sync = () => el.style.setProperty("--hc", `${coverEl.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(coverEl);
    return () => ro.disconnect();
  }, []);

  // progress from the scroll position (no scroll hijacking: the page scrolls normally; only the pinned footer reacts)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const calc = () => {
      raf = 0;
      const sc = parseFloat(el.style.getPropertyValue("--sc")) || 1;
      const hf = 400 * sc;
      const coverEl = el.firstElementChild as HTMLElement | null;
      const hc = coverEl ? coverEl.offsetHeight : 900 * sc;
      const vh = window.innerHeight;
      const past = vh - hf - (el.getBoundingClientRect().top + hc);
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
  }, []);

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

  // same easing / angles as the approved "Unfold on scroll" footer
  const tt = reduced ? 1 : t;
  const k = cl(tt / 0.85);
  const o = k * k * (3 - 2 * k);
  const lerp = (a: number, b: number) => a + (b - a) * o;
  const e = 1 - o;
  const cr = cl((o - 0.72) / 0.28);
  const live = cr > 0.9;
  const m = cl((o - 0.65) / 0.3);
  const H = Math.round(lerp(230, 400));
  const ang = [lerp(78, 0), lerp(-156, 0), lerp(156, 0), lerp(-156, 0)];
  const sh = [shade(0.5 * e, 0.28 * e), shade(0.1 * e, 0.27 * e), shade(0.55 * e, 0.27 * e), shade(0.1 * e, 0.29 * e)];
  const fg = mix("#f3e8cc", "#0f0f0e", m);
  const kc = mix("#ffca26", "#d52518", m);
  const [mailUser, mailHost] = content.email.split("@");

  const social = realSocial(content.elsewhere.links);
  const bodies: ReactNode[] = [
    <>
      <p className="fu-k">{content.studio.heading}</p>
      <p className="fu-lead">{content.studio.body}</p>
      <a className="fu-mail" href={`mailto:${content.email}`}>
        {mailHost ? <>{mailUser}@<br />{mailHost}</> : content.email} ↗
      </a>
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
        {social.map((l) => <a key={l.label} className="fu-so" href={l.href} {...ext(l.href)}>{l.label} <span aria-hidden="true">↗</span></a>)}
      </div>
    </> : null,
  ];

  const panel = (i: number): ReactNode => (
    <div className={`fu-p${i === 0 ? " fu-p0" : ""}`} style={{ height: H, transform: `rotateY(${ang[i]}deg)` }}>
      <div className="fu-fc">
        <div className="fu-gh" aria-hidden="true" style={{ opacity: GHOST_OP[i] }}>{GHOST[i]}</div>
        <div className="fu-pc" style={{ opacity: cr, pointerEvents: live ? "auto" : "none" }} inert={!live}>{bodies[i]}</div>
        <div className="fu-sh" aria-hidden="true" style={{ background: sh[i] }} />
      </div>
      {i < 3 ? panel(i + 1) : null}
    </div>
  );

  return (
    <div ref={wrap} className={`fu-wrap${reduced ? " is-static" : ""}`}>
      <div className="fu-cover">{cover}</div>
      <div className="fu-track">
        <footer className="fu-stage" aria-label={content.label}>
          <div ref={box} className="fu-box">
            <div className="fu-top" style={{ color: fg }}>
              <span style={{ color: kc }}>{content.label}</span>
              <span>{clock}</span>
              <Link href="/#top" className="fu-up" style={{ borderColor: fg }}>{content.toTop}</Link>
            </div>
            <div className="fu-persp">
              <div className="fu-strip" style={{ top: (400 - H) / 2, height: H, transform: `translateX(${lerp(520, 0)}px)` }}>
                {panel(0)}
              </div>
            </div>
            <div className="fu-bar" style={{ color: fg }}>
              <span>{content.copyright}</span>
              {content.placeholderNote ? <span>{content.placeholderNote}</span> : <span />}
            </div>
          </div>
        </footer>
      </div>
      <span id="contact" className="fu-anchor" />
      <div className="fu-stack"><Footer content={content} id="contact-stack" /></div>
    </div>
  );
}
