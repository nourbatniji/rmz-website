"use client";

import { useEffect, type RefObject } from "react";

/** Small pieces of the site header (also used by the /lab/navigation reference). */

/** Small diagonal arrow used by the Contact link. */
export function Arrow() {
  return (
    <svg className="sh-arrow" width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
      <path d="M1 8 8 1M2.5 1H8v5.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** The Menu control's delicate two-line icon; it becomes a cross while the menu is open (the header's `.is-open`). */
export const MenuIcon = () => <i className="sh-ico" aria-hidden="true" />;

/**
 * Overlay behaviour for the menu: Escape closes, focus moves into the panel and is trapped (panel + its trigger), the page behind is `inert`, scrolling is contained with
 * `overflow:hidden` (+ a stable scrollbar gutter, so nothing shifts) and the scroll position is left untouched. Focus returns to the trigger on close unless a link was
 * followed (then the link target owns focus).
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
    const main = document.querySelector("main");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panel/trigger/followed are refs; `close` only sets state
  }, [open]);
}
