"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
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

/**
 * Overlay behaviour shared by every menu: Escape closes, focus moves into the panel and is trapped (panel + its trigger), the page behind is `inert`,
 * scrolling is contained with `overflow:hidden` (+ a stable scrollbar gutter, so nothing shifts) and the scroll position is simply left untouched.
 * Focus returns to the trigger on close (unless a link was followed — then the link target owns focus).
 */
export function useOverlay(open: boolean, close: () => void, panel: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null>, followed: RefObject<boolean>) {
  useEffect(() => {
    if (!open) return;
    const root = panel.current;
    if (!root) return;
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    const main = document.querySelector("main#top");
    const trig = trigger.current;
    main?.setAttribute("inert", "");
    const focusables = () => [...root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")].filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed");
    const raf = requestAnimationFrame(() => focusables()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const list = [...focusables(), ...(trigger.current ? [trigger.current] : [])];
      if (!list.length) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : i === list.length - 1 ? 0 : i + 1;
      e.preventDefault();
      list[next].focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prev.overflow;
      html.style.scrollbarGutter = prev.gutter;
      main?.removeAttribute("inert");
      if (!followed.current) trig?.focus({ preventScroll: true });
      followed.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panel/trigger/followed are refs; close is stable enough for a prototype
  }, [open]);
}

/** Lab toolbar → variant: toggle the menu from outside. */
export function useToggleEvent(toggle: () => void) {
  useEffect(() => {
    window.addEventListener(TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(TOGGLE_EVENT, toggle);
  });
}
