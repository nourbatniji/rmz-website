"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { FooterContent } from "@/content/closing-types";
import { useEntrance } from "@/lib/use-entrance";
import { useFit } from "@/lib/use-fit";
import "./footer.css";

/**
 * Footer / Contact — canvas "Footer-e01" (desktop 1440 × 900 artboard, scaled to the width). Below 1024 px the same content is stacked
 * in a fluid single column (accordion layout, canvas "FooterM-B-Accordion"). Anchor: #contact.
 * The live clock shows the studio's local time (Intl, client only: the server renders the plain place name).
 */
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const external = (href: string) => /^https?:/.test(href);

export function Footer({ content, id = "contact" }: { content: FooterContent; id?: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(content.place);
  const [open, setOpen] = useState<number | null>(0); // mobile accordion: the Studio panel starts open
  const uid = useId();

  useEntrance(rootRef, { threshold: 0.4, playMs: 2300, repeat: true });
  useFit(wrap, box, 1440);

  useEffect(() => {
    const tick = () => {
      try {
        const t = new Intl.DateTimeFormat("en-GB", { timeZone: content.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
        setClock(`${content.place} · ${t}`);
      } catch {
        setClock(content.place);
      }
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [content.place, content.timeZone]);

  const mail = `mailto:${content.email}`;
  const ext = (href: string) => (external(href) ? { target: "_blank", rel: "noopener noreferrer" } : {});
  const sections: { heading: string; body: ReactNode }[] = [
    { heading: content.studio.heading, body: <p className="ft-p">{content.studio.body}</p> },
    { heading: content.explore.heading, body: <nav aria-label={content.explore.heading}>{content.explore.links.map((l) => <a key={l.label} className="ft-lk" href={l.href}>{l.label}</a>)}</nav> },
    { heading: content.services.heading, body: <>{content.services.items.map((s) => <span key={s} className="ft-sv">{s}</span>)}</> },
    { heading: content.elsewhere.heading, body: <>{content.elsewhere.links.map((l) => <a key={l.label} className="ft-so" href={l.href} {...ext(l.href)}>{l.label} <span aria-hidden="true">↗</span></a>)}</> },
  ];

  return (
    <footer ref={rootRef} id={id} className="ft-root" aria-label={content.label}>
      {/* ── Desktop artboard ── */}
      <div ref={wrap} className="ft-dwrap">
        <div ref={box} className="ft-dbox">
          <p className="ft-rise ft-m ft-yel" style={{ ...d(0), left: 64, top: 56 }}>{content.label}</p>
          <p className="ft-rise ft-m" style={{ ...d(80), right: 64, top: 56 }}>{clock}</p>
          <h2 className="ft-hl" style={{ left: 64, top: 96 }}>
            <span className="ft-ln"><span className="ft-lni" style={d(120)}>{content.headlineLines[0]}</span></span>
            <span className="ft-ln"><span className="ft-lni" style={d(260)}>{content.headlineLines[1]} <span className="ft-iv">{content.headlineEmphasis}</span></span></span>
          </h2>
          <a className="ft-cta" href={content.cta.href}><b>{content.cta.top}<br />{content.cta.bottom}</b><i aria-hidden="true">↗</i></a>
          <div className="ft-rise" style={{ ...d(520), left: 0, top: 0 }}>
            <a className="ft-em" href={mail}>{content.email} <span aria-hidden="true">↗</span></a>
          </div>
          <div className="ft-rule" />
          <div className="ft-col ft-rise" style={{ ...d(700), left: 64 }}>
            <p className="ft-m ft-or">{content.studio.heading}</p>
            <p className="ft-p" style={{ maxWidth: 280 }}>{content.studio.body}</p>
          </div>
          <nav className="ft-col ft-rise" style={{ ...d(780), left: 420 }} aria-label={content.explore.heading}>
            <p className="ft-m ft-or">{content.explore.heading}</p>
            {content.explore.links.map((l) => <a key={l.label} className="ft-lk" href={l.href}>{l.label}</a>)}
          </nav>
          <div className="ft-col ft-rise" style={{ ...d(860), left: 776 }}>
            <p className="ft-m ft-or">{content.services.heading}</p>
            {content.services.items.map((s) => <span key={s} className="ft-sv">{s}</span>)}
          </div>
          <div className="ft-col ft-rise" style={{ ...d(940), left: 1086 }}>
            <p className="ft-m ft-or">{content.elsewhere.heading}</p>
            {content.elsewhere.links.map((l) => <a key={l.label} className="ft-so" href={l.href} {...ext(l.href)}>{l.label} <span aria-hidden="true">↗</span></a>)}
          </div>
          <div className="ft-bar ft-rise" style={d(1050)}>
            <p className="ft-m ft-dim">{content.copyright}</p>
            <p className="ft-m ft-dim">{content.placeholderNote}</p>
            <Link className="ft-m ft-up" href="/#top">{content.toTop}</Link>
          </div>
        </div>
      </div>

      {/* ── Mobile / tablet: headline, CTA, email, accordion, cream bottom strip (canvas "FooterM-B-Accordion") ── */}
      <div className="ft-mob">
        <div className="ft-mtop">
          <p className="ft-rise ft-m ft-yel" style={d(0)}>{content.label}</p>
          <p className="ft-rise ft-m" style={d(80)}>{clock}</p>
        </div>
        <div className="ft-mhead">
          <h2 className="ft-mhl">
            <span className="ft-ln"><span className="ft-lni" style={d(120)}>{content.headlineLines[0]}</span></span>
            <span className="ft-ln"><span className="ft-lni" style={d(260)}>{content.headlineLines[1]} <span className="ft-iv">{content.headlineEmphasis}</span></span></span>
          </h2>
          <a className="ft-cta ft-mcta" href={content.cta.href}><b>{content.cta.top}<br />{content.cta.bottom}</b><i aria-hidden="true">↗</i></a>
        </div>
        <a className="ft-em ft-mem ft-rise" style={d(420)} href={mail}>{content.email} <span aria-hidden="true">↗</span></a>
        <div className="ft-macc ft-rise" style={d(560)}>
          {sections.map((sec, i) => {
            const isOpen = open === i;
            return (
              <div key={sec.heading} className="ft-mrow">
                <h3 style={{ margin: 0 }}>
                  <button type="button" className="ft-mbtn" aria-expanded={isOpen} aria-controls={`${uid}-p${i}`} id={`${uid}-b${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                    <span>{sec.heading}</span>
                    <span className="ft-mpm" aria-hidden="true" />
                  </button>
                </h3>
                <div id={`${uid}-p${i}`} role="region" aria-labelledby={`${uid}-b${i}`} className={`ft-mpanel${isOpen ? " is-open" : ""}`} inert={!isOpen}>
                  <div><div className="ft-in">{sec.body}</div></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="ft-mbar">
          <div className="ft-msoc">{content.elsewhere.links.map((l) => <a key={l.label} href={l.href} {...ext(l.href)}>{l.label}</a>)}</div>
          <div className="ft-ft">
            <p className="ft-m ft-dim">{content.copyright}</p>
            <Link className="ft-m ft-up" href="/#top">{content.toTop}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
