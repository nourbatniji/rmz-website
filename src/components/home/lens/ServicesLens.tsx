"use client";

import "./services-lens.css";
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import type { LensContent, ServiceTaxonomyItem } from "@/content/types";
import { useEntrance } from "@/lib/use-entrance";
import { useMedia } from "@/lib/use-media";
import { LensScene } from "./lens-scenes";

/**
 * ServicesLens — "HOME - SERVICES SECTION" (canvas, 1440 × 900): seven services as focal lengths on a lens ring.
 * Selecting a service closes the iris (380 ms), swaps the study in the glass, then opens it to that service's aperture (520 ms).
 * Select by: list row, ring mark, prev/next, dragging the ring (snaps), arrow keys (list and lens).
 *
 *  • Names and order come from the shared service taxonomy; copy/imagery from typed `homepage.lens` content.
 *  • Desktop (≥ 1100 px): the approved 1440 × 900 composition, scaled down below 1440 and centred above it (the ring runs off the
 *    right edge by design). Below 1100 px: the canvas' "MOBILE · 04 — OPTION 1" (lens + arrows + accordion) — pending visual review.
 *  • No wheel/scroll capture. The ring's touch area is only the ring band; the glass allows vertical scrolling (swipe sideways to change).
 *  • Reduced motion (OS setting): no transitions, instant swap. The canvas' "Motion: full/reduced" preview toggle is not shipped.
 */

const STEP = 24; // degrees between focal marks
const IA = 180; // angle of the first mark (faces the list)
const VIS = 75; // marks further than this from the pointer are hidden
const RH = 54; // collapsed row height (desktop)
const EX = 214; // extra height of the open row
const LT = 140; // list top
const CY = 470; // lens centre y (stage)
const IR = { Rp: 356, ap: 361, dl: 21.66, closed: 0.04, dClose: 380, dOpen: 750, dReopen: 1700, swapHold: 100 };
const REST = [0.94, 0.66, 0.84, 0.74, 0.96, 0.6, 0.8]; // resting aperture per focal length
const DESKTOP_QUERY = "(min-width: 1100px)";
// The canvas stage is 900 tall; the last caption ends at y ≈ 884. The section is trimmed to 892 so the Minds columns start closer
// (no empty band) while the controls and captions stay clear.
const SECTION_H = 892;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const th = (o: number) => (Math.acos(clamp((o * IR.ap - IR.dl) / IR.Rp, -1, 1)) * 180) / Math.PI;
const blade = (deg: number) => `translate(${IR.Rp}px,0px) rotate(${deg.toFixed(3)}deg) translate(${-IR.Rp}px,0px)`;
type Phase = "idle" | "closing" | "opening";

const RING_TICKS: CSSProperties = {
  position: "absolute", inset: 0, borderRadius: "50%",
  background: "repeating-conic-gradient(from 270deg,rgba(243,232,204,.5) 0 .4deg,transparent .4deg 4.800deg)",
  WebkitMask: "radial-gradient(circle closest-side,transparent 368px,#000 369px,#000 397px,transparent 398px)",
  mask: "radial-gradient(circle closest-side,transparent 368px,#000 369px,#000 397px,transparent 398px)",
};
const RING_MAJOR: CSSProperties = {
  position: "absolute", inset: 0, borderRadius: "50%",
  background: "repeating-conic-gradient(from 269.45deg,#F3E8CC 0 1.1deg,transparent 1.1deg 24deg)",
  WebkitMask: "radial-gradient(circle closest-side,transparent 386px,#000 387px,#000 397px,transparent 398px)",
  mask: "radial-gradient(circle closest-side,transparent 386px,#000 387px,#000 397px,transparent 398px)",
};
const BLADE_D = "M 377.66 -180.50 L 377.66 411.54 L 846.96 411.54 L 846.96 -180.50 Z";

type Item = { id: string; name: string; focal: string; ringMark: string; description: string; details: [string, string, string]; scene: LensContent["items"][number]["scene"]; href: string | null };

export function ServicesLens({ content, services }: { content: LensContent; services: ServiceTaxonomyItem[] }) {
  const uid = useId();
  const reduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const desktop = useMedia(DESKTOP_QUERY, true);
  const byId = new Map(content.items.map((c) => [c.serviceId, c]));
  const items: Item[] = services.flatMap((s) => {
    const c = byId.get(s.id);
    return c ? [{ id: s.id, name: s.name, focal: c.focal, ringMark: c.ringMark, description: c.description, details: c.details, scene: c.scene, href: c.href }] : [];
  });
  const N = items.length;
  const initial = Math.max(0, items.findIndex((i) => i.id === content.initialSelectedId));
  const rest = (i: number) => REST[i] ?? 0.8;

  const [sel, setSel] = useState(initial); // selected service (text, list, connectors, ring target)
  const [shown, setShown] = useState(initial); // study currently visible in the glass
  const [op, setOp] = useState(rest(initial)); // iris opening
  const [ph, setPh] = useState<Phase>("idle");
  const [rot, setRot] = useState(-initial * STEP);
  const [drag, setDrag] = useState(false);
  const [geom, setGeom] = useState({ s: 1, left: 0 });
  const [away, setAway] = useState(false); // section scrolled out of view → the iris closes; it reopens when the section is reached again

  const rootRef = useRef<HTMLElement>(null);
  // One-shot entrance: starts once the visitor has actually reached the section (≥ 45% in view); the iris opens from fully closed, then the open row drops down.
  useEntrance(rootRef, { threshold: 0.45, playMs: 2900, sliverMs: 2500 }); // see services-lens.css
  // Iris follows the visitor: closes when the section is (mostly) scrolled away, and reopens — slowly — only once the section fills the screen
  // (≥ 90 % of the part of it that can fit in the viewport). Coverage is measured against min(section height, viewport height below the fixed header).
  const [reopening, setReopening] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let isAway = false;
    let seen = false; // the first visit keeps the original (entrance) timing; the full-screen gate applies to every return
    let t = 0;
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92; // the fixed header hides the top of the viewport
    // How much of the part of the section that can fit below the header is on screen (0–1). Measured directly, so it is exact at any scroll position.
    const coverage = () => {
      const r = el.getBoundingClientRect();
      const room = Math.max(1, window.innerHeight - hh);
      const visible = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, hh));
      return visible / Math.max(1, Math.min(r.height, room));
    };
    const evaluate = () => {
      const cover = coverage();
      if (!isAway && cover < 0.15) {
        isAway = true;
        window.clearTimeout(t);
        setReopening(false);
        setAway(true);
      } else if (isAway && cover >= (seen ? 0.9 : 0.3)) {
        isAway = false;
        setReopening(seen);
        seen = true;
        setAway(false);
        window.clearTimeout(t);
        t = window.setTimeout(() => setReopening(false), 1800);
      }
    };
    // IntersectionObserver only calls back when the visible share crosses one of its steps, and a section taller than the screen never reaches
    // the last step — so on the way back UP the "reopen" moment could fall between two steps and never be reported (the iris stayed closed).
    // While the iris is closed we therefore also re-check on scroll (passive, one frame at a time, reading only: no scroll capture, no pinning).
    let raf = 0;
    const onScroll = () => {
      if (!isAway || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        evaluate();
      });
    };
    const io = new IntersectionObserver(evaluate, { threshold: Array.from({ length: 41 }, (_, i) => i / 40), rootMargin: `-${hh}px 0px 0px 0px` });
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
    };
  }, []);
  const tgt = useRef(initial);
  const shownRef = useRef(initial);
  const phRef = useRef<Phase>("idle");
  const gen = useRef(0);
  const timers = useRef<number[]>([]);
  const moved = useRef(false);
  const rotRef = useRef(rot); // latest ring angle, read when a drag ends
  const reducedRef = useRef(reduced);
  const live = useRef<HTMLParagraphElement>(null);
  const ring = useRef<{ down: boolean; cx: number; cy: number; last: number; acc: number; r0: number }>({ down: false, cx: 0, cy: 0, last: 0, acc: 0, r0: 0 });
  const glassDrag = useRef<{ x: number; y: number; r: number; m: boolean; id: number } | null>(null);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  useEffect(() => {
    rotRef.current = rot;
  }, [rot]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  // Fit the 1440 × 900 stage into the available width (scale below 1440, centre above it).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !desktop) return;
    const fit = () => {
      const w = el.clientWidth;
      const s = Math.min(1, w / 1440);
      setGeom({ s, left: Math.max(0, (w - 1440 * s) / 2) });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [desktop]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    gen.current += 1;
  };
  // Resolve once the study's images are decoded (or after 1.5 s) so the iris never opens on a half-loaded picture.
  const ready = (n: number) =>
    new Promise<void>((res) => {
      const imgs = [...(rootRef.current?.querySelectorAll<HTMLImageElement>(`[data-sc="${n}"] img`) ?? [])].filter((m) => !(m.complete && m.naturalWidth > 0));
      if (!imgs.length) return res();
      let left = imgs.length;
      const f = () => {
        if (--left <= 0) res();
      };
      imgs.forEach((m) => {
        m.addEventListener("load", f, { once: true });
        m.addEventListener("error", f, { once: true });
      });
      timers.current.push(window.setTimeout(res, 1500));
    });

  const kick = () => {
    if (reducedRef.current) {
      clearTimers();
      phRef.current = "idle";
      shownRef.current = tgt.current;
      setShown(tgt.current);
      setOp(rest(tgt.current));
      setPh("idle");
      return;
    }
    if (phRef.current === "closing") return;
    if (tgt.current === shownRef.current) return;
    clearTimers();
    const g = gen.current;
    phRef.current = "closing";
    setOp(IR.closed);
    setPh("closing");
    const reveal = (n: number) => {
      if (g !== gen.current) return;
      shownRef.current = n;
      phRef.current = "opening";
      setShown(n);
      setPh("opening");
      timers.current.push(
        window.setTimeout(() => {
          if (g !== gen.current) return;
          setOp(rest(n));
          timers.current.push(
            window.setTimeout(() => {
              if (g !== gen.current) return;
              phRef.current = "idle";
              setPh("idle");
              if (tgt.current !== shownRef.current) kick();
            }, IR.dOpen + 30),
          );
        }, IR.swapHold),
      );
    };
    timers.current.push(
      window.setTimeout(() => {
        if (g !== gen.current) return;
        const n = tgt.current;
        ready(n).then(() => {
          if (g !== gen.current) return;
          const m = tgt.current;
          if (m !== n) ready(m).then(() => reveal(tgt.current));
          else reveal(m);
        });
      }, IR.dClose),
    );
  };

  const select = (i: number) => {
    const n = clamp(i, 0, N - 1);
    tgt.current = n;
    setSel(n);
    setDrag(false);
    setRot(-n * STEP);
    if (live.current) live.current.textContent = `Selected: ${items[n].name}, ${items[n].focal}`;
    kick();
  };
  const go = (i: number) => {
    if (moved.current) return; // a drag just ended: ignore the synthetic click
    select(i);
  };

  // ── ring dragging (angular) ──
  const ang = (e: RPointerEvent) => (Math.atan2(e.clientY - ring.current.cy, e.clientX - ring.current.cx) * 180) / Math.PI;
  const ringDown = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    ring.current = { down: true, cx: r.left + r.width / 2, cy: r.top + r.height / 2, last: 0, acc: 0, r0: -tgt.current * STEP };
    ring.current.last = ang(e);
    moved.current = false;
  };
  const ringMove = (e: RPointerEvent<HTMLDivElement>) => {
    const R = ring.current;
    if (!R.down) return;
    const a = ang(e);
    let d = a - R.last;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    R.last = a;
    R.acc += d;
    if (Math.abs(R.acc) > 3 && !moved.current) {
      moved.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }
    if (!moved.current) return;
    setRot(clamp(R.r0 + R.acc, -(N - 1) * STEP - STEP * 0.6, STEP * 0.6));
    setDrag(true);
  };
  const ringUp = () => {
    const R = ring.current;
    if (!R.down) return;
    R.down = false;
    if (moved.current) {
      select(clamp(Math.round(-rotRef.current / STEP), 0, N - 1));
      window.setTimeout(() => (moved.current = false), 0);
    }
  };
  // ── mobile: sideways swipe on the glass (vertical scrolling stays with the page) ──
  const glassDown = (e: RPointerEvent) => {
    glassDrag.current = { x: e.clientX, y: e.clientY, r: -tgt.current * STEP, m: false, id: e.pointerId };
  };
  const glassMove = (e: RPointerEvent<HTMLDivElement>) => {
    const w = glassDrag.current;
    if (!w || e.pointerId !== w.id) return;
    const dx = e.clientX - w.x;
    if (!w.m && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - w.y)) {
      w.m = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }
    if (w.m) {
      setRot(clamp(w.r + dx * 0.4, -(N - 1) * STEP - STEP * 0.6, STEP * 0.6));
      setDrag(true);
    }
  };
  const glassUp = (e: RPointerEvent) => {
    const w = glassDrag.current;
    if (!w || e.pointerId !== w.id) return;
    glassDrag.current = null;
    if (w.m) select(clamp(Math.round(-rotRef.current / STEP), 0, N - 1));
  };

  const onKey = (e: React.KeyboardEvent<HTMLElement>, focusRow: boolean) => {
    const k = e.key;
    const base = tgt.current;
    let n: number | null = null;
    if (k === "ArrowDown" || k === "ArrowRight") n = clamp(base + 1, 0, N - 1);
    else if (k === "ArrowUp" || k === "ArrowLeft") n = clamp(base - 1, 0, N - 1);
    else if (k === "Home") n = 0;
    else if (k === "End") n = N - 1;
    if (n === null) return;
    e.preventDefault();
    const root = e.currentTarget;
    select(n);
    if (focusRow)
      window.setTimeout(() => {
        root.querySelectorAll<HTMLButtonElement>("button[data-row]")[n]?.focus();
      }, 0);
  };

  const curIdx = drag ? clamp(Math.round(-rot / STEP), 0, N - 1) : sel;
  const T = (t: string) => (reduced ? "none" : t);
  const bladeStyle = {
    transform: blade(th(away ? IR.closed : op)),
    // Start state of the entrance only (see services-lens.css): fully closed, then it opens to the selected service's aperture.
    "--blade-pre": blade(th(IR.closed)),
    transformOrigin: "0 0",
    transition: reduced ? "none" : ph === "closing" || away ? `transform ${IR.dClose}ms cubic-bezier(.55,0,.35,1)` : reopening ? `transform ${IR.dReopen}ms cubic-bezier(.25,.1,.2,1)` : `transform ${IR.dOpen}ms cubic-bezier(.22,0,.12,1)`,
    filter: "drop-shadow(0 0 5px rgba(0,0,0,.55))",
  } as CSSProperties;
  const cap1 = `${items[sel]?.focal} · ${items[sel]?.name}`;
  const cap2 = (hint: string) => `Aperture opening ${Math.round(rest(sel) * 100)}% · ${hint}`;

  // ── the lens (800-unit coordinate system; scaled on mobile) ──
  const dial = (mobile: boolean) => (
    <div style={{ position: "absolute", left: 0, top: 0, width: 800, height: 800 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#0F0F0E", boxShadow: "0 0 0 1px rgba(15,15,14,.9),0 16px 30px -22px rgba(15,15,14,.45),inset 0 0 0 1px rgba(243,232,204,.16)" }} />
      <div
        data-ring=""
        onPointerDown={ringDown}
        onPointerMove={ringMove}
        onPointerUp={ringUp}
        onPointerCancel={ringUp}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", touchAction: "none", cursor: "grab", transform: `rotate(${rot}deg)`, transition: drag ? "none" : T("transform .65s cubic-bezier(.2,.8,.2,1), rotate .85s cubic-bezier(.25,.85,.3,1)") }}
      >
        <div style={RING_TICKS} />
        <div style={RING_MAJOR} />
        {items.map((v, i) => {
          const visible = Math.abs(i * STEP + rot) <= VIS;
          const on = i === curIdx;
          return (
            <div key={v.id} style={{ position: "absolute", left: 400, top: 400, width: 0, height: 0, transform: `rotate(${IA + i * STEP}deg)` }}>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => go(i)}
                className={`lens-mk ${on ? "on" : ""}`}
                style={{
                  left: mobile ? 352 : 365, width: mobile ? 62 : 40, height: mobile ? 160 : 96, top: mobile ? -80 : -48,
                  fontSize: mobile ? 24 : 11, opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
                  color: on ? "#0F0F0E" : "#F3E8CC", transition: T("opacity .3s ease"),
                }}
              >
                <span style={{ padding: mobile ? "15px 7px" : "7px 3px", borderRadius: mobile ? 6 : 3 }}>{v.ringMark}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div
        onPointerDown={mobile ? glassDown : undefined}
        onPointerMove={mobile ? glassMove : undefined}
        onPointerUp={mobile ? glassUp : undefined}
        onPointerCancel={mobile ? glassUp : undefined}
        style={{ position: "absolute", left: 39, top: 39, width: 722, height: 722, borderRadius: "50%", overflow: "hidden", background: "#0F0F0E", boxShadow: "0 0 0 5px #1c1b19,0 0 0 6px rgba(243,232,204,.2)", touchAction: mobile ? "pan-y" : undefined, cursor: mobile ? "grab" : undefined }}
      >
        {items.map((v, i) => (
          <div key={v.id} data-sc={i} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: i === shown ? 1 : 0, transition: T("opacity 90ms linear") }}>
            <LensScene kind={v.scene} imgs={content.images} />
          </div>
        ))}
      </div>
      <svg viewBox="-366 -366 732 732" width="732" height="732" style={{ position: "absolute", display: "block", overflow: "visible", pointerEvents: "none", left: 34, top: 34 }} aria-hidden="true">
        <defs>
          <clipPath id={`${uid}-c`}>
            <circle r="366" />
          </clipPath>
          <linearGradient id={`${uid}-g1`} gradientUnits="userSpaceOnUse" x1="377.66" y1="0" x2="846.96" y2="0">
            <stop offset="0" stopColor="#2d2b27" />
            <stop offset=".25" stopColor="#1d1c19" />
            <stop offset="1" stopColor="#121110" />
          </linearGradient>
          <linearGradient id={`${uid}-g2`} gradientUnits="userSpaceOnUse" x1="0" y1="-180.5" x2="0" y2="411.54">
            <stop offset="0" stopColor="#000" stopOpacity=".30" />
            <stop offset=".30" stopColor="#000" stopOpacity="0" />
            <stop offset=".72" stopColor="#fff" stopOpacity=".05" />
            <stop offset="1" stopColor="#fff" stopOpacity=".11" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${uid}-c)`}>
          {Array.from({ length: 8 }, (_, k) => (
            <g key={k} transform={`rotate(${k * 45})`}>
              <g className="lens-blade" style={bladeStyle}>
                <path d={BLADE_D} fill={`url(#${uid}-g1)`} />
                <path d={BLADE_D} fill={`url(#${uid}-g2)`} />
                <path d="M 387.66 -176.50 L 387.66 407.54" stroke="rgba(243,232,204,.10)" strokeWidth="1" fill="none" />
                <path d="M 377.66 -180.50 L 377.66 411.54" stroke="rgba(243,232,204,.62)" strokeWidth="1.1" fill="none" />
                <circle cx="356" cy="0" r="3.2" fill="#0a0a09" stroke="rgba(243,232,204,.35)" strokeWidth=".8" />
              </g>
            </g>
          ))}
        </g>
      </svg>
      <div aria-hidden="true" style={{ position: "absolute", left: 39, top: 39, width: 722, height: 722, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(ellipse 60% 38% at 32% 20%,rgba(255,255,255,.13),rgba(255,255,255,0) 70%)" }} />
      <div aria-hidden="true" style={{ position: "absolute", left: 400, top: 400, width: 0, height: 0, transform: "rotate(180deg)", pointerEvents: "none" }}>
        {mobile ? (
          <>
            <div style={{ position: "absolute", left: 361, top: -3, width: 48, height: 6, background: "#FFCA26" }} />
            <div style={{ position: "absolute", left: 409, top: -15, width: 0, height: 0, borderTop: "15px solid transparent", borderBottom: "15px solid transparent", borderRight: "24px solid #FFCA26" }} />
          </>
        ) : (
          <>
            <div style={{ position: "absolute", left: 361, top: -1.5, width: 44, height: 3, background: "#FFCA26" }} />
            <div style={{ position: "absolute", left: 405, top: -9, width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderRight: "14px solid #FFCA26" }} />
          </>
        )}
      </div>
    </div>
  );

  const arrows = (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button type="button" className="lens-ctl" aria-label="Previous service" onClick={() => go(tgt.current - 1)} style={{ opacity: sel <= 0 ? 0.35 : 1 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#F3E8CC" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
          <path d="M 12 4 L 6 10 L 12 16" />
        </svg>
      </button>
      <button type="button" className="lens-ctl" aria-label="Next service" onClick={() => go(tgt.current + 1)} style={{ opacity: sel >= N - 1 ? 0.35 : 1 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#F3E8CC" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
          <path d="M 8 4 L 14 10 L 8 16" />
        </svg>
      </button>
    </div>
  );

  const chip = (v: Item, on: boolean) => (
    <span className="lens-sch" style={on ? { background: "#FFCA26", color: "#0F0F0E", border: "1px solid #FFCA26" } : { background: "transparent", color: "#F3E8CC", border: "1px solid rgba(243,232,204,.55)" }}>
      {v.focal}
    </span>
  );
  const heading = (size: number, stacked = false) => (
    <h2 className="lens-nk" style={{ fontSize: size, color: "#F3E8CC", whiteSpace: stacked ? "normal" : "nowrap", margin: 0 }}>
      {content.heading.lead}
      {stacked ? <br /> : " "}
      <i style={stacked ? { lineHeight: 1.05 } : undefined}>{content.heading.emphasis}</i>
    </h2>
  );
  const details = (v: Item) => (
    <ul className="lens-bul">
      {v.details.map((d) => (
        <li key={d}>
          <i />
          {d}
        </li>
      ))}
    </ul>
  );
  const explore = (v: Item, style?: CSSProperties) =>
    v.href ? (
      <a href={v.href} className="lens-lk" style={style}>
        Explore service →
      </a>
    ) : null;

  const ry = LT + sel * RH + RH / 2;
  const y1 = Math.min(ry, CY);
  const y2 = Math.max(ry, CY);

  const rows = items.map((v, i) => {
    const on = i === sel;
    const dly = reduced ? "0s" : ".55s";
    return (
      <div key={v.id} className={`lens-rw ${on ? "on" : ""}`} style={{ height: RH + (on ? EX : 0), overflow: "hidden", transition: T("height .55s cubic-bezier(.2,.8,.2,1)"), "--rh": `${RH}px` } as CSSProperties}>
        <button type="button" data-row="" className="lens-srow" aria-pressed={on} onClick={() => go(i)} style={{ height: RH }}>
          {chip(v, on)}
          <span className="lens-snm" style={{ fontSize: on ? 30 : 24, color: on ? "#F3E8CC" : "rgba(243,232,204,.9)", transition: T("font-size .5s cubic-bezier(.2,.8,.2,1), color .3s ease") }}>{v.name}</span>
        </button>
        <div
          className="lens-rbody"
          style={{
            padding: "4px 0 0 92px",
            ...(on
              ? { opacity: 1, transform: "translateY(0)", visibility: "visible", transition: T(`opacity .4s ${dly} ease, transform .45s ${dly} cubic-bezier(.2,.8,.2,1), visibility 0s 0s`) }
              : { opacity: 0, transform: "translateY(-8px)", visibility: "hidden", transition: T("opacity .18s ease, transform .18s ease, visibility 0s .18s") }),
          }}
        >
          <p className="lens-nl" style={{ fontSize: 16, maxWidth: 428, height: 72 }}>
            {v.description}
          </p>
          <div style={{ height: 84, marginTop: 6 }}>{details(v)}</div>
          <div style={{ marginTop: 8, minHeight: 20 }}>{explore(v)}</div>
        </div>
      </div>
    );
  });

  return (
    <section ref={rootRef} id="services" aria-label="Services" className="lens-root" style={desktop ? { height: SECTION_H * geom.s } : undefined}>
      <p ref={live} className="lens-sr" aria-live="polite" />
      {desktop ? (
        <div className="lens-stage" style={{ left: geom.left, transform: `scale(${geom.s})` }}>
          <p className="lens-nm lens-enter" style={{ position: "absolute", left: 64, top: 42, "--d": "0ms" } as CSSProperties}>{content.kicker}</p>
          <div className="lens-enter" style={{ position: "absolute", left: 64, top: 68, "--d": "30ms" } as CSSProperties}>{heading(34)}</div>
          <p className="lens-nl lens-enter" style={{ position: "absolute", left: 64, top: 108, fontSize: 15, width: 560, "--d": "55ms" } as CSSProperties}>{content.intro}</p>
          {/* connectors: row → vertical rail → lens axis */}
          <div aria-hidden="true" style={{ position: "absolute", left: 632, width: 40, height: 1.5, background: "#F3E8CC", top: ry, transition: T("top .55s cubic-bezier(.2,.8,.2,1)") }} />
          <div aria-hidden="true" style={{ position: "absolute", left: 672, width: 1.5, background: "#F3E8CC", top: y1, height: y2 - y1, transition: T("top .55s cubic-bezier(.2,.8,.2,1), height .55s cubic-bezier(.2,.8,.2,1)") }} />
          <div aria-hidden="true" style={{ position: "absolute", left: 672, top: CY, width: 48, height: 1.5, background: "#F3E8CC" }} />
          <span aria-hidden="true" style={{ position: "absolute", left: 669, width: 8, height: 8, background: "#FFCA26", top: ry - 4, transition: T("top .55s cubic-bezier(.2,.8,.2,1)") }} />
          <span aria-hidden="true" style={{ position: "absolute", left: 669, top: CY - 4, width: 8, height: 8, background: "#FFCA26" }} />
          <div role="group" aria-label="Services" className="lens-enter" onKeyDown={(e) => onKey(e, true)} style={{ position: "absolute", left: 64, top: LT, width: 560, borderBottom: "1px solid #F3E8CC", "--d": "80ms" } as CSSProperties}>
            {rows}
          </div>
          <div className="lens-enter" style={{ position: "absolute", left: 64, top: 790, display: "flex", gap: 12, alignItems: "center", "--d": "100ms" } as CSSProperties}>{arrows}</div>
          <p className="lens-nm lens-enter" style={{ position: "absolute", left: 64, top: 848, fontSize: 11, letterSpacing: ".12em", width: 560, whiteSpace: "nowrap", "--d": "115ms" } as CSSProperties}>{cap1}</p>
          <p className="lens-nm lens-enter" style={{ position: "absolute", left: 64, top: 868, fontSize: 11, letterSpacing: ".12em", width: 560, "--d": "125ms" } as CSSProperties}>{cap2(content.hintDesktop)}</p>
          <div style={{ position: "absolute", left: 740, top: 70, width: 800, height: 800 }} data-lens="">
            {dial(false)}
          </div>
        </div>
      ) : (
        <div className="lens-m">
          <p className="lens-nm lens-enter" style={{ "--d": "0ms" } as CSSProperties}>{content.kicker}</p>
          <div className="lens-enter" style={{ marginTop: 14, "--d": "30ms" } as CSSProperties}>{heading(34, true)}</div>
          <p className="lens-nl lens-enter" style={{ marginTop: 12, fontSize: 15, "--d": "55ms" } as CSSProperties}>{content.intro}</p>
          <div style={{ marginTop: 22 }}>
            <div
              role="group"
              tabIndex={0}
              aria-label="Services lens. Drag the ring, or use the arrow keys."
              onKeyDown={(e) => onKey(e, false)}
              data-lens=""
              style={{ position: "relative", width: 330, height: 330, margin: "0 auto", borderRadius: "50%", WebkitTapHighlightColor: "transparent", outlineOffset: 6 }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, width: 800, height: 800, transform: `scale(${330 / 800})`, transformOrigin: "0 0", "--tf": 2.2 } as CSSProperties}>{dial(true)}</div>
            </div>
          </div>
          <div className="lens-enter" style={{ marginTop: 22, "--d": "80ms" } as CSSProperties}>{arrows}</div>
          <p className="lens-nm lens-enter" style={{ marginTop: 16, fontSize: 11, letterSpacing: ".12em", "--d": "100ms" } as CSSProperties}>{cap1}</p>
          <p className="lens-nm lens-enter" style={{ marginTop: 6, fontSize: 11, letterSpacing: ".12em", "--d": "115ms" } as CSSProperties}>{cap2(content.hintMobile)}</p>
          <div role="group" aria-label="Services" className="lens-enter" onKeyDown={(e) => onKey(e, true)} style={{ marginTop: 26, borderBottom: "1px solid #F3E8CC", "--d": "125ms" } as CSSProperties}>
            {items.map((v, i) => {
              const on = i === sel;
              return (
                <div key={v.id} className={on ? "lens-row-open" : ""}>
                  <button type="button" data-row="" className="lens-srow" aria-pressed={on} onClick={() => go(i)}>
                    {chip(v, on)}
                    <span className="lens-snm" style={{ fontSize: on ? 22 : 18, color: on ? "#F3E8CC" : "rgba(243,232,204,.9)", transition: T("font-size .5s cubic-bezier(.2,.8,.2,1), color .3s ease"), whiteSpace: "normal" }}>{v.name}</span>
                  </button>
                  <div className="lens-rb">
                    <div>
                      <div style={{ padding: "2px 0 0 84px" }}>
                        <p className="lens-nl" style={{ fontSize: 16, maxWidth: 428 }}>{v.description}</p>
                        {details(v)}
                        <div style={{ margin: "14px 0 6px", minHeight: 20 }}>{explore(v)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
