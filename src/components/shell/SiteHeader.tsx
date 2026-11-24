"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/content/types";
import { Arrow, MenuIcon, useOverlay } from "./header-parts";
import "./site-header.css";

/**
 * Fixed site header — "Balanced centre" (approved in /lab/navigation, direction B). One slim row (72 px; 60 px on phones): logo left, the main links centred on the page
 * independently of the logo, Contact at the far right. Always the over-image surface (transparent, with a short soft scrim and a discreet text shadow — it never turns
 * solid), always reduced motion (instant state changes; the rest of the site is unaffected). The section under the header is marked with a short red underline on the
 * homepage. Phones: logo, a Contact text link and a Menu control; the menu drops from the header as a compact sheet.
 * Destinations come from the site content (`nav`), so the labels and anchors stay editable in the dashboard.
 */
export function SiteHeader({ brand, nav }: SiteContent) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const followed = useRef(false);
  const pathname = usePathname();
  const onHome = pathname === "/" || pathname.startsWith("/admin/preview");
  // Off the homepage (e.g. /work/[slug]) the section anchors must point back at the homepage; "Work" lands on the work archive.
  const link = (href: string) => (onHome || !href.startsWith("#") ? href : href === "#work" ? "/#work-archive" : `/${href}`);
  const close = () => setOpen(false);
  useOverlay(open, close, panel, trigger, followed);

  const contact = nav.find((n) => /contact/i.test(n.label)) ?? nav[nav.length - 1];
  const links = nav.filter((n) => n !== contact);

  // close the menu when the route changes
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // homepage only: which section is under the header (the same anchors the links point at)
  useEffect(() => {
    if (!onHome) {
      const t = window.setTimeout(() => setActive(null), 0);
      return () => window.clearTimeout(t);
    }
    const ids = nav.map((n) => n.href).filter((h) => h.startsWith("#") && h !== "#top").map((h) => h.slice(1));
    let raf = 0;
    const update = () => {
      raf = 0;
      let cur: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 72 + window.innerHeight * 0.3) cur = `#${id}`;
      }
      setActive((a) => (a === cur ? a : cur));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    window.addEventListener("load", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); window.removeEventListener("load", on); if (raf) cancelAnimationFrame(raf); };
  }, [onHome, nav]);

  const logo = brand.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- official logo, svg/png, fixed height
    <img src={brand.logo.src} alt={brand.logo.alt || brand.name} />
  ) : (
    // TEMPORARY text wordmark until the official logo file is delivered.
    <span className="t-display" aria-label={brand.name}>
      RMZ<span className="sh-dot">.</span>
    </span>
  );

  return (
    <header className={`sh ${open ? "is-open" : ""}`}>
      <div className="sh-bg" aria-hidden="true" />
      <div className="sh-row">
        <a href={link("#top")} aria-label={`${brand.name} — home`} className="sh-logo">
          {logo}
        </a>

        <nav aria-label="Primary" className="sh-links">
          {links.map((item) => (
            <a key={item.href} href={link(item.href)} className="sh-link" aria-current={onHome && active === item.href ? "location" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sh-end">
          <a href={link(contact.href)} className="sh-link" aria-current={onHome && active === contact.href ? "location" : undefined}>
            {contact.label}
            <Arrow />
          </a>
          <button ref={trigger} type="button" className="sh-menubtn" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((v) => !v)}>
            <span>{open ? "Close" : "Menu"}</span>
            <MenuIcon />
          </button>
        </div>
      </div>

      <div className="sh-scrim" aria-hidden="true" onClick={close} />
      <div id="site-menu" ref={panel} className="sh-sheet" aria-hidden={!open} inert={!open}>
        <nav aria-label="Primary" className="sh-sheet-nav">
          {links.map((item) => (
            <a key={item.href} href={link(item.href)} className="sh-slink" aria-current={onHome && active === item.href ? "location" : undefined} onClick={() => { followed.current = true; close(); }}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
