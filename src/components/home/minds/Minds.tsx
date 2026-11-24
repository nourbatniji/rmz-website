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
    // One shared progress value, lightly smoothed: `target` is the exact scroll-derived progress; `cur` (what is rendered as --rp) eases toward it with
    // frame-rate-independent exponential damping (time constant TAU → ≈ 95 % of a change in ≈ 3·TAU ≈ 135 ms, same in both directions). Each column's
    // shuffled offset is derived from `cur` in CSS. The loop runs only while cur ≠ target: it snaps to the exact target within a tiny tolerance (so the
    // hidden and fully revealed endpoints are exact) and then stops. Big jumps (anchors, fast flicks, a stalled frame) snap immediately.
    const TAU = 45;
    const SNAP = 0.002; // ≈ 1.4 px of scroll
    const JUMP = 0.3; // ≈ 210 px of scroll within one frame → no trailing, show the position at once
    let raf = 0;
    let last = 0;
    let cur = -1; // -1 = not yet rendered
    const write = (v: number) => {
      cur = v;
      list.style.setProperty("--rp", v === 0 ? "0" : v === 1 ? "1" : v.toFixed(4));
    };
    const target = (): number => {
      const vh = window.innerHeight;
      const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
      const start = hh + 0.8 * (vh - hh); // section top at 80 % of the usable viewport (below the header) → reveal begins
      const above = parseFloat(getComputedStyle(root).paddingTop) || 0; // the flat red space above the columns
      const end = vh - list.offsetHeight - 20 - above; // section top at which the complete list (final height) is on screen
      const D = clamp(start - end, 380, 760);
      return clamp((start - root.getBoundingClientRect().top) / D, 0, 1);
    };
    const enabled = () => desktop.matches && !reduced.matches;
    const off = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      cur = -1;
      root.removeAttribute("data-reveal");
      list.style.removeProperty("--rp");
    };
    const tick = (now: number) => {
      raf = 0;
      if (!enabled()) return off();
      root.dataset.reveal = "on";
      const t = target();
      const dt = last ? now - last : 16;
      last = now;
      if (cur < 0 || dt > 100 || Math.abs(t - cur) > JUMP) return write(t); // first paint, stalled frame or large jump: immediate
      const d = t - cur;
      if (Math.abs(d) <= SNAP) return write(t); // settled: exact endpoint, loop stops
      write(cur + d * (1 - Math.exp(-dt / TAU)));
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const resnap = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!enabled()) return off();
      root.dataset.reveal = "on";
      write(target());
    };
    resnap();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", resnap);
    desktop.addEventListener("change", resnap);
    reduced.addEventListener("change", resnap);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", resnap);
      desktop.removeEventListener("change", resnap);
      reduced.removeEventListener("change", resnap);
      off();
    };
  }, [n]);
  // Phone / tablet accordion: every row starts shut; the first time the list scrolls into view, Mind 04 drops open by itself (unless the visitor already tapped a row).
  // Desktop keeps its initially open column.
  const touched = useRef(false);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const mq = window.matchMedia(DESKTOP);
    let io: IntersectionObserver | null = null;
    const arm = () => {
      io?.disconnect();
      io = null;
      if (mq.matches) {
        setSel((s) => (s < 0 ? initial : s));
        return;
      }
      if (touched.current) return;
      setSel(-1);
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting) || touched.current) return;
          touched.current = true;
          io?.disconnect();
          setSel(Math.min(3, n - 1));
        },
        { rootMargin: "0px 0px -35% 0px", threshold: 0.2 },
      );
      io.observe(list);
    };
    arm();
    mq.addEventListener("change", arm);
    return () => {
      mq.removeEventListener("change", arm);
      io?.disconnect();
    };
  }, [n, initial]);
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
                <button type="button" className="mind-cover" aria-expanded={open} aria-controls={plateId} onClick={() => { touched.current = true; setSel(i); }}>
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
