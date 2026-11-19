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
 * Below 1024 px (MOBILE PASS — pending design review) the columns become a vertical accordion so all eight stay readable and
 * reachable without eight narrow columns; same single-open behaviour. Normal vertical scrolling throughout.
 * Until approved names/roles/biographies/portraits exist, entries are labelled temporary placeholders.
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// The desktop entrance reveals the columns in a SHUFFLED order. One permutation per page load (module-level, so remounts/strict mode reuse it):
// each column gets exactly one slot 0…n−1 (slot × 50 ms = its start delay). Only the reveal order is random — never positions, content or state.
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

export function Minds({ content }: { content: MindsContent }) {
  const { items } = content;
  const uid = useId();
  const initial = Math.max(0, items.findIndex((i) => i.id === content.initialOpenId));
  const [sel, setSel] = useState(initial);
  const n = items.length;
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Applied imperatively after hydration (as `--o`, desktop only reads it): the server markup and the mobile accordion keep the index order.
  useIsoLayoutEffect(() => {
    const order = getRevealOrder(n);
    listRef.current?.querySelectorAll<HTMLElement>(":scope > li").forEach((li, i) => li.style.setProperty("--o", String(order[i])));
  }, [n]);
  useEntrance(rootRef); // one-shot staggered column reveal (opacity + small lift only) — see minds.css

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
