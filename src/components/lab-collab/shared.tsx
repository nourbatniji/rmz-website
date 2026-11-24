"use client";

import { useSyncExternalStore } from "react";
import type { CollectivePartner } from "@/content/closing-types";
import { WORDMARKS, Wordmark } from "@/components/home/collective/wordmarks";

/** Shared pieces of the four Collaborations prototypes (lab only). One dataset (the real closing content), sized by optical weight, never boxed. */

export type Partner = CollectivePartner;
export type CollabProps = {
  label: string;
  headingLead: string;
  headingEmphasis: string;
  partners: Partner[];
  /** reduced motion (system setting or the lab toggle): every direction shows a complete static roster */
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

export function Heading({ label, lead, emphasis }: { label: string; lead: string; emphasis: string }) {
  return (
    <div className="cb-head">
      <p className="cb-label">{label}</p>
      <h2 className="cb-h">{lead} <span className="cb-iv">{emphasis}</span></h2>
    </div>
  );
}

