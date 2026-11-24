"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { CollectiveContent } from "@/content/closing-types";
import { CollabA } from "./CollabA";
import { CollabB } from "./CollabB";
import { CollabC } from "./CollabC";
import { useMedia } from "./shared";
import "./collab-lab.css";

/** Lab only (/lab/collaborations): four structurally different Collaborations prototypes between the REAL preceding (work archive) and following (footer) sections. */

type V = "A" | "B" | "C";
type Cfg = { v: V; few: boolean; reduce: boolean };
const VARIANTS: { id: V; name: string }[] = [
  { id: "A", name: "Switchboard" },
  { id: "B", name: "Turning wall" },
  { id: "C", name: "Typographic exchange" },
];
const FEW = 5;
const isV = (x: string | null): x is V => x === "A" || x === "B" || x === "C";

function Stage({ content, before, after, cfg }: { content: CollectiveContent; before: ReactNode; after: ReactNode; cfg: Cfg }) {
  const sys = useMedia("(prefers-reduced-motion: reduce)");
  const partners = useMemo(() => (cfg.few ? content.partners.slice(0, FEW) : content.partners), [content.partners, cfg.few]);
  const props = { label: content.label, headingLead: content.headingLead, headingEmphasis: content.headingEmphasis, partners, reduced: sys || cfg.reduce };
  useEffect(() => {
    document.documentElement.dataset.cbReduce = cfg.reduce ? "1" : "0";
    return () => { delete document.documentElement.dataset.cbReduce; };
  }, [cfg.reduce]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "cb-cmd") return;
      if (e.data.cmd === "section") document.getElementById("collab-proto")?.scrollIntoView({ behavior: "instant" });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return (
    <main id="top" className="cb-stage">
      <div className="cb-ctx cb-ctx-before" aria-hidden="true" inert><div className="cb-ctx-in">{before}</div></div>
      <div id="collab-proto" key={`${cfg.v}-${cfg.few}`}>
        {cfg.v === "A" && <CollabA {...props} />}
        {cfg.v === "B" && <CollabB {...props} />}
        {cfg.v === "C" && <CollabC {...props} />}
      </div>
      <div className="cb-ctx cb-ctx-after" aria-hidden="true" inert><div className="cb-ctx-in">{after}</div></div>
    </main>
  );
}

function Embedded(props: { content: CollectiveContent; before: ReactNode; after: ReactNode }) {
  const q = useSearchParams();
  const [cfg, setCfg] = useState<Cfg>({ v: isV(q.get("v")) ? (q.get("v") as V) : "A", few: q.get("few") === "1", reduce: q.get("reduce") === "1" });
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "cb-set") setCfg((c) => ({ ...c, ...e.data.cfg })); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return <Stage {...props} cfg={cfg} />;
}

function Seg({ label, items }: { label: string; items: { id: string; text: string; on: boolean; fn: () => void }[] }) {
  return (
    <div className="lab-seg" role="group" aria-label={label}>
      <span className="lab-lbl">{label}</span>
      {items.map((it) => (
        <button key={it.id} type="button" aria-pressed={it.on} onClick={it.fn}>{it.text}</button>
      ))}
    </div>
  );
}

function Review({ content, before, after, initialV, initialFew, initialReduce }: { content: CollectiveContent; before: ReactNode; after: ReactNode; initialV: V; initialFew: boolean; initialReduce: boolean }) {
  const [v, setV] = useState<V>(initialV);
  const [few, setFew] = useState(initialFew);
  const [reduce, setReduce] = useState(initialReduce);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const frame = useRef<HTMLIFrameElement>(null);
  const cfg: Cfg = { v, few, reduce };
  const pick = (id: V) => {
    setV(id);
    const u = new URL(window.location.href);
    u.searchParams.set("v", id);
    window.history.replaceState(null, "", u);
  };
  const push = () => frame.current?.contentWindow?.postMessage({ type: "cb-set", cfg }, "*");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- push reads the current cfg; run it when the config changes
  useEffect(() => { if (device === "mobile") push(); }, [v, few, reduce, device]);
  const toSection = () => {
    if (device === "mobile") frame.current?.contentWindow?.postMessage({ type: "cb-cmd", cmd: "section" }, "*");
    else document.getElementById("collab-proto")?.scrollIntoView({ behavior: "instant" });
  };
  return (
    <>
      {device === "desktop" ? (
        <Stage content={content} before={before} after={after} cfg={cfg} />
      ) : (
        <div className="lab-device-wrap">
          <iframe ref={frame} title={`Mobile preview — direction ${v}`} className="lab-device" src={`/lab/collaborations?embed=1&v=${v}&few=${few ? 1 : 0}&reduce=${reduce ? 1 : 0}`} onLoad={push} />
          <p className="lab-caption t-meta">390 × 844 · direction {v}</p>
        </div>
      )}
      <div className="lab-bar" role="toolbar" aria-label="Collaborations lab controls (lab only)">
        <p className="lab-warn">Lab placeholders: the logos are placeholder wordmarks, not real RMZ clients — real SVG/PNG artwork plugs into the same components (<code>partners[].logo</code>).</p>
        <Seg label="Direction" items={VARIANTS.map((x) => ({ id: x.id, text: `${x.id} · ${x.name}`, on: v === x.id, fn: () => pick(x.id) }))} />
        <Seg label="View" items={[{ id: "s", text: "Jump to section", on: false, fn: toSection }]} />
        <Seg label="Logos" items={[{ id: "a", text: `All ${content.partners.length}`, on: !few, fn: () => setFew(false) }, { id: "f", text: `Few ${FEW}`, on: few, fn: () => setFew(true) }]} />
        <Seg label="Motion" items={[{ id: "n", text: "Normal", on: !reduce, fn: () => setReduce(false) }, { id: "r", text: "Reduced", on: reduce, fn: () => setReduce(true) }]} />
        <Seg label="Device" items={[{ id: "d", text: "Desktop", on: device === "desktop", fn: () => setDevice("desktop") }, { id: "m", text: "Mobile", on: device === "mobile", fn: () => setDevice("mobile") }]} />
      </div>
    </>
  );
}

export function CollabLab(props: { content: CollectiveContent; before: ReactNode; after: ReactNode }) {
  const q = useSearchParams();
  if (q.get("embed") === "1") return <Embedded {...props} />;
  return <Review {...props} initialV={isV(q.get("v")) ? (q.get("v") as V) : "A"} initialFew={q.get("few") === "1"} initialReduce={q.get("reduce") === "1"} />;
}
