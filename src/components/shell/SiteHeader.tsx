"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/content/types";

/**
 * Fixed site header. Desktop = approved canvas (logo left, four links right).
 * Below `md` a menu button opens a full-screen panel — MOBILE PASS, pending design review.
 */
export function SiteHeader({ brand, nav }: SiteContent) {
  const [open, setOpen] = useState(false);
  // Past the hero the header gets a solid ink bar so it never sits translucent over section content.
  // Over the hero it keeps the approved transparent gradient. Isolated to the header; hero untouched.
  const [solid, setSolid] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // Off the homepage (e.g. /work/[slug]) the section anchors must point back at the homepage; "Work" lands on the work archive.
  const pathname = usePathname();
  const onHome = pathname === "/" || pathname.startsWith("/admin/preview");
  const link = (href: string) => (onHome || !href.startsWith("#") ? href : href === "#work" ? "/#work-archive" : `/${href}`);

  useEffect(() => {
    const hero = document.querySelector("main#top > section");
    // No homepage hero (inner pages): solid bar as soon as the page scrolls.
    const update = () => setSolid(hero ? hero.getBoundingClientRect().bottom <= (ref.current?.offsetHeight ?? 92) : window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const logo = brand.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- official logo, svg/png, fixed height
    <img src={brand.logo.src} alt={brand.logo.alt || brand.name} className="h-8 w-auto md:h-10" />
  ) : (
    // TEMPORARY text wordmark until the official logo file is delivered.
    <span className="t-display text-2xl md:text-3xl" aria-label={brand.name}>
      RMZ<span className="text-yellow">.</span>
    </span>
  );

  return (
    <header ref={ref} className="fixed inset-x-0 top-0 z-50">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-200 ${solid ? "h-[var(--header-h)] border-b border-cream/10 bg-ink" : "h-28 bg-gradient-to-b from-ink/75 to-transparent md:h-36"}`}
      />
      <div className="relative flex items-center justify-between px-(--gutter) py-5 md:py-7">
        <a href={link("#top")} aria-label={`${brand.name} — home`} className="block">
          {logo}
        </a>

        <nav aria-label="Primary" className="hidden gap-11 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={link(item.href)}
              className="t-meta group relative py-1.5 text-xs text-cream"
            >
              {item.label}
              <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-yellow transition-transform duration-300 ease-out-soft group-hover:scale-x-100 group-focus-visible:scale-x-100" />
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="t-meta -mr-2 flex h-11 items-center px-2 text-xs md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="fixed inset-0 -z-10 flex flex-col justify-center gap-6 bg-ink px-(--gutter) md:hidden"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={link(item.href)}
              onClick={() => setOpen(false)}
              className="t-display text-5xl text-cream active:text-yellow"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
