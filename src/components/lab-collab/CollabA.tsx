"use client";

import { Caption, Entry, Heading, Logo, optical, useMedia, useSelect, type CollabProps } from "./shared";

/**
 * A — EDITORIAL INDEX. A small heading, then the marks set loosely on a four-column rhythm (columns 2 and 4 sit a little lower), each sized to the same optical weight —
 * no cards, no boxes. Hover or keyboard focus dims the others and fills ONE reserved caption area under the index (name, role, extra line): nothing moves.
 * Phones: two columns; tap selects, and the caption stays pinned to the bottom of the screen while the index scrolls normally.
 */
export function CollabA({ label, headingLead, headingEmphasis, hint, partnerLine, placeholderNote, partners }: CollabProps) {
  const { active, pin, bind } = useSelect();
  const phone = useMedia("(max-width: 767px)");
  const cur = active >= 0 ? partners[active] : null;
  return (
    <section className={`cb cb-a${active >= 0 ? " has" : ""}`} aria-labelledby="cb-a-h">
      <div className="cb-wrap">
        <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
        <ul className="cb-a-index">
          {partners.map((p, i) => (
            <li key={p.name} className={`cb-a-cell${i === active ? " sel" : ""}`}>
              <Entry p={p} i={i} bind={bind} pressed={pin === i}>
                <Logo p={p} width={optical(p, phone ? 4800 : 6400, phone ? 84 : 104, phone ? 150 : 232, phone ? 60 : 66)} />
              </Entry>
            </li>
          ))}
        </ul>
        <div className="cb-a-capwrap"><Caption cur={cur} hint={hint} line={partnerLine} /></div>
        <p className="cb-note">{placeholderNote}</p>
      </div>
    </section>
  );
}
