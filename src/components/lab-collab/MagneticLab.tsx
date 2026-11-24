"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { CollectiveContent } from "@/content/closing-types";
import { MagneticCollab } from "./MagneticCollab";
import { useMedia } from "./shared";
import "./collab-lab.css"; // shared lab chrome (toolbar, device frame, surrounding-section clipping)
import "./magnetic.css";

/** Lab only (/lab/collaborations-magnetic): the magnetic prototype between the REAL work archive and footer, with a small review toolbar. */
function Stage({ content, before, after, reduce }: { content: CollectiveContent; before: ReactNode; after: ReactNode; reduce: boolean }) {
  const sys = useMedia("(prefers-reduced-motion: reduce)");
  return (
    <main id="top" className="cb-stage">
      <div className="cb-ctx cb-ctx-before" aria-hidden="true" inert><div className="cb-ctx-in">{before}</div></div>
      <div id="collab-proto">
        <MagneticCollab label={content.label} headingLead={content.headingLead} headingEmphasis={content.headingEmphasis} partners={content.partners} reduced={sys || reduce} />
      </div>
      <div className="cb-ctx cb-ctx-after" aria-hidden="true" inert><div className="cb-ctx-in">{after}</div></div>
    </main>
  );
}

function Seg({ label, items }: { label: string; items: { id: string; text: string; on: boolean; fn: () => void }[] }) {
  return (
    <div className="lab-seg" role="group" aria-label={label}>
      <span className="lab-lbl">{label}</span>
      {items.map((it) => (<button key={it.id} type="button" aria-pressed={it.on} onClick={it.fn}>{it.text}</button>))}
    </div>
  );
}

export function MagneticLab(props: { content: CollectiveContent; before: ReactNode; after: ReactNode }) {
  const q = useSearchParams();
  const embed = q.get("embed") === "1";
  const [reduce, setReduce] = useState(q.get("reduce") === "1");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!embed) return;
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "mg-set") setReduce(!!e.data.reduce); if (e.data?.type === "mg-cmd") document.getElementById("collab-proto")?.scrollIntoView({ behavior: "instant" }); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [embed]);
  if (embed) return <Stage {...props} reduce={reduce} />;
  const push = () => frame.current?.contentWindow?.postMessage({ type: "mg-set", reduce }, "*");
  return (
    <>
      {device === "desktop" ? (
        <Stage {...props} reduce={reduce} />
      ) : (
        <div className="lab-device-wrap">
          <iframe ref={frame} title="Mobile preview" className="lab-device" src="/lab/collaborations-magnetic?embed=1" onLoad={() => { push(); frame.current?.contentWindow?.postMessage({ type: "mg-cmd" }, "*"); }} />
          <p className="lab-caption t-meta">390 × 844</p>
        </div>
      )}
      <div className="lab-bar" role="toolbar" aria-label="Magnetic collaborations lab controls (lab only)">
        <p className="lab-warn">Lab placeholders: the logos are placeholder wordmarks, not real RMZ clients — real SVG/PNG artwork plugs into the same component (<code>partners[].logo</code>).</p>
        <Seg label="View" items={[{ id: "s", text: "Jump to section", on: false, fn: () => (device === "mobile" ? frame.current?.contentWindow?.postMessage({ type: "mg-cmd" }, "*") : document.getElementById("collab-proto")?.scrollIntoView({ behavior: "instant" })) }]} />
        <Seg label="Motion" items={[{ id: "n", text: "Normal", on: !reduce, fn: () => { setReduce(false); setTimeout(push, 0); } }, { id: "r", text: "Reduced", on: reduce, fn: () => { setReduce(true); setTimeout(push, 0); } }]} />
        <Seg label="Device" items={[{ id: "d", text: "Desktop", on: device === "desktop", fn: () => setDevice("desktop") }, { id: "m", text: "Mobile", on: device === "mobile", fn: () => setDevice("mobile") }]} />
      </div>
    </>
  );
}
