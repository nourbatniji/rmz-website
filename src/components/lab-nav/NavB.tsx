"use client";

import { useRef, useState } from "react";
import { Logo, splitNav, useOverlay, useToggleEvent, type NavProps } from "./shared";

/** Short descriptors taken from the site's own section names (Work archive, seven services, Team). */
const CAPTION: Record<string, string> = { "#work": "Selected work", "#services": "Seven services", "#minds": "The team" };

/**
 * B — SPLIT NAVIGATION. The logo owns the left; the right is one deliberate composition: three destinations, each with an index number and a one-line descriptor,
 * a vertical rule, then a large red Contact block that is the end of the reading order (logo → destinations → Contact). Mobile: logo left, a red Contact button
 * and a square Menu button on the right; the menu is a sheet from the right with two-line rows.
 */
export function NavB({ brand, nav, solid, active, reduced }: NavProps) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const followed = useRef(false);
  const close = () => setOpen(false);
  useOverlay(open, close, panel, trigger, followed);
  useToggleEvent(() => setOpen((v) => !v));
  const { contact, links } = splitNav(nav);

  return (
    <header className={`nv nv-b ${solid ? "is-solid" : ""} ${open ? "is-open" : ""}`} data-reduced={reduced ? "1" : "0"}>
      <div className="nv-b-bg" aria-hidden="true" />
      <div className="nv-b-row">
        <a href="#top" className="nv-b-logo" aria-label={`${brand.name} — home`}>
          <Logo brand={brand} />
        </a>

        <div className="nv-b-right">
          <nav aria-label="Primary" className="nv-b-nav">
            {links.map((item, i) => (
              <a key={item.href} href={item.href} className="nv-b-link" aria-current={active === item.href ? "location" : undefined}>
                <span className="nv-b-top">
                  <span className="nv-b-idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="nv-b-label">{item.label}</span>
                </span>
                <span className="nv-b-cap">{CAPTION[item.href] ?? ""}</span>
              </a>
            ))}
          </nav>
          <a href={contact.href} className="nv-b-cta" aria-current={active === contact.href ? "location" : undefined}>
            <span>{contact.label}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M5 3h8v8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          </a>
        </div>

        <div className="nv-b-mobile">
          <a href={contact.href} className="nv-b-mcta">{contact.label}</a>
          <button ref={trigger} type="button" className="nv-b-menubtn" aria-expanded={open} aria-controls="nv-b-panel" onClick={() => setOpen((v) => !v)}>
            <span className="sr-only">{open ? "Close menu" : "Menu"}</span>
            <i className="nv-ico" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="nv-b-scrim" aria-hidden="true" onClick={close} />
      <div id="nv-b-panel" ref={panel} className="nv-b-panel" aria-hidden={!open} inert={!open}>
        <p className="nv-b-ptitle t-meta">Menu</p>
        <nav aria-label="Primary">
          {links.map((item, i) => (
            <a key={item.href} href={item.href} className="nv-b-prow" aria-current={active === item.href ? "location" : undefined} style={{ ["--d" as string]: `${90 + i * 50}ms` }} onClick={() => { followed.current = true; close(); }}>
              <span className="nv-b-pidx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="nv-b-plabel">{item.label}</span>
              <span className="nv-b-pcap">{CAPTION[item.href] ?? ""}</span>
            </a>
          ))}
        </nav>
        <a href={contact.href} className="nv-b-pcta" style={{ ["--d" as string]: "260ms" }} onClick={() => { followed.current = true; close(); }}>
          <span>{contact.label}</span>
          <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M5 3h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
        </a>
      </div>
    </header>
  );
}
