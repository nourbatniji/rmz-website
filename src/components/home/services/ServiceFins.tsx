"use client";

import "./service-fins.css";
import { useId, useState, type CSSProperties } from "react";
import type { ServiceFinsContent, ServiceTaxonomyItem } from "@/content/types";

/**
 * ServiceFins — the shared service taxonomy (seven services) as architectural "fins" (approved canvas: "HOME - MINDS SECTION").
 *
 * One fin is open at a time. Desktop (≥1024px): closed fins are solid RMZ-red strips with a vertical title;
 * the open fin unrolls into a cream plate (image + number + title + description). Geometry is pure CSS from the
 * item count, so content length is free. Each fin is a real <button> (Enter/Space/click), with aria-expanded.
 *
 * Below 1024px (MOBILE PASS — pending design review) the fins become a vertical accordion so that titles stay
 * readable and targets are ≥ 60px tall; same single-open behaviour. Normal vertical scrolling throughout.
 * Missing imagery renders a labelled development placeholder with the correct proportions.
 */
export function ServiceFins({ content, services }: { content: ServiceFinsContent; services: ServiceTaxonomyItem[] }) {
  // Titles and numbers come from the shared taxonomy (name + position); only services with a fin entry are shown.
  const byId = new Map(content.items.map((c) => [c.serviceId, c]));
  const items = services.flatMap((s, i) => {
    const c = byId.get(s.id);
    return c ? [{ ...c, id: s.id, title: s.name, number: String(i + 1).padStart(2, "0") }] : [];
  });
  const uid = useId();
  const initial = Math.max(0, items.findIndex((i) => i.id === content.initialOpenId));
  const [sel, setSel] = useState(initial);
  const n = items.length;

  return (
    <section id="capabilities" aria-labelledby={`${uid}-h`} className="fins-root">
      <div className="fins-stage">
        <div className="fins-caption">
          <h2 id={`${uid}-h`} className="t-meta text-xs text-cream">
            {content.label}
          </h2>
          <p className="t-body mt-2 text-[15px] text-cream">{content.intro}</p>
        </div>

        <ul className="fins-list" style={{ "--n": n } as CSSProperties}>
          {items.map((item, i) => {
            const open = i === sel;
            // Desktop geometry: left = fins before × (closed + gap) + the open fin's extra width if it precedes.
            const left = `calc(${i} * (var(--shut) + var(--gap))${i > sel ? " + (var(--open) - var(--shut))" : ""})`;
            const style = { "--l": left, "--w": open ? "var(--open)" : "var(--shut)" } as CSSProperties;
            const plateId = `${uid}-p${i}`;
            return (
              <li key={item.id} className={`fin ${open ? "fin-open" : ""}`} style={style}>
                <button
                  type="button"
                  className="fin-cover"
                  aria-expanded={open}
                  aria-controls={plateId}
                  onClick={() => setSel(i)}
                >
                  <span className="fin-num t-meta" aria-hidden="true">
                    {item.number}
                  </span>
                  <span className="fin-title">{item.title}</span>
                  <span className="fin-icon" aria-hidden="true" />
                </button>

                <div id={plateId} role="region" aria-label={item.title} className="fin-plate">
                  <div className="fin-plate-in">
                    <div className="fin-img">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- fixed-ratio cropped plate image
                        <img
                          src={item.image.src}
                          alt={item.image.alt}
                          loading="lazy"
                          decoding="async"
                          style={{ objectPosition: item.imagePosition }}
                        />
                      ) : (
                        <div className="fin-ph t-meta text-[10px]">
                          Dev placeholder · {item.number} {item.title} · image 520×380
                        </div>
                      )}
                    </div>
                    <div className="fin-body">
                      <p className="fin-kicker t-meta">{item.number} · Service</p>
                      <p className="fin-h">{item.title}</p>
                      <p className="fin-d">{item.description}</p>
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
