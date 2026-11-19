"use client";

import "./minds.css";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { MindsContent } from "@/content/types";
import { useEntrance } from "@/lib/use-entrance";

/**
 * Minds — eight columns of minds / team members (formerly "ServiceFins"; canvas "HOME - MINDS SECTION"). NOT a services section:
 * the Services section is the lens (`ServicesLens`).
 *
 * Layout: a flat red space (80 px desktop / 40 px mobile, same red as the lens) sits above the columns, in normal flow; nothing under them.
 * No visible label/caption: the section is exactly as tall as the columns (an sr-only heading names it).
 * Exactly eight columns, one open at a time. Desktop (≥ 1024 px): the columns span the FULL viewport width, first and last flush
 * against the edges; closed columns are red strips with a vertical name, the open column unrolls into a cream plate (portrait +
 * number + name + role + biography). Geometry is pure CSS from the item count (container units), so nothing overflows whichever
 * column is open. Each column is a real <button> (Enter/Space/click) with aria-expanded.
 *
 * Desktop entrance: the columns grow DOWNWARD from their fixed top edge as the page scrolls (scroll-linked clip, shuffled per-column offsets).
 *
 * Below 1024 px (MOBILE PASS — pending design review) the columns become a vertical accordion so all eight stay readable and
 * reachable without eight narrow columns; same single-open behaviour. Normal vertical scrolling throughout.
 * Until approved names/roles/biographies/portraits exist, entries are labelled temporary placeholders.
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Desktop scroll reveal: each column has its own slot 0…n−1 in ONE shuffled permutation per page load (module-level, so remounts/strict mode reuse it).
// The slot only offsets when that column starts/finishes growing (irregular, not left→right) — never positions, content or state.
let revealOrder: number[] | null = null;
function getRevealOrder(n: number): number[] {
  if (revealOrder && revealOrder.length === n) return revealOrder;
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  revealOrder = a;
  return a;
}

const DESKTOP = "(min-width: 1024px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function Minds({ content }: { content: MindsContent }) {
  const { items } = content;
  const uid = useId();
  const initial = Math.max(0, items.findIndex((i) => i.id === content.initialOpenId));
  const [sel, setSel] = useState(initial);
  const n = items.length;
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Desktop scroll-linked reveal. The columns are laid out at their FINAL size from the start (nothing reflows); each `.mind` (the single outer wrapper
  // holding the red panel, the cream card, portrait, name, role, biography — everything) is masked from the bottom with clip-path, its top edge fixed at
  // the junction; nothing is scaled, translated or faded. Everything starts completely hidden (0 %). `--rp` (0…1) is a pure function of the scroll
  // position: stopping holds the exact state, scrolling back retracts to fully hidden along the same path, jumps show the right state. No timers.
  // It begins when the section's top boundary reaches 80 % of the usable viewport (below the fixed header) and completes once the whole list fits
  // on screen (so the growing front stays visible). Nothing is applied for reduced motion, mobile or without JS (server markup = complete).
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;
    const order = getRevealOrder(n);
    list.querySelectorAll<HTMLElement>(":scope > li").forEach((li, i) => li.style.setProperty("--o", String(order[i])));
    const desktop = window.matchMedia(DESKTOP);
    const reduced = window.matchMedia(REDUCED);
    let raf = 0;
    const apply = () => {
      raf = 0;
      if (!desktop.matches || reduced.matches) {
        root.removeAttribute("data-reveal");
        list.style.removeProperty("--rp");
        return;
      }
      root.dataset.reveal = "on";
      const vh = window.innerHeight;
      const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
      const start = hh + 0.8 * (vh - hh); // section top at 80 % of the usable viewport (below the header) → reveal begins
      const above = parseFloat(getComputedStyle(root).paddingTop) || 0; // the flat red space above the columns
      const end = vh - list.offsetHeight - 20 - above; // section top at which the complete list (final height) is on screen
      const D = clamp(start - end, 380, 760);
      const rp = clamp((start - root.getBoundingClientRect().top) / D, 0, 1);
      list.style.setProperty("--rp", rp.toFixed(4));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    desktop.addEventListener("change", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      desktop.removeEventListener("change", schedule);
      reduced.removeEventListener("change", schedule);
      root.removeAttribute("data-reveal");
      list.style.removeProperty("--rp");
    };
  }, [n]);
  useEntrance(rootRef, { mediaQuery: "(max-width: 1023.98px)" }); // mobile accordion only: unchanged one-shot staggered lift (see minds.css)

  return (
    <section ref={rootRef} id="minds" aria-labelledby={`${uid}-h`} className="minds-root">
      <div className="minds-stage">
        {/* Visually hidden: the section keeps an accessible name without any visible caption block. */}
        <h2 id={`${uid}-h`} className="sr-only">
          {content.label}
        </h2>

        <ul ref={listRef} className="minds-list" style={{ "--n": n } as CSSProperties}>
          {items.map((item, i) => {
            const open = i === sel;
            // Desktop geometry: left = columns before × (closed + gap) + the open column's extra width if it precedes.
            const left = `calc(${i} * (var(--shut) + var(--gap))${i > sel ? " + (var(--open) - var(--shut))" : ""})`;
            const style = { "--l": left, "--w": open ? "var(--open)" : "var(--shut)", "--i": i } as CSSProperties;
            const plateId = `${uid}-p${i}`;
            return (
              <li key={item.id} className={`mind ${open ? "mind-open" : ""}`} style={style}>
                <button type="button" className="mind-cover" aria-expanded={open} aria-controls={plateId} onClick={() => setSel(i)}>
                  <span className="mind-num t-meta" aria-hidden="true">
                    {item.number}
                  </span>
                  <span className="mind-title">{item.name}</span>
                  <span className="mind-icon" aria-hidden="true" />
                </button>

                <div id={plateId} role="region" aria-label={item.name} className="mind-plate">
                  <div className="mind-plate-in">
                    <div className="mind-img">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- fixed-ratio cropped portrait
                        <img src={item.image.src} alt={item.image.alt} loading="lazy" decoding="async" style={{ objectPosition: item.imagePosition }} />
                      ) : (
                        <div className="mind-ph t-meta text-[10px]">
                          Temporary placeholder · {item.number} {item.name} · portrait 520×380
                        </div>
                      )}
                    </div>
                    <div className="mind-body">
                      <p className="mind-kicker t-meta">
                        {item.number} · {item.role}
                      </p>
                      <p className="mind-h">{item.name}</p>
                      <p className="mind-d">{item.bio}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
