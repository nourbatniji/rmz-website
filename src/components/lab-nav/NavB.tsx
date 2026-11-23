"use client";

import { useRef, useState } from "react";
import { Arrow, Logo, MenuIcon, splitNav, useOverlay, useToggleEvent, type NavProps } from "./shared";

/**
 * B — BALANCED CENTRE. One light row on a three-part grid: logo left, the main links centred on the page independently of the logo (equal flexible side columns, so link
 * states can never push the group), Contact at the far right. The current section is a short red underline. Mobile: logo left, a Contact text link and a Menu control;
 * the menu drops from the header as a compact sheet instead of covering the page.
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
      <div className="nv-bg" aria-hidden="true" />
      <div className="nv-row">
        <a href="#top" className="nv-logo" aria-label={`${brand.name} — home`}><Logo brand={brand} /></a>
        <nav aria-label="Primary" className="nv-links nv-links-centre">
          {links.map((item) => (
            <a key={item.href} href={item.href} className="nv-link" aria-current={active === item.href ? "location" : undefined}>{item.label}</a>
          ))}
        </nav>
        <div className="nv-end">
          <a href={contact.href} className="nv-link nv-contact" aria-current={active === contact.href ? "location" : undefined}>
            {contact.label}
            <Arrow />
          </a>
          <button ref={trigger} type="button" className="nv-menubtn" aria-expanded={open} aria-controls="nv-b-panel" onClick={() => setOpen((v) => !v)}>
            <span>{open ? "Close" : "Menu"}</span>
            <MenuIcon />
          </button>
        </div>
      </div>
      <div className="nv-scrim" aria-hidden="true" onClick={close} />
      <div id="nv-b-panel" ref={panel} className="nv-sheet nv-sheet-drop" aria-hidden={!open} inert={!open}>
        <nav aria-label="Primary" className="nv-sheet-nav">
          {links.map((item, i) => (
            <a key={item.href} href={item.href} className="nv-slink" aria-current={active === item.href ? "location" : undefined} style={{ ["--i" as string]: i }} onClick={() => { followed.current = true; close(); }}>{item.label}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}
