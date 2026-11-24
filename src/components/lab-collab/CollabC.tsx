"use client";

import { useState } from "react";
import { Heading, Logo, optical, useMedia, type CollabProps } from "./shared";

/**
 * C — TYPOGRAPHIC ROSTER. The client names set as a quiet list; the selected name is brighter with a small red mark, and its logo appears in one reserved stage beside the list
 * (all logos are stacked in the stage, so switching only changes opacity — nothing moves). The first entry is selected by default. Hover or focus previews, click or tap selects.
 * Phones: the stage stays at the top of the section while the list scrolls under it; tap a name to select.
 */
export function CollabC({ label, headingLead, headingEmphasis, partnerLine, placeholderNote, partners }: CollabProps) {
  const [sel, setSel] = useState(0);
  const [peek, setPeek] = useState(-1);
  const phone = useMedia("(max-width: 767px)");
  const show = peek >= 0 ? peek : sel;
  const cur = partners[show];
  return (
    <section className="cb cb-c" aria-labelledby="cb-c-h">
      <div className="cb-wrap">
        <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
        <div className="cb-c-body">
          <div className="cb-c-stage" aria-live="polite">
            <div className="cb-c-logos">
              {partners.map((p, i) => (
                <div key={p.name} className="cb-c-logo" style={{ opacity: i === show ? 1 : 0 }} aria-hidden={i !== show}>
                  <Logo p={p} width={optical(p, phone ? 9000 : 26000, phone ? 120 : 200, phone ? 230 : 420, phone ? 84 : 150)} />
                </div>
              ))}
            </div>
            <p className="cb-c-role">{cur.role}</p>
            <p className="cb-c-line">{cur.copyStatus === "placeholder" ? partnerLine : " "}</p>
          </div>
          <ul className="cb-c-list" role="listbox" aria-label="Collaborations">
            {partners.map((p, i) => (
              <li key={p.name} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === sel}
                  className={`cb-c-row${i === sel ? " sel" : ""}${i === peek ? " peek" : ""}`}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setPeek(i)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setPeek(-1)}
                  onFocus={() => setPeek(i)}
                  onBlur={() => setPeek(-1)}
                  onClick={() => setSel(i)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="cb-note">{placeholderNote}</p>
      </div>
    </section>
  );
}
