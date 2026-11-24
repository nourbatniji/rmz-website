"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import type { CollectivePartner } from "@/content/closing-types";
import { WORDMARKS, Wordmark } from "@/components/home/collective/wordmarks";

/** Shared pieces of the four Collaborations prototypes (lab only). One dataset (the real closing content), sized by optical weight, never boxed. */

export type Partner = CollectivePartner;
export type CollabProps = {
  label: string;
  headingLead: string;
  headingEmphasis: string;
  hint: string;
  partnerLine: string;
  placeholderNote: string;
  partners: Partner[];
  reduced: boolean;
};

export const aspectOf = (p: Partner) => (p.logo ? p.logo.width / p.logo.height : WORDMARKS[p.mark].w / WORDMARKS[p.mark].h);

/** Width that gives every mark about the same visual weight: area ≈ constant, so wide wordmarks are not taller and compact ones are not tiny. */
export function optical(p: Partner, area: number, minW: number, maxW: number, maxH: number) {
  const a = aspectOf(p);
  let w = Math.sqrt(area * a);
  w = Math.min(maxW, Math.max(minW, w));
  if (w / a > maxH) w = maxH * a;
  return Math.round(w);
}

export function Logo({ p, width }: { p: Partner; width: number }) {
  return p.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- approved partner artwork, sized by optical weight
    <img src={p.logo.src} alt={p.name} width={width} height={Math.round((width * p.logo.height) / p.logo.width)} loading="lazy" decoding="async" />
  ) : (
    <Wordmark id={p.mark} width={width} label={p.name} />
  );
}

export function useMedia(query: string, server = false) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => server,
  );
}

/** Hover (mouse) / keyboard focus reveal a partner; a tap or Enter/Space pins it, a second one clears it. */
export function useSelect() {
  const [hover, setHover] = useState(-1);
  const [pin, setPin] = useState(-1);
  const active = hover >= 0 ? hover : pin;
  const bind = (i: number) => ({
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setHover(i); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setHover(-1); },
    onFocus: () => setHover(i),
    onBlur: () => setHover(-1),
    onClick: () => setPin((v) => (v === i ? -1 : i)),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPin((v) => (v === i ? -1 : i)); }
      if (e.key === "Escape") { setPin(-1); setHover(-1); }
    },
  });
  return { active, pin, setPin, bind };
}

/**
 * One partner entry. A partner with a destination is a real link; one without is NOT styled or announced as a link (no pointer cursor, no underline) —
 * it is a keyboard-focusable group so that its details can still be revealed by focus.
 */
export function Entry({ p, i, bind, className = "", pressed, quiet = false, children }: { p: Partner; i: number; bind: (i: number) => Record<string, unknown>; className?: string; pressed?: boolean; quiet?: boolean; children: ReactNode }) {
  const props = bind(i);
  if (p.href) return <a href={p.href} className={`cb-entry is-link ${className}`} aria-label={`${p.name}, ${p.role}`} {...props}>{children}</a>;
  if (quiet) return <div className={`cb-entry ${className}`}>{children}</div>;
  return (
    <div role="group" tabIndex={0} className={`cb-entry ${className}`} aria-label={`${p.name}, ${p.role}${p.copyStatus === "placeholder" ? " (placeholder)" : ""}`} data-pressed={pressed ? "1" : undefined} {...props}>
      {children}
    </div>
  );
}

/** The single reserved caption area: name, role and (only when it exists) the extra line. Always the same height — nothing below it moves. */
export function Caption({ cur, hint, line }: { cur: Partner | null; hint: string; line: string }) {
  return (
    <div className="cb-cap" aria-live="polite">
      <p className="cb-cap-name" style={{ opacity: cur ? 1 : 0.5 }}>{cur ? cur.name : hint}</p>
      <p className="cb-cap-role">{cur?.role ?? " "}</p>
      <p className="cb-cap-line">{cur && cur.copyStatus === "placeholder" ? line : " "}</p>
    </div>
  );
}

export function Heading({ label, lead, emphasis }: { label: string; lead: string; emphasis: string }) {
  return (
    <div className="cb-head">
      <p className="cb-label">{label}</p>
      <h2 className="cb-h">{lead} <span className="cb-iv">{emphasis}</span></h2>
    </div>
  );
}

