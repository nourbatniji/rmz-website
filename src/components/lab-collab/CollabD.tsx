"use client";

import { Entry, Heading, Logo, optical, useMedia, useSelect, type CollabProps } from "./shared";

/**
 * PROVISIONAL grouping — which partners are "featured" is a layout study, NOT an approved hierarchy. It is just a list of indices into the shared dataset; change it here
 * (or pass `featured`) and the composition follows. Nothing in the content marks a partner as more important than another.
 */
export const FEATURED_DEFAULT = [0, 1, 8];

/**
 * D — FEATURED PARTNERS + ROSTER. An asymmetric composition: a few optically larger marks set at staggered positions with their name and role always visible, and a quieter,
 * smaller roster of everyone else filling the other side. Every partner is visible at once (no inner scrolling). Hover or focus in the roster dims the rest and names the mark in
 * its reserved line. Phones: the featured marks stack with alternating alignment, the roster becomes a three-column grid, tap names the mark.
 */
export function CollabD({ label, headingLead, headingEmphasis, hint, partnerLine, placeholderNote, partners, featured = FEATURED_DEFAULT }: CollabProps & { featured?: number[] }) {
  const { active, pin, bind } = useSelect();
  const phone = useMedia("(max-width: 767px)");
  const feat = featured.filter((i) => i < partners.length);
  const rest = partners.map((_, i) => i).filter((i) => !feat.includes(i));
  const cur = active >= 0 ? partners[active] : null;
  return (
    <section className={`cb cb-d${active >= 0 ? " has" : ""}`} aria-labelledby="cb-d-h">
      <div className="cb-wrap">
        <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
        <div className="cb-d-body">
          <ul className="cb-d-feat">
            {feat.map((i, k) => {
              const p = partners[i];
              return (
                <li key={p.name} className={`cb-d-f cb-d-f${k}`}>
                  <Entry p={p} i={i} bind={() => ({})} quiet>
                    <Logo p={p} width={optical(p, phone ? 14000 : [52000, 40000, 34000][k] ?? 30000, phone ? 150 : 200, phone ? 270 : [470, 360, 320][k] ?? 300, phone ? 110 : 190)} />
                  </Entry>
                  <p className="cb-d-fname">{p.name}<span>{p.role}</span></p>
                </li>
              );
            })}
          </ul>
          <div className="cb-d-roster">
            <ul className="cb-d-rgrid">
              {rest.map((i) => {
                const p = partners[i];
                return (
                  <li key={p.name} className={`cb-d-r${i === active ? " sel" : ""}`}>
                    <Entry p={p} i={i} bind={bind} pressed={pin === i}>
                      <Logo p={p} width={optical(p, phone ? 3400 : 3000, phone ? 62 : 66, phone ? 104 : 118, phone ? 52 : 40)} />
                    </Entry>
                  </li>
                );
              })}
            </ul>
            <p className="cb-d-rcap" aria-live="polite">{cur ? <>{cur.name}<span>{cur.role}{cur.copyStatus === "placeholder" ? ` · ${partnerLine}` : ""}</span></> : <i>{hint}</i>}</p>
          </div>
        </div>
        <p className="cb-note">{placeholderNote} · Featured grouping is provisional and configurable.</p>
      </div>
    </section>
  );
}
