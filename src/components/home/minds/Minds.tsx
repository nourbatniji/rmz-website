"use client";

import "./minds.css";
import { useId, useState, type CSSProperties } from "react";
import type { MindsContent } from "@/content/types";

/**
 * Minds — eight columns of minds / team members (formerly "ServiceFins"; canvas "HOME - MINDS SECTION"). NOT a services section:
 * the Services section is the lens (`ServicesLens`).
 *
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
export function Minds({ content }: { content: MindsContent }) {
  const { items } = content;
  const uid = useId();
  const initial = Math.max(0, items.findIndex((i) => i.id === content.initialOpenId));
  const [sel, setSel] = useState(initial);
  const n = items.length;

  return (
    <section id="minds" aria-labelledby={`${uid}-h`} className="minds-root">
      <div className="minds-stage">
        {/* Visually hidden: the section keeps an accessible name without any visible caption block. */}
        <h2 id={`${uid}-h`} className="sr-only">
          {content.label}
        </h2>

        <ul className="minds-list" style={{ "--n": n } as CSSProperties}>
          {items.map((item, i) => {
            const open = i === sel;
            // Desktop geometry: left = columns before × (closed + gap) + the open column's extra width if it precedes.
            const left = `calc(${i} * (var(--shut) + var(--gap))${i > sel ? " + (var(--open) - var(--shut))" : ""})`;
            const style = { "--l": left, "--w": open ? "var(--open)" : "var(--shut)" } as CSSProperties;
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
