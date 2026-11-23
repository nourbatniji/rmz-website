"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { NavItem, SiteContent } from "@/content/types";

/** Shared pieces of the four navigation prototypes. Lab only. */

export type NavProps = {
  brand: SiteContent["brand"];
  nav: NavItem[];
  /** header surface: false = over the picture (transparent), true = over content (solid) */
  solid: boolean;
  /** href of the section currently under the header ("#work"…), or null while over the hero */
  active: string | null;
  /** reduced motion (system setting OR the lab toggle) */
  reduced: boolean;
};

export const TOGGLE_EVENT = "nav-lab-toggle";

/** The destinations exactly as the homepage defines them; Contact is pulled out as the call to action. */
export function splitNav(nav: NavItem[]) {
  const contact = nav.find((n) => /contact/i.test(n.label)) ?? nav[nav.length - 1];
  return { contact, links: nav.filter((n) => n !== contact) };
}

export function Logo({ brand, className = "" }: { brand: SiteContent["brand"]; className?: string }) {
  return brand.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- official logo, fixed height
    <img src={brand.logo.src} alt={brand.logo.alt || brand.name} className={`h-8 w-auto md:h-10 ${className}`} />
  ) : (
    // the same temporary wordmark the production header uses until the official logo file is delivered
    <span className={`t-display text-2xl md:text-3xl ${className}`} aria-label={brand.name}>
      RMZ<span className="nv-dot">.</span>
    </span>
  );
}

export function useMedia(query: string, server = false) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => server,
  );
}

/**
 * Header behaviour for every direction: the header is ALWAYS visible and never changes height. Only its surface changes (transparent over the hero →
 * solid once the hero has gone under it), with a small hysteresis so it cannot flicker at the threshold. Also reports the section under the header.
 */
export function useNavState(ids: string[], force: "auto" | "image" | "solid", headerH = 92) {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const solidRef = useRef(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const hero = document.querySelector("main#top > section");
      if (hero) {
        const b = hero.getBoundingClientRect().bottom;
        const next = solidRef.current ? b <= headerH + 14 : b <= headerH;
        if (next !== solidRef.current) { solidRef.current = next; setSolid(next); }
      }
      let cur: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= headerH + window.innerHeight * 0.3) cur = `#${id}`;
      }
      setActive((a) => (a === cur ? a : cur));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    window.addEventListener("load", on);
    const ro = new ResizeObserver(on);
    ro.observe(document.body);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); window.removeEventListener("load", on); ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [ids, headerH]);
  return { solid: force === "auto" ? solid : force === "solid", active };
}

export { useOverlay } from "@/components/shell/header-parts";

/** Lab toolbar → variant: toggle the menu from outside. */
export function useToggleEvent(toggle: () => void) {
  useEffect(() => {
    window.addEventListener(TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(TOGGLE_EVENT, toggle);
  });
}

/** Small diagonal arrow used by the Contact links. */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={`nv-arrow ${className}`} width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
      <path d="M1 8 8 1M2.5 1H8v5.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** The Menu control: label + a delicate two-line icon that becomes a cross when open. */
export const MenuIcon = () => <i className="nv-ico" aria-hidden="true" />;
