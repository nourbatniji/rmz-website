"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { HeroContent, SiteContent } from "@/content/types";
import { HeroThreeWorlds } from "@/components/home/hero/HeroThreeWorlds";
import { NavA } from "./NavA";
import { NavB } from "./NavB";
import { NavC } from "./NavC";
import { NavD } from "./NavD";
import { TOGGLE_EVENT, useMedia, useNavState, type NavProps } from "./shared";
import "./nav-lab.css";

/** Lab only (/lab/navigation). The four navigation prototypes over the REAL hero (same component, opening included) and stand-in sections for the real destinations. */

type V = "A" | "B" | "C" | "D";
type Force = "auto" | "image" | "solid";
type Cfg = { v: V; force: Force; reduce: boolean };
const VARIANTS: { id: V; name: string }[] = [
  { id: "A", name: "Editorial rail" },
  { id: "B", name: "Split" },
  { id: "C", name: "Compact bar" },
  { id: "D", name: "Menu stage" },
];
const OPEN_KEY = "rmz-lab-nav-opening";
const CMD_EVENT = "nav-lab-cmd";
const IDS = ["work", "services", "minds", "contact"];

type Props = { hero: HeroContent; site: SiteContent };

function Stage({ hero, site, cfg }: Props & { cfg: Cfg }) {
  const sys = useMedia("(prefers-reduced-motion: reduce)");
  const reduced = sys || cfg.reduce;
  const ids = useMemo(() => IDS, []);
  const { solid, active } = useNavState(ids, cfg.force, 92);
  const props: NavProps = { brand: site.brand, nav: site.nav, solid, active, reduced };

  useEffect(() => {
    document.documentElement.dataset.nvReduce = cfg.reduce ? "1" : "0";
    return () => { delete document.documentElement.dataset.nvReduce; };
  }, [cfg.reduce]);

  // commands from the lab toolbar (same page) or from the parent frame (mobile preview)
  useEffect(() => {
    const run = (cmd: string) => {
      if (cmd === "hero") window.scrollTo({ top: 0, behavior: "instant" });
      if (cmd === "content") document.getElementById("services")?.scrollIntoView({ behavior: "instant" });
      if (cmd === "toggle") window.dispatchEvent(new Event(TOGGLE_EVENT));
    };
    const onCmd = (e: Event) => run((e as CustomEvent<string>).detail);
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "nav-cmd") run(e.data.cmd); };
    window.addEventListener(CMD_EVENT, onCmd);
    window.addEventListener("message", onMsg);
    return () => { window.removeEventListener(CMD_EVENT, onCmd); window.removeEventListener("message", onMsg); };
  }, []);

  return (
    <>
      {cfg.v === "A" && <NavA {...props} />}
      {cfg.v === "B" && <NavB {...props} />}
      {cfg.v === "C" && <NavC {...props} />}
      {cfg.v === "D" && <NavD {...props} />}
      <main id="top">
        <HeroThreeWorlds hero={hero} sessionKey={OPEN_KEY} />
        <section id="work" className="nv-sec nv-sec-ink"><p className="t-meta">Work</p><h2 className="t-display">Selected<br />work.</h2></section>
        <section id="services" className="nv-sec nv-sec-cream"><p className="t-meta">Capabilities</p><h2 className="t-display">Seven<br />services.</h2></section>
        <section id="minds" className="nv-sec nv-sec-photo"><p className="t-meta">Studio</p><h2 className="t-display">The<br />team.</h2></section>
        <section id="contact" className="nv-sec nv-sec-ink"><p className="t-meta">Contact</p><h2 className="t-display">Say<br />hello.</h2></section>
      </main>
    </>
  );
}

function Embedded(props: Props) {
  const q = useSearchParams();
  const [cfg, setCfg] = useState<Cfg>({ v: (q.get("v") as V) || "A", force: (q.get("state") as Force) || "auto", reduce: q.get("reduce") === "1" });
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "nav-set") setCfg((c) => ({ ...c, ...e.data.cfg })); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return <Stage {...props} cfg={cfg} />;
}

export function NavLab(props: Props) {
  const q = useSearchParams();
  const embed = q.get("embed") === "1";
  if (embed) return <Embedded {...props} />;
  return <Review {...props} initialV={(q.get("v") as V) || "A"} />;
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

function Review({ hero, site, initialV }: Props & { initialV: V }) {
  const [v, setV] = useState<V>(["A", "B", "C", "D"].includes(initialV) ? initialV : "A");
  const [force, setForce] = useState<Force>("auto");
  const [reduce, setReduce] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const cfg: Cfg = { v, force, reduce };

  const pick = (id: V) => {
    setV(id);
    const u = new URL(window.location.href);
    u.searchParams.set("v", id);
    window.history.replaceState(null, "", u);
  };
  const send = (cmd: string) => {
    if (device === "mobile") frame.current?.contentWindow?.postMessage({ type: "nav-cmd", cmd }, "*");
    else window.dispatchEvent(new CustomEvent(CMD_EVENT, { detail: cmd }));
  };
  const pushCfg = () => frame.current?.contentWindow?.postMessage({ type: "nav-set", cfg }, "*");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pushCfg reads the current cfg; it only needs to run when the config changes
  useEffect(() => { if (device === "mobile") pushCfg(); }, [v, force, reduce, device]);
  const replay = () => {
    try { sessionStorage.removeItem(OPEN_KEY); } catch { /* ignore */ }
    if (device === "mobile") setFrameKey((k) => k + 1);
    else window.location.reload();
  };

  return (
    <>
      {device === "desktop" ? (
        <Stage hero={hero} site={site} cfg={cfg} />
      ) : (
        <div className="lab-device-wrap">
          <iframe
            key={frameKey}
            ref={frame}
            title={`Mobile preview — direction ${v}`}
            className="lab-device"
            src={`/lab/navigation?embed=1&v=${v}&state=${force}&reduce=${reduce ? 1 : 0}`}
            onLoad={pushCfg}
          />
          <p className="lab-caption t-meta">390 × 844 · direction {v}</p>
        </div>
      )}

      <div className="lab-bar" role="toolbar" aria-label="Navigation lab controls (lab only)">
        <Seg label="Direction" items={VARIANTS.map((x) => ({ id: x.id, text: `${x.id} · ${x.name}`, on: v === x.id, fn: () => pick(x.id) }))} />
        <Seg label="View" items={[{ id: "h", text: "Hero", on: false, fn: () => send("hero") }, { id: "c", text: "Content", on: false, fn: () => send("content") }]} />
        <Seg label="Surface" items={[{ id: "a", text: "Auto", on: force === "auto", fn: () => setForce("auto") }, { id: "i", text: "Over image", on: force === "image", fn: () => setForce("image") }, { id: "s", text: "Solid", on: force === "solid", fn: () => setForce("solid") }]} />
        <Seg label="Menu" items={[{ id: "t", text: "Open / close", on: false, fn: () => send("toggle") }]} />
        <Seg label="Motion" items={[{ id: "n", text: "Normal", on: !reduce, fn: () => setReduce(false) }, { id: "r", text: "Reduced", on: reduce, fn: () => setReduce(true) }]} />
        <Seg label="Device" items={[{ id: "d", text: "Desktop", on: device === "desktop", fn: () => setDevice("desktop") }, { id: "m", text: "Mobile", on: device === "mobile", fn: () => setDevice("mobile") }]} />
        <Seg label="Opening" items={[{ id: "p", text: "Replay", on: false, fn: replay }]} />
      </div>
    </>
  );
}
