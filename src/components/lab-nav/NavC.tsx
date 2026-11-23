"use client";

import { useRef, useState } from "react";
import { Logo, splitNav, useOverlay, useToggleEvent, type NavProps } from "./shared";

/**
 * C — COMPACT BAR. A contained, square-edged strip set inside the page gutters: a red logo cell, four equal destination cells divided by hairlines, and an
 * ink Contact cell. Over the picture the bar is cream with ink type and a hard red offset shadow; over content it inverts to ink with cream type. The active cell
 * is filled. Mobile: the bar is a two-cell strip (logo | Menu) that grows downward into a stacked card of full-width cells.
 */
export function NavC({ brand, nav, solid, active, reduced }: NavProps) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const followed = useRef(false);
  const close = () => setOpen(false);
  useOverlay(open, close, panel, trigger, followed);
  useToggleEvent(() => setOpen((v) => !v));
  const { contact, links } = splitNav(nav);

  return (
    <header className={`nv nv-c ${solid ? "is-solid" : ""} ${open ? "is-open" : ""}`} data-reduced={reduced ? "1" : "0"}>
      <div className="nv-c-bar">
        <a href="#top" className="nv-c-logo" aria-label={`${brand.name} — home`}>
          <Logo brand={brand} className="nv-c-wm" />
        </a>

        <nav aria-label="Primary" className="nv-c-nav">
          {links.map((item) => (
            <a key={item.href} href={item.href} className="nv-c-cell" aria-current={active === item.href ? "location" : undefined}>
              <span>{item.label}</span>
            </a>
          ))}
          <a href={contact.href} className="nv-c-cell is-cta" aria-current={active === contact.href ? "location" : undefined}>
            <span>{contact.label}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M5 3h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>
          </a>
        </nav>

        <button ref={trigger} type="button" className="nv-c-menubtn" aria-expanded={open} aria-controls="nv-c-panel" onClick={() => setOpen((v) => !v)}>
          <span>{open ? "Close" : "Menu"}</span>
          <i className="nv-ico" aria-hidden="true" />
        </button>
      </div>

      <div id="nv-c-panel" ref={panel} className="nv-c-panel" aria-hidden={!open} inert={!open}>
        <div className="nv-c-panel-in">
          <nav aria-label="Primary">
            {links.map((item) => (
              <a key={item.href} href={item.href} className="nv-c-prow" aria-current={active === item.href ? "location" : undefined} onClick={() => { followed.current = true; close(); }}>
                <span>{item.label}</span>
                <span aria-hidden="true">→</span>
              </a>
            ))}
            <a href={contact.href} className="nv-c-prow is-cta" onClick={() => { followed.current = true; close(); }}>
              <span>{contact.label}</span>
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M5 3h8v8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
