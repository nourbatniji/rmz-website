"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { FooterContent } from "@/content/closing-types";
import { ContactSection, type Variant } from "./ContactSection";
import { ContactDemoProvider, useContactDemo } from "./store";
import "./contact-lab.css";

/**
 * Lab only (/lab/contact). Three restrained Contact prototypes between the REAL site header and the REAL work archive
 * (the section that precedes the footer/contact on the homepage). Not linked, not indexed. The production footer, homepage and header are untouched.
 * The comparison bar is a separate fixed element: it is not part of any design.
 * Typed values, validation and the demo submit state live in ContactDemoProvider, above the directions, so they survive switching.
 *
 * The production header is transparent with cream links. In the lab only, `html[data-lt-hdr]` (set below, removed on unmount) gives it a solid,
 * readable surface that matches the active direction (see contact-lab.css). Nothing in the header's own files changes.
 */
const VARIANTS: { id: Variant; name: string }[] = [
  { id: "A", name: "Ink" },
  { id: "B", name: "Cream" },
  { id: "C", name: "Quiet division" },
];
const isV = (x: string | null): x is Variant => x === "A" || x === "B" || x === "C";

function Stage({ footer, before, v }: { footer: FooterContent; before: ReactNode; v: Variant }) {
  useEffect(() => {
    document.documentElement.dataset.ltHdr = v === "B" ? "cream" : "ink";
    return () => {
      delete document.documentElement.dataset.ltHdr;
    };
  }, [v]);
  return (
    <main id="top" className="lt-stage">
      <div className="lt-ctx" aria-hidden="true" inert>
        <div className="lt-ctx-in">{before}</div>
      </div>
      <div id="contact" className="lt-anchor">
        <ContactSection variant={v} footer={footer} />
      </div>
    </main>
  );
}

function Bar({ v, pick }: { v: Variant; pick: (v: Variant) => void }) {
  const { outcome, setOutcome, reset, status } = useContactDemo();
  const [more, setMore] = useState(false);
  return (
    <div className="lt-lab" role="toolbar" aria-label="Contact lab controls (lab only, not part of the design)">
      <div className="lt-lab-main">
        <span className="lt-lab-tag">Lab · demo only, nothing is sent</span>
        <div className="lt-lab-seg" role="group" aria-label="Direction">
          {VARIANTS.map((x) => (
            <button key={x.id} type="button" aria-pressed={v === x.id} title={x.name} onClick={() => pick(x.id)}>
              {x.id}
              <span className="lt-lab-nm"> · {x.name}</span>
            </button>
          ))}
        </div>
        <button type="button" className="lt-lab-more" aria-expanded={more} aria-controls="lt-lab-extra" onClick={() => setMore((m) => !m)}>
          {more ? "Less" : "More"}
        </button>
      </div>
      <div id="lt-lab-extra" className="lt-lab-extra" hidden={!more}>
        <div className="lt-lab-seg" role="group" aria-label="Next demo submit">
          <span className="lt-lab-lbl">Submit</span>
          <button type="button" aria-pressed={outcome === "ok"} onClick={() => setOutcome("ok")}>
            Succeeds
          </button>
          <button type="button" aria-pressed={outcome === "fail"} onClick={() => setOutcome("fail")}>
            Fails
          </button>
        </div>
        <div className="lt-lab-seg" role="group" aria-label="Actions">
          <button type="button" disabled={status === "idle"} onClick={reset}>
            Reset form
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContactLab({ footer, before }: { footer: FooterContent; before: ReactNode }) {
  const q = useSearchParams();
  const [v, setV] = useState<Variant>(isV(q.get("v")) ? (q.get("v") as Variant) : "A");

  const pick = (id: Variant) => {
    setV(id);
    const u = new URL(window.location.href);
    u.searchParams.set("v", id);
    window.history.replaceState(null, "", u);
    // keep the section in the same place on screen so the directions compare like for like
    requestAnimationFrame(() => document.getElementById("contact")?.scrollIntoView({ behavior: "instant" }));
  };

  return (
    <ContactDemoProvider>
      <Stage footer={footer} before={before} v={v} />
      <Bar v={v} pick={pick} />
    </ContactDemoProvider>
  );
}
