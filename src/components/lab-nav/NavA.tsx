"use client";

import { useRef, useState } from "react";
import { Arrow, Logo, MenuIcon, splitNav, useOverlay, useToggleEvent, type NavProps } from "./shared";

/**
 * A — QUIET EDITORIAL. Logo left, four plain text links right, nothing else: no container, no rule, no fill. The current section is a tiny red dot under its label;
 * hover/focus draws a one-pixel underline (it never moves the text). Contact is the last link, marked only by a small arrow. Mobile: logo and a quiet Menu control; the
 * menu is a calm full-screen sheet of plain links.
 */
export function NavA({ brand, nav, solid, active, reduced }: NavProps) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const followed = useRef(false);
  const close = () => setOpen(false);
  useOverlay(open, close, panel, trigger, followed);
  useToggleEvent(() => setOpen((v) => !v));
  const { contact } = splitNav(nav);

  return (
    <header className={`nv nv-a ${solid ? "is-solid" : ""} ${open ? "is-open" : ""}`} data-reduced={reduced ? "1" : "0"}>
      <div className="nv-bg" aria-hidden="true" />
      <div className="nv-row">
        <a href="#top" className="nv-logo" aria-label={`${brand.name} — home`}><Logo brand={brand} /></a>
        <nav aria-label="Primary" className="nv-links">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="nv-link" aria-current={active === item.href ? "location" : undefined}>
              {item.label}
              {item === contact && <Arrow />}
            </a>
          ))}
        </nav>
        <button ref={trigger} type="button" className="nv-menubtn" aria-expanded={open} aria-controls="nv-a-panel" onClick={() => setOpen((v) => !v)}>
          <span>{open ? "Close" : "Menu"}</span>
          <MenuIcon />
        </button>
      </div>
      <div id="nv-a-panel" ref={panel} className="nv-sheet nv-sheet-full" aria-hidden={!open} inert={!open}>
        <nav aria-label="Primary" className="nv-sheet-nav">
          {nav.map((item, i) => (
            <a key={item.href} href={item.href} className="nv-slink" aria-current={active === item.href ? "location" : undefined} style={{ ["--i" as string]: i }} onClick={() => { followed.current = true; close(); }}>
              {item.label}
              {item === contact && <Arrow />}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
