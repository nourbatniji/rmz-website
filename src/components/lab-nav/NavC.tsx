"use client";

import { useRef, useState } from "react";
import { Arrow, Logo, MenuIcon, splitNav, useOverlay, useToggleEvent, type NavProps } from "./shared";

/**
 * C — MINIMAL MENU. Logo left; a small Contact text link and a labelled Menu control with a delicate two-line icon on the right — the same on every screen size. The menu is
 * one calm reveal: the page fades to ink and the links settle upward, set in medium weight at a comfortable size with a lot of empty space around them.
 */
export function NavC({ brand, nav, solid, active, reduced }: NavProps) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const followed = useRef(false);
  const close = () => setOpen(false);
  useOverlay(open, close, panel, trigger, followed);
  useToggleEvent(() => setOpen((v) => !v));
  const { contact } = splitNav(nav);

  return (
    <header className={`nv nv-c ${solid ? "is-solid" : ""} ${open ? "is-open" : ""}`} data-reduced={reduced ? "1" : "0"}>
      <div className="nv-bg" aria-hidden="true" />
      <div className="nv-row">
        <a href="#top" className="nv-logo" aria-label={`${brand.name} — home`}><Logo brand={brand} /></a>
        <div className="nv-end">
          <a href={contact.href} className="nv-link nv-contact" aria-current={active === contact.href ? "location" : undefined}>
            {contact.label}
            <Arrow />
          </a>
          <button ref={trigger} type="button" className="nv-menubtn" aria-expanded={open} aria-controls="nv-c-panel" onClick={() => setOpen((v) => !v)}>
            <span>{open ? "Close" : "Menu"}</span>
            <MenuIcon />
          </button>
        </div>
      </div>
      <div id="nv-c-panel" ref={panel} className="nv-sheet nv-sheet-stage" aria-hidden={!open} inert={!open} role="dialog" aria-label="Menu">
        <nav aria-label="Primary" className="nv-sheet-nav">
          {nav.map((item, i) => (
            <a key={item.href} href={item.href} className="nv-slink" aria-current={active === item.href ? "location" : undefined} style={{ ["--i" as string]: i }} onClick={() => { followed.current = true; close(); }}>
              {item.label}
              <Arrow />
            </a>
          ))}
        </nav>
        <p className="nv-sheet-foot">Rebel Mind Zone · Cairo, Egypt</p>
      </div>
    </header>
  );
}
