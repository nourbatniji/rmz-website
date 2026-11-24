"use client";

import { useState } from "react";
import { Heading, Logo, optical, useMedia, type CollabProps } from "./shared";

/**
 * C — THE TYPOGRAPHIC EXCHANGE. A spacious, static composition of logos. On hover or keyboard focus a logo slides up through a vertical mask and the client's name (in the project's
 * editorial italic) slides in from below inside the same reserved footprint; leaving reverses it, and neighbours never move. On touch the logos stay visible by default and a tap
 * optionally swaps one (tap again to return). The name is always available to assistive technology and never depends on hover. Reduced motion swaps instantly.
 */
export function CollabC({ label, headingLead, headingEmphasis, partners }: CollabProps) {
  const phone = useMedia("(max-width: 767px)");
  const [on, setOn] = useState<number[]>([]);
  const set = (i: number, v: boolean) => setOn((s) => (v ? (s.includes(i) ? s : [...s, i]) : s.filter((x) => x !== i)));
  return (
    <section className="cb cb-c" aria-labelledby="cb-c-h">
      <div className="cb-wrap">
        <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
        <ul className="cb-ex-grid">
          {partners.map((p, i) => (
            <li key={p.name} className="cb-ex-li">
              <div
                role="group"
                tabIndex={0}
                aria-label={p.name}
                className={`cb-ex-cell${on.includes(i) ? " is-name" : ""}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && set(i, true)}
                onPointerLeave={(e) => e.pointerType === "mouse" && set(i, false)}
                onFocus={() => set(i, true)}
                onBlur={() => set(i, false)}
                onPointerUp={(e) => { if (e.pointerType !== "mouse") set(i, !on.includes(i)); }}
              >
                <div className="cb-ex-mask">
                  <div className="cb-ex-logo"><Logo p={p} width={optical(p, phone ? 5200 : 8800, phone ? 96 : 130, phone ? 170 : 290, phone ? 64 : 88)} /></div>
                  <div className="cb-ex-name" aria-hidden="true">{p.name}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
