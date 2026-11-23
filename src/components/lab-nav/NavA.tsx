"use client";

import { useRef, useState } from "react";
import { Logo, useOverlay, useToggleEvent, type NavProps } from "./shared";

/**
 * A — EDITORIAL RAIL. A full-width header on a strict grid: logo in the first columns, the four destinations spread across the right half as numbered
 * columns that sit on one hairline rail. The active destination is marked by a short red bar sliding along the rail; hover nudges the label and brings in an arrow.
 * Contact is the last column and the only filled one. Mobile: a compact bar with a labelled Menu and a visible Contact; the menu is a ruled index list.
 */
export function NavA({ brand, nav, solid, active, reduced }: NavProps) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const followed = useRef(false);
  const close = () => setOpen(false);
  useOverlay(open, close, panel, trigger, followed);
  useToggleEvent(() => setOpen((v) => !v));
  const idx = nav.findIndex((n) => n.href === active);
  const contact = nav[nav.length - 1];

  return (
    <header className={`nv nv-a ${solid ? "is-solid" : ""} ${open ? "is-open" : ""}`} data-reduced={reduced ? "1" : "0"}>
      <div className="nv-a-bg" aria-hidden="true" />
      <div className="nv-a-row">
        <a href="#top" className="nv-a-logo" aria-label={`${brand.name} — home`}>
          <Logo brand={brand} />
        </a>

        <nav aria-label="Primary" className="nv-a-nav">
          {nav.map((item, i) => (
            <a key={item.href} href={item.href} className={`nv-a-link ${item === contact ? "is-cta" : ""}`} aria-current={active === item.href ? "location" : undefined}>
              <span className="nv-a-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="nv-a-label">{item.label}</span>
              <span className="nv-a-arrow" aria-hidden="true">→</span>
            </a>
          ))}
          <span className="nv-a-mark" aria-hidden="true" style={{ ["--i" as string]: Math.max(idx, 0), opacity: idx < 0 ? 0 : 1 }} />
        </nav>

        <div className="nv-a-mobile">
          <a href={contact.href} className="nv-a-mcontact">{contact.label}</a>
          <button ref={trigger} type="button" className="nv-a-menubtn" aria-expanded={open} aria-controls="nv-a-panel" onClick={() => setOpen((v) => !v)}>
            <span>{open ? "Close" : "Menu"}</span>
            <i aria-hidden="true" />
          </button>
        </div>
      </div>

      <div id="nv-a-panel" ref={panel} className="nv-a-panel" aria-hidden={!open} inert={!open}>
        <nav aria-label="Primary">
          {nav.map((item, i) => (
            <a key={item.href} href={item.href} className={`nv-a-prow ${item === contact ? "is-cta" : ""}`} aria-current={active === item.href ? "location" : undefined} style={{ ["--d" as string]: `${60 + i * 45}ms` }} onClick={() => { followed.current = true; close(); }}>
              <span className="nv-a-pnum" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="nv-a-plabel">{item.label}</span>
              <span className="nv-a-parrow" aria-hidden="true">→</span>
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
