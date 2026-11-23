"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as RKeyboardEvent, PointerEvent as RPointerEvent } from "react";
import type { LensContent, ServiceTaxonomyItem } from "@/content/types";
import { useMedia } from "@/lib/use-media";
import { LensDial, REST } from "./LensDial";
import { holdCenter, timelineAt } from "./orbit-timeline";
import "./orbit.css";

/**
 * OrbitServices — preview-only exploration (route /lab/orbital-services). The EXISTING lens (LensDial) stays centred and stationary while the
 * seven existing service names orbit it, each 360/7° apart, labels always upright. The service nearest 12 o'clock is the selection; the lens
 * image, aperture, label highlight and description change together, once per selection boundary.
 *
 *   A  "scroll"      : native scroll through a bounded sticky scene (≈ 1000–1400 px) rotates the orbit one step per 1/6 of the travel.
 *   B  "interactive" : normal flow; click a label, prev/next, or drag around the lens; shortest circular path; release settles to the nearest service.
 *   M  mobile        : curved selector above the lens, swipe + prev/next, description below; also used automatically below 900 px.
 *
 * `kf` is the orbit position in service steps (continuous). Item i sits at angle (i − kf) × 360/N, measured clockwise from 12 o'clock.
 */

export type OrbitVariant = "A" | "B" | "M";
type Item = { id: string; name: string; focal: string; ringMark: string; description: string; details: string[]; scene: LensContent["items"][number]["scene"]; href: string | null };

const R = 285; // orbit radius (design units)
const DW = 1300; // design box
const DH = 610;
const CY = 316; // lens / orbit centre y in the design box
const LD = 330; // lens diameter in design units
// Variant A geometry (design units): the labels are written ALONG circles just outside the lens rim; the selected one rises into a straight bold title above.
const AW = 740, AH = 752, ACX = 370, ACY = 404;
const ALD = 600; // lens diameter (variant B / mobile keep 330): 483 → 600 (+24 %); at 1440×900 the stage scale is 1, so it renders at 600 px
const RA = 328; // baseline radius of labels on the top half (letters extend outward); the lens rim is at 300 → 28 clear
const RB = 342; // baseline radius on the bottom half (letters extend inward, so their inner edge is also at 328)
const TITLE_Y = 30; // baseline of the lifted title (design y)
const FS = 19; // curved label size (weight 400)
const FS_ACT = 28.5; // lifted title: weight 700
const LH = 205; // half length of each label path
const WIDE = 1180; // stage width from which the heading (upper left) and the description (lower right) sit beside the lens
const MOBILE = "(min-width: 900px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const TAU = 120; // ms — scroll smoothing (variant A): exponential, frame-rate independent
const HYST = 0.38; // a new service is selected only when the orbit is this close (in steps) to it: no flicker at a boundary

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const two = (n: number) => String(n).padStart(2, "0");

export function OrbitServices({ content, services, variant, id = "services-orbit" }: { content: LensContent; services: ServiceTaxonomyItem[]; variant: OrbitVariant; id?: string }) {
  const uid = useId();
  const byId = new Map(content.items.map((c) => [c.serviceId, c]));
  const items: Item[] = services.flatMap((s) => {
    const c = byId.get(s.id);
    return c ? [{ id: s.id, name: s.name, focal: c.focal, ringMark: c.ringMark, description: c.description, details: [...c.details], scene: c.scene, href: c.href }] : [];
  });
  const N = items.length;
  const S = 360 / N;
  const rest = (i: number) => REST[i] ?? 0.8;

  const wide = useMedia(MOBILE, true);
  const reduced = useMedia(REDUCED, false);
  const mobile = variant === "M" || !wide;
  const scrollLinked = variant === "A" && !mobile && !reduced; // reduced motion: no pinned scene, immediate selection

  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1440, h: 808 });
  const [kf, setKf] = useState(0); // orbit position (steps)
  const [lift, setLift] = useState<number[]>(() => timelineAt(0, items.length).lift); // variant A: 0 = on the ring, 1 = lifted into the title
  const [widths, setWidths] = useState<number[]>(() => items.map((v) => v.name.length * FS * 0.52)); // label lengths at FS
  const [selK, setSelK] = useState(0); // selected step (unwrapped); service = mod(selK, N)
  const selKRef = useRef(0);
  const kfRef = useRef(0);
  const qCur = useRef(0); // smoothed timeline position (variant A)
  const sel = mod(selK, N);
  const [shown, setShown] = useState(0); // study visible in the glass
  const [op, setOp] = useState(rest(0)); // iris opening
  const [bladeMs, setBladeMs] = useState(380);
  const live = useRef<HTMLParagraphElement>(null);

  // ── orbit position → selection (with hysteresis) ──
  const apply = useCallback(
    (v: number) => {
      kfRef.current = v;
      setKf(v);
      const near = Math.round(v);
      if (near !== selKRef.current && Math.abs(v - near) < HYST) {
        selKRef.current = near;
        setSelK(near);
      }
    },
    [],
  );

  // ── lens response: image + iris, once per selection ──
  useEffect(() => {
    const ids: number[] = [];
    if (reduced) {
      ids.push(window.setTimeout(() => { setShown(sel); setOp(rest(sel)); }, 0)); // immediate: no travel, no aperture animation
      return () => ids.forEach((t) => window.clearTimeout(t));
    }
    ids.push(window.setTimeout(() => { setBladeMs(170); setOp(Math.min(rest(shown), rest(sel)) * 0.8); }, 0)); // a subtle dip, then swap, then reopen
    ids.push(window.setTimeout(() => setShown(sel), 150));
    ids.push(window.setTimeout(() => { setBladeMs(380); setOp(rest(sel)); }, 190));
    return () => ids.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per selected service
  }, [sel, reduced]);

  useEffect(() => {
    if (live.current) live.current.textContent = `Selected: ${items[sel]?.name}, ${items[sel]?.focal}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  // ── variant A: measure each name at the label size so long names can be fitted to their arc ──
  useEffect(() => {
    if (!scrollLinked) return;
    const measure = () => {
      const fam = rootRef.current ? getComputedStyle(rootRef.current).fontFamily : "sans-serif";
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      ctx.font = `400 ${FS}px ${fam}`;
      setWidths(items.map((v) => ctx.measureText(v.name).width));
    };
    measure();
    document.fonts?.ready.then(measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollLinked]);

  // ── stage size ──
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [mobile, scrollLinked]);

  // ── B / mobile: tween to a step, drag, settle ──
  const anim = useRef(0);
  const tweenTo = useCallback(
    (target: number) => {
      cancelAnimationFrame(anim.current);
      const from = kfRef.current;
      if (reduced || Math.abs(target - from) < 1e-3) { apply(target); return; }
      const t0 = performance.now();
      const dur = clamp(380 + 170 * Math.abs(target - from), 380, 1000);
      const f = (now: number) => {
        const t = clamp((now - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);
        apply(t < 1 ? from + (target - from) * e : target);
        if (t < 1) anim.current = requestAnimationFrame(f);
      };
      anim.current = requestAnimationFrame(f);
    },
    [apply, reduced],
  );
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  // ── A: scroll → orbit ──
  const extraPx = () => Math.max(1, (trackRef.current?.offsetHeight ?? 0) - (stageRef.current?.offsetHeight ?? 0));
  const hh = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
  useEffect(() => {
    if (!scrollLinked) return;
    const track = trackRef.current;
    if (!track) return;
    let raf = 0, last = 0;
    const total = timelineAt(0, N).total;
    const qOf = () => clamp((hh() - track.getBoundingClientRect().top) / extraPx(), 0, 1) * total;
    const show = (q: number) => { const t = timelineAt(q, N); apply(t.kf); setLift(t.lift); };
    const tick = (now: number) => {
      raf = 0;
      const t = qOf();
      const dt = last ? now - last : 16;
      last = now;
      const cur = qCur.current;
      const d = t - cur;
      const far = Math.abs(d) / total; // fraction of the whole timeline we are behind
      if (far > 0.25 || dt > 100 || Math.abs(d) < 0.004) { qCur.current = t; show(t); last = 0; return; } // fast jump, stalled frame or settled: exact, no catch-up
      const tau = TAU / (1 + 40 * Math.max(0, far - 0.06)); // = TAU for ordinary scrolling (behind by < 6 % of the scene); tightens for a fling so it never drifts long
      qCur.current = cur + d * (1 - Math.exp(-dt / tau));
      show(qCur.current);
      raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
    selKRef.current = 0;
    qCur.current = qOf();
    show(qCur.current);
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => { window.removeEventListener("scroll", kick); window.removeEventListener("resize", kick); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollLinked, N]);

  // ── selection commands ──
  const goService = (j: number) => {
    j = clamp(j, 0, N - 1);
    if (scrollLinked) {
      const track = trackRef.current;
      if (!track) return;
      const top = window.scrollY + track.getBoundingClientRect().top - hh() + (holdCenter(j, N) / timelineAt(0, N).total) * extraPx(); // lands in the middle of that service's selected hold
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      return;
    }
    // shortest circular path
    const k0 = Math.round(kfRef.current);
    let d = mod(j - mod(k0, N), N);
    if (d > N / 2) d -= N;
    tweenTo(k0 + d);
  };
  const step = (dir: number) => {
    if (scrollLinked) goService(clamp(sel + dir, 0, N - 1));
    else tweenTo(Math.round(kfRef.current) + dir);
  };

  // ── drag (B and mobile): angular around the lens (desktop) / horizontal swipe (mobile) ──
  const drag = useRef<{ on: boolean; id: number; cx: number; cy: number; last: number; x0: number; k0: number; acc: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const pAng = (e: RPointerEvent) => (Math.atan2(e.clientY - (drag.current?.cy ?? 0), e.clientX - (drag.current?.cx ?? 0)) * 180) / Math.PI;
  const dragStart = (e: RPointerEvent<HTMLDivElement>) => {
    if (scrollLinked || e.button > 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const lens = e.currentTarget.querySelector("[data-orb-lens]")?.getBoundingClientRect();
    drag.current = { on: true, id: e.pointerId, cx: lens ? lens.left + lens.width / 2 : r.left + r.width / 2, cy: lens ? lens.top + lens.height / 2 : r.top + r.height / 2, last: 0, x0: e.clientX, k0: kfRef.current, acc: 0, moved: false };
    drag.current.last = pAng(e);
    moved.current = false;
  };
  const dragMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !d.on || e.pointerId !== d.id) return;
    if (mobile) {
      const dx = e.clientX - d.x0;
      if (!d.moved && Math.abs(dx) > 6) { d.moved = true; moved.current = true; cancelAnimationFrame(anim.current); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
      if (d.moved) apply(d.k0 - dx / 90);
      return;
    }
    const a = pAng(e);
    let da = a - d.last;
    while (da > 180) da -= 360;
    while (da < -180) da += 360;
    d.last = a;
    d.acc += da;
    if (!d.moved && Math.abs(d.acc) > 4) { d.moved = true; moved.current = true; cancelAnimationFrame(anim.current); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    if (d.moved) apply(kfRef.current - da / S);
  };
  const dragEnd = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.moved) { tweenTo(Math.round(kfRef.current)); window.setTimeout(() => (moved.current = false), 0); }
  };
  const click = (j: number) => { if (moved.current) return; goService(j); };

  const onKey = (e: RKeyboardEvent<HTMLElement>) => {
    let n: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = sel + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = sel - 1;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = N - 1;
    if (n === null) return;
    e.preventDefault();
    const nn = scrollLinked || mobile ? clamp(n, 0, N - 1) : mod(n, N);
    goService(nn);
    const root = e.currentTarget;
    window.setTimeout(() => root.querySelectorAll<HTMLButtonElement>("button[data-orb-label]")[nn]?.focus({ preventScroll: true }), 0);
  };

  // ── geometry ──
  const descH = mobile ? 0 : box.h < 640 ? 150 : 176;
  const area = box.h - descH - 28;
  const s = clamp(Math.min(box.w / DW, area / DH), 0.38, 1.2);
  const lf = Math.max(28, 17 / s);
  const ox = (box.w - DW * s) / 2;
  const labels = items.map((v, i) => {
    const a = ((i - kf) * S * Math.PI) / 180;
    const sn = Math.sin(a), cs = Math.cos(a);
    const f = 0.5 - 0.5 * clamp(sn * 1.6, -1, 1); // text anchor: left-aligned on the right half, right-aligned on the left, centred on top / bottom
    return { v, i, x: DW / 2 + R * sn, y: CY - R * cs, f, on: i === sel };
  });
  const cap = (v: Item) => `${v.focal} · ${v.name}`;

  const desc = (
    <div className="orb-desc" style={{ minHeight: mobile ? undefined : descH }}>
      {items.map((v, i) => (
        <div key={v.id} className="orb-d" data-on={i === sel ? "1" : "0"} aria-hidden={i === sel ? undefined : true}>
          <p className="orb-cap">{cap(v)}</p>
          <p className="orb-body">{v.description}</p>
          <p className="orb-det">{v.details.join(" · ")}</p>
          <p className="orb-link">{v.href ? <a href={v.href}>Explore service →</a> : <span aria-hidden="true">&nbsp;</span>}</p>
        </div>
      ))}
    </div>
  );
  const arrow = (dir: number, label: string) => (
    <button type="button" className="lens-ctl orb-ctl" aria-label={label} onClick={() => step(dir)} disabled={(scrollLinked || mobile) && (dir < 0 ? sel <= 0 : sel >= N - 1)}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#F3E8CC" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
        <path d={dir < 0 ? "M 12 4 L 6 10 L 12 16" : "M 8 4 L 14 10 L 8 16"} />
      </svg>
    </button>
  );
  const dial = (
    <LensDial items={items} images={content.images} shown={shown} sel={sel} op={op} reduced={reduced} bladeMs={bladeMs} />
  );

  const head = (
    <div className="orb-head">
      <p className="orb-k">{content.kicker}</p>
      <h2 className="orb-h">
        {content.heading.lead} <i>{content.heading.emphasis}</i>
      </h2>
    </div>
  );

  // ── mobile: curved selector above the lens ──
  if (mobile) {
    const MW = Math.min(box.w || 390, 540);
    const ls = Math.min(300, MW - 70) / 800; // lens scale (800 units)
    return (
      <section ref={rootRef} id={id} aria-label="Services" className="orb-root orb-m" data-variant="M" data-mobile-design="pending-approval">
        <p ref={live} className="lens-sr" aria-live="polite" />
        {head}
        <div className="orb-mstage" ref={stageRef} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}>
          <div role="group" aria-label="Services" className="orb-msel" onKeyDown={onKey}>
            <svg className="orb-mark" width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M0 0H16L8 12Z" fill="#F3E8CC" /></svg>
            {items.map((v, i) => {
              const dk = i - kf;
              const a = (dk * 30 * Math.PI) / 180;
              const vis = Math.abs(dk) < 2.6;
              return (
                <button
                  key={v.id}
                  type="button"
                  data-orb-label=""
                  aria-pressed={i === sel}
                  className="orb-lbl"
                  onClick={() => click(i)}
                  style={{
                    left: "50%", top: 30 + 360 * (1 - Math.cos(a)) * 0.55,
                    transform: `translate(calc(-50% + ${(360 * Math.sin(a)).toFixed(1)}px), 0)`,
                    fontSize: i === sel ? 26 : 19, opacity: vis ? clamp(1.15 - Math.abs(dk) * 0.4, 0.2, 1) : 0, pointerEvents: vis ? "auto" : "none",
                    color: i === sel ? "#F3E8CC" : "rgba(243,232,204,.78)", zIndex: 10 - Math.round(Math.abs(dk)),
                  } as CSSProperties}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
          <div data-orb-lens="" className="orb-mlens" style={{ width: 800 * ls, height: 800 * ls }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 800, height: 800, transform: `scale(${ls})`, transformOrigin: "0 0" }}>{dial}</div>
          </div>
        </div>
        <div className="orb-mctl">{arrow(-1, "Previous service")}<span className="orb-count">{two(sel + 1)} / {two(N)}</span>{arrow(1, "Next service")}</div>
        {desc}
      </section>
    );
  }

  // ── variant A body: names written along circles outside the lens rim; the selected one rises into a straight title ──
  const sideBy = box.w >= WIDE; // description left, heading right
  const short = !sideBy && box.h < 640;
  const aDescH = short ? 112 : 176;
  const headH = short ? 44 : 60;
  const sA = sideBy
    ? clamp(Math.min(1, (box.h - 24) / AH, (box.w - 676) / AW), 0.4, 1)
    : clamp(Math.min(box.w / AW, (box.h - aDescH - headH - 14) / AH), 0.3, 1);
  const boxLeft = (box.w - AW * sA) / 2;
  const boxTop = sideBy ? (box.h - AH * sA) / 2 : headH + 4;
  const sideW = Math.max(0, box.w / 2 - (RB + 18) * sA - 64 - 16); // free width between the gutter and the orbit's outermost label
  const fsK = sideBy ? 1 : clamp(11.5 / (FS * sA), 1, 1.25); // keep curved names legible on short screens
  const fitLen = 0.84 * ((360 / N) * Math.PI / 180) * RA; // longest name allowed on its arc
  const lerp = (a: number, c: number, t: number) => a + (c - a) * t;
  const ease3 = (t: number) => t * t * (3 - 2 * t);
  const rad = (d: number) => (d * Math.PI) / 180;
  const pathD = (px: number, py: number, alpha: number, kappa: number) => {
    const al = rad(alpha);
    const pt = (sv: number) => (Math.abs(kappa) < 1e-4 ? [px + sv * Math.cos(al), py + sv * Math.sin(al)] : [px + (Math.sin(al + kappa * sv) - Math.sin(al)) / kappa, py + (Math.cos(al) - Math.cos(al + kappa * sv)) / kappa]);
    const [x1, y1] = pt(-LH), [x2, y2] = pt(LH);
    return Math.abs(kappa) < 1e-4 ? `M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}` : `M${x1.toFixed(2)} ${y1.toFixed(2)} A${(1 / Math.abs(kappa)).toFixed(2)} ${(1 / Math.abs(kappa)).toFixed(2)} 0 0 ${kappa > 0 ? 1 : 0} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const poses = items.map((v, i) => {
    const th = ((((i - kf) * S) % 360) + 540) % 360 - 180; // (-180, 180], 0 = 12 o'clock
    const L = clamp(lift[i] ?? 0, 0, 1);
    const w0 = widths[i] ?? v.name.length * FS * 0.52;
    const fsI = FS * fsK * Math.min(1, fitLen / (w0 * fsK));
    const fs = lerp(fsI, FS_ACT, L);
    const wght = Math.round(400 + 300 * L); // genuine Figtree weights: 400 on the ring → 700 when lifted
    const wT = L > 0 ? 1 : ease3(clamp((Math.cos(rad(th)) + 0.14) / 0.28, 0, 1));
    const sn = Math.sin(rad(th)), cs = Math.cos(rad(th));
    // top-half pose (clockwise, letters outward) — flattens and rises with `lift`
    const tx = lerp(ACX + RA * sn, ACX, L), ty = lerp(ACY - RA * cs, TITLE_Y, L);
    const tAlpha = th * (1 - L), tKappa = (1 / RA) * (1 - L);
    // bottom-half pose (counter-clockwise, letters inward) so the word reads left to right
    const bx = ACX + RB * sn, by = ACY - RB * cs;
    const bAlpha = th + 180;
    const top = wT >= 0.5;
        const fill = `rgba(243,232,204,${lerp(0.78, 1, L).toFixed(3)})`; // cream: quieter on the ring, full strength when lifted
    return { v, i, fs, wght, wT, fill, tPath: pathD(tx, ty, tAlpha, tKappa), bPath: pathD(bx, by, bAlpha, -1 / RB), bx: top ? tx : bx, by: top ? ty : by, ba: top ? tAlpha : bAlpha, w: w0 * (fs / FS) * (1 + 0.1 * L) };
  });
  const bodyA = (
    <div ref={trackRef} className="orb-track">
      <div className="orb-stage" ref={stageRef} data-pinned="1" data-short={short ? "1" : "0"} data-wide={sideBy ? "1" : "0"}>
        {!sideBy && head}
        <div className="orb-meta">
          <a className="orb-skip" href={`#${uid}-after`} onClick={(e) => { e.preventDefault(); const t = document.getElementById(`${uid}-after`); if (t) window.scrollTo({ top: window.scrollY + t.getBoundingClientRect().top - hh() - 8, behavior: reduced ? "auto" : "smooth" }); }}>Skip services ↓</a>
          <span className="orb-count" aria-hidden="true">{two(sel + 1)} / {two(N)}</span>
        </div>
        <div className="orb-box" style={{ width: AW, height: AH, left: boxLeft, top: boxTop, transform: `scale(${sA})` } as CSSProperties}>
          <svg className="orb-arcs" width={AW} height={AH} viewBox={`0 0 ${AW} ${AH}`} aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
            <defs>
              {poses.map((q) => (
                <g key={q.v.id}>
                  <path id={`${uid}-t${q.i}`} d={q.tPath} />
                  <path id={`${uid}-b${q.i}`} d={q.bPath} />
                </g>
              ))}
            </defs>
            {poses.map((q) => (
              <g key={q.v.id}>
                <text className="orb-arc" fontSize={q.fs} fill={q.fill} opacity={q.wT} style={{ fontWeight: q.wght }}>
                  <textPath href={`#${uid}-t${q.i}`} startOffset="50%" textAnchor="middle">{q.v.name}</textPath>
                </text>
                {q.wT < 1 && (
                  <text className="orb-arc" fontSize={q.fs} fill={q.fill} opacity={1 - q.wT} style={{ fontWeight: q.wght }}>
                    <textPath href={`#${uid}-b${q.i}`} startOffset="50%" textAnchor="middle">{q.v.name}</textPath>
                  </text>
                )}
              </g>
            ))}
            <path d={`M${ACX - 6} ${ACY - RA + 1} L${ACX + 6} ${ACY - RA + 1} L${ACX} ${ACY - RA + 10} Z`} fill="#F3E8CC" opacity={0.9} />
          </svg>
          <div role="group" aria-label="Services" onKeyDown={onKey} style={{ position: "absolute", inset: 0 }}>
            {poses.map((q) => (
              <button
                key={q.v.id}
                type="button"
                data-orb-label=""
                aria-pressed={q.i === sel}
                className="orb-hit"
                onClick={() => click(q.i)}
                style={{ left: q.bx, top: q.by, width: q.w + 20, height: Math.max(30, q.fs * 1.7), transform: `translate(-50%,-72%) rotate(${q.ba}deg)` } as CSSProperties}
              >
                {q.v.name}
              </button>
            ))}
          </div>
          <div data-orb-lens="" style={{ position: "absolute", left: ACX - 400, top: ACY - 400, width: 800, height: 800, transform: `scale(${ALD / 800})`, transformOrigin: "50% 50%", pointerEvents: "none" }}>{dial}</div>
        </div>
        {sideBy ? (
          <>
            <div className="orb-side orb-headblk" style={{ width: Math.min(sideW, 400) }}>{head}</div>
            <div className="orb-side orb-descblk" style={{ width: Math.min(sideW, 380) }}>
              <div className="orb-dc orb-dl">{desc}</div>
              <div className="orb-ctls">{arrow(-1, "Previous service")}{arrow(1, "Next service")}</div>
            </div>
          </>
        ) : (
          <div className="orb-dwrap" style={{ height: aDescH }}>
            {arrow(-1, "Previous service")}
            <div className="orb-dc">{desc}</div>
            {arrow(1, "Next service")}
          </div>
        )}
      </div>
    </div>
  );

  const body = (
    <div className="orb-stage" ref={stageRef} data-pinned={scrollLinked ? "1" : "0"} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}>
      {head}
      <div className="orb-meta">
        {scrollLinked && <a className="orb-skip" href={`#${uid}-after`} onClick={(e) => { e.preventDefault(); const t = document.getElementById(`${uid}-after`); if (t) window.scrollTo({ top: window.scrollY + t.getBoundingClientRect().top - hh() - 8, behavior: reduced ? "auto" : "smooth" }); }}>Skip services ↓</a>}
        <span className="orb-count" aria-hidden="true">{two(sel + 1)} / {two(N)}</span>
      </div>
      <div className="orb-box" style={{ width: DW, height: DH, left: ox, top: 8, transform: `scale(${s})`, "--lf": `${lf}px` } as CSSProperties}>
        <div role="group" aria-label="Services" onKeyDown={onKey} style={{ position: "absolute", inset: 0 }}>
          {labels.map(({ v, i, x, y, f, on }) => (
            <button
              key={v.id}
              type="button"
              data-orb-label=""
              aria-pressed={on}
              className="orb-lbl"
              onClick={() => click(i)}
              style={{ left: x, top: y, transform: `translate(${(-f * 100).toFixed(2)}%, -50%)`, fontSize: lf, color: on ? "#F3E8CC" : "rgba(243,232,204,.7)" } as CSSProperties}
            >
              {v.name}
            </button>
          ))}
        </div>
        <svg className="orb-mark" width="18" height="13" viewBox="0 0 16 12" aria-hidden="true" style={{ left: DW / 2 - 9, top: CY - R + lf * 0.62 }}><path d="M0 0H16L8 12Z" fill="#F3E8CC" /></svg>
        <div data-orb-lens="" style={{ position: "absolute", left: DW / 2 - 400, top: CY - 400, width: 800, height: 800, transform: `scale(${LD / 800})`, transformOrigin: "50% 50%", pointerEvents: "none" }}>{dial}</div>
      </div>
      <div className="orb-dwrap" style={{ height: descH }}>
        {arrow(-1, "Previous service")}
        <div className="orb-dc">{desc}</div>
        {arrow(1, "Next service")}
      </div>
    </div>
  );

  return (
    <section ref={rootRef} id={id} aria-label="Services" className="orb-root" data-variant={variant}>
      <p ref={live} className="lens-sr" aria-live="polite" />
      {scrollLinked ? (
        <>
          {bodyA}
          <span id={`${uid}-after`} className="orb-after" />
        </>
      ) : (
        body
      )}
      {/* JavaScript off: every service in plain text (CSS in <noscript> swaps it in) */}
      <div className="orb-static">
        <h2 className="orb-h">{content.heading.lead} <i>{content.heading.emphasis}</i></h2>
        <ul>
          {items.map((v) => (
            <li key={v.id}>
              <h3>{v.name}</h3>
              <p>{v.focal} · {v.description}</p>
              <p>{v.details.join(" · ")}</p>
              {v.href && <a href={v.href}>Explore service →</a>}
            </li>
          ))}
        </ul>
      </div>
      <noscript>
        <style>{`.orb-stage,.orb-track{display:none!important}.orb-static{display:block!important}`}</style>
      </noscript>
    </section>
  );
}
