"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CollabPartner, CollaborationsContent } from "@/content/collab-types";
import { WORDMARKS, Wordmark } from "@/components/home/collective/wordmarks";
import { computeLayout, packRows, type Pt } from "./layout";
import "./collaborations.css";

/**
 * COLLABORATIONS — magnetic logos (approved prototype, now content-driven).
 *  · Readable partner logos sit around a small red square: above, below and beside it. The arrangement is CALCULATED from the visible entries, their real artwork bounds and the
 *    available width (layout.ts), so adding / hiding / resizing / reordering never needs code. More logos = a taller section; nothing is shrunk, overlapped, hidden or scrolled.
 *  · Pointer (desktop) / a finger dragging the square (phones): the square follows across the field, stays inside it and never covers a logo (collisions are resolved locally).
 *    Only the nearest TWO logos respond — a distance-based pull (up to 32 px) and a slight tilt — and a short hairline connector fades in once the pull is meaningful.
 *  · Click / tap / Enter / Space on the square: the logos gather into a compact, non-overlapping cluster around it, hold, and return. Repeats never stack.
 * ONE requestAnimationFrame loop, frame-rate-independent damping, transforms only; it runs only while something moves and the section is on screen.
 * Reduced motion: the static composition. The arrangement is stable during interaction: it only changes with the width, the content or an artwork finishing loading.
 */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);
const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
/** Where the ray from the centre (cx,cy) towards (tx,ty) leaves a box of half-size (hw,hh): connectors stop on the visible edge of a logo / the square. */
function edge(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number): Pt {
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return [cx + dx * s, cy + dy * s];
}
/** Edge-to-edge distance between two axis-aligned boxes (0 when they touch or overlap). */
const boxGap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  Math.hypot(Math.max(Math.abs(ax - bx) - (aw + bw) / 2, 0), Math.max(Math.abs(ay - by) - (ah + bh) / 2, 0));

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Aspect (width / height) of a partner's mark: the artwork's real size (declared, or measured once it has loaded), the built-in placeholder wordmark, or the name set as text. */
function aspectOf(p: CollabPartner, measured: Record<string, number>, failed: boolean) {
  if (p.logo && !failed) {
    if (p.logo.width && p.logo.height) return p.logo.width / p.logo.height;
    return measured[p.id] ?? 2.4;
  }
  if (p.mark) return WORDMARKS[p.mark].w / WORDMARKS[p.mark].h;
  return Math.max(1.6, p.name.length * 0.62);
}

/** Width that gives every mark about the same visual weight (area ≈ constant), with a legibility boost for compact / stacked marks, then the editor's size setting. */
function sizeOf(aspect: number, scale: number, phone: boolean, W: number) {
  const boost = 1 + clamp(1.9 - aspect, 0, 1) * 0.85;
  const area = (phone ? 3400 : 4700) * boost;
  const [minW, maxW, maxH] = phone ? [70, 96, 64] : [96, 158, 78];
  let w = clamp(Math.sqrt(area * aspect), minW, maxW);
  if (w / aspect > maxH) w = maxH * aspect;
  w *= scale / 100;
  w = Math.min(w, W * (phone ? 0.62 : 0.5), (phone ? 110 : 150) * aspect);
  w = Math.max(w, 28);
  return { w: Math.round(w), h: Math.max(8, Math.round(w / aspect)) };
}

function Mark({ p, w, h, failed, onFail, onMeasure }: { p: CollabPartner; w: number; h: number; failed: boolean; onFail: () => void; onMeasure: (aspect: number) => void }) {
  const alt = p.alt.trim() || p.logo?.alt?.trim() || p.name;
  const ref = useRef<HTMLImageElement>(null);
  // The image may finish (or fail) before React attaches onLoad / onError (server-rendered, cached): so also read it as soon as it mounts. decode() tells a broken image from
  // an SVG that merely declares no size (which reports 0 × 0 in some browsers).
  const src = p.logo?.src;
  useEffect(() => {
    const im = ref.current;
    if (!im || !im.complete) return;
    if (im.naturalWidth > 0 && im.naturalHeight > 0) onMeasure(im.naturalWidth / im.naturalHeight);
    else im.decode().catch(onFail);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the artwork itself changes
  }, [src]);
  if (p.logo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- editor-supplied partner artwork at its own proportions; sized by the layout
      <img
        src={p.logo.src}
        alt={alt}
        width={w}
        height={h}
        decoding="async"
        draggable={false}
        ref={ref}
        onError={onFail}
        onLoad={(e) => {
          const im = e.currentTarget;
          if (im.naturalWidth > 0 && im.naturalHeight > 0) onMeasure(im.naturalWidth / im.naturalHeight);
        }}
      />
    );
  }
  if (p.mark) return <Wordmark id={p.mark} width={w} label={alt} />;
  return (
    <span className="cm-text" style={{ fontSize: Math.round(h * 0.78) }} role="img" aria-label={alt}>
      {p.name}
    </span>
  );
}

/** `anchorId`: the section's DOM id; `null` when a wrapper that does not move owns the #collaborations anchor (the pinned closing cover). */
export function Collaborations({ content, anchorId = "collaborations" }: { content: CollaborationsContent; anchorId?: string | null }) {
  const phone = useMedia("(max-width: 767px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const partners = useMemo(() => content.partners.filter((p) => p.visible), [content.partners]);
  const n = partners.length;
  const m = content.magnet;

  const section = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const magnet = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);

  const [width, setWidth] = useState(0);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [magFailed, setMagFailed] = useState(false);

  // the field's width drives the layout; it is re-read on resize
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const read = () => setWidth(Math.round(el.getBoundingClientRect().width));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  const sizes = useMemo(
    () => partners.map((p) => sizeOf(aspectOf(p, measured, !!failed[p.id]), p.scale, phone, width || 1312)),
    [partners, measured, failed, phone, width],
  );
  const layout = useMemo(() => (width > 0 && n > 0 ? computeLayout(sizes.map((s) => s.w), sizes.map((s) => s.h), width, phone) : null), [sizes, width, phone, n]);
  const ready = !!layout;

  useEffect(() => {
    const fieldEl = field.current, magEl = magnet.current;
    const itemEls = items.current, lineEls = lines.current;
    if (!fieldEl || !magEl || !layout) return;
    if (reduced) return; // static composition: nothing is ever moved
    const L = layout;
    const mag = L.mag / 2; // half the square
    const MAXPULL = phone ? 26 : 32, REACH = 240, CLEAR = 12, TAU_M = 0.07, TAU_L = 0.16;
    const [cx0, cy0] = L.magnet;
    const S = {
      tx: 0, ty: 0, mx: 0, my: 0,
      dx: new Float32Array(n), dy: new Float32Array(n), rot: new Float32Array(n),
      pair: [-1, -1] as [number, number], phase: "idle" as "idle" | "in" | "hold" | "out", t: 0, p: 0, drag: false, visible: false, raf: 0, last: 0, cluster: [] as Pt[], csc: 1,
    };
    const rest = (i: number) => L.pos[i];
    const gapTo = (i: number, px: number, py: number) => boxGap(px, py, L.mag, L.mag, L.pos[i][0], L.pos[i][1], sizes[i].w, sizes[i].h);

    /** The square follows the pointer anywhere in the field but never covers a logo. Collisions are resolved locally: over a logo's (expanded) box, the square takes the nearest free
     *  spot on that box's edge (checked against all the others); the field's edge keeps it inside. If no free spot exists it stays where it is. */
    const pad = mag + (phone ? 10 : 16);
    const resolve = (fx: number, fy: number): Pt => {
      const edgeM = mag + 6;
      const free = (x: number, y: number) => {
        if (x < edgeM - 0.5 || x > L.width - edgeM + 0.5 || y < edgeM - 0.5 || y > L.height - edgeM + 0.5) return false;
        for (let i = 0; i < n; i++) { const [cx, cy] = rest(i); if (Math.abs(x - cx) < sizes[i].w / 2 + pad - 0.5 && Math.abs(y - cy) < sizes[i].h / 2 + pad - 0.5) return false; }
        return true;
      };
      const px = clamp(fx, edgeM, L.width - edgeM), py = clamp(fy, edgeM, L.height - edgeM);
      if (free(px, py)) return [px, py];
      let best: Pt | null = null, bd = Infinity;
      for (let i = 0; i < n; i++) {
        const [cx, cy] = rest(i); const ex = sizes[i].w / 2 + pad, ey = sizes[i].h / 2 + pad;
        const cand: Pt[] = [[cx - ex, clamp(py, cy - ey, cy + ey)], [cx + ex, clamp(py, cy - ey, cy + ey)], [clamp(px, cx - ex, cx + ex), cy - ey], [clamp(px, cx - ex, cx + ex), cy + ey]];
        for (const [x, y] of cand) { if (!free(x, y)) continue; const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = [x, y]; } }
      }
      return best ?? [cx0 + S.tx, cy0 + S.ty];
    };
    const setTarget = (fx: number, fy: number) => { const [px, py] = resolve(fx, fy); S.tx = px - cx0; S.ty = py - cy0; };

    /** Gathering positions for the CURRENT count: the upper half of the logos in rows above the square, the lower half below it (rows balanced to the width). */
    const buildCluster = () => {
      const idx = [...Array(n).keys()].sort((a, b) => rest(a)[1] - rest(b)[1] || rest(a)[0] - rest(b)[0]);
      const half = Math.ceil(n / 2), top = idx.slice(0, half), bot = idx.slice(half);
      const widths = sizes.map((s) => s.w);
      const gap = phone ? 12 : 24, rowGap = 14, avail = L.width - 28;
      const rowsOf = (list: number[]) => packRows(widths, list.sort((a, b) => rest(a)[0] - rest(b)[0]), avail, gap);
      const topRows = rowsOf(top).reverse(); // the row nearest the square comes last
      const botRows = rowsOf(bot);
      // the cluster must also fit the field's height: solve for the scale that does (the gaps next to the square stay fixed)
      const fit = (rows: number[][], room: number) => {
        const sumH = rows.reduce((a, r) => a + Math.max(...r.map((i) => sizes[i].h)), 0);
        return (room - mag - 16 - rowGap * Math.max(0, rows.length - 1)) / sumH;
      };
      let sc = 1;
      if (topRows.length) sc = Math.min(sc, fit(topRows, cy0 - 6));
      if (botRows.length) sc = Math.min(sc, fit(botRows, L.height - cy0 - 6));
      sc = clamp(sc, 0.3, 1);
      const out: Pt[] = Array(n);
      const place = (rows: number[][], dir: -1 | 1) => {
        let y = mag + 16;
        const ordered = dir === -1 ? [...rows].reverse() : rows; // nearest row first
        ordered.forEach((row) => {
          const rh = Math.max(...row.map((i) => sizes[i].h)) * sc;
          const wsum = row.reduce((a, i) => a + sizes[i].w * sc, 0) + gap * sc * (row.length - 1);
          let x = -wsum / 2;
          row.forEach((i) => { out[i] = [x + (sizes[i].w * sc) / 2, dir * (y + rh / 2)]; x += sizes[i].w * sc + gap * sc; });
          y += rh + rowGap;
        });
      };
      place(topRows, -1);
      place(botRows, 1);
      S.cluster = out; S.csc = sc;
    };

    const frame = (now: number) => {
      S.raf = 0;
      const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
      const gathering = S.phase !== "idle";
      // the square: prompt, frame-rate independent (home while gathering)
      const tx = gathering ? 0 : S.tx, ty = gathering ? 0 : S.ty;
      const km = smooth(dt, TAU_M);
      S.mx += (tx - S.mx) * km; S.my += (ty - S.my) * km;
      if (S.phase !== "idle") {
        S.t += dt;
        if (S.phase === "in") { S.p = ease(S.t / 0.6); if (S.t >= 0.6) { S.phase = "hold"; S.t = 0; S.p = 1; } }
        else if (S.phase === "hold") { S.p = 1; if (S.t >= 0.65) { S.phase = "out"; S.t = 0; } }
        else { S.p = 1 - ease(S.t / 0.85); if (S.t >= 0.85) { S.phase = "idle"; S.t = 0; S.p = 0; } }
      }
      const mxp = cx0 + S.mx, myp = cy0 + S.my;
      const away = Math.hypot(S.mx, S.my);
      const act = !gathering && S.p === 0 ? clamp((away - 6) / 18, 0, 1) : 0;
      // the nearest two (by edge gap), with a small hysteresis so the choice never feels stuck
      const gaps = new Float32Array(n); for (let i = 0; i < n; i++) gaps[i] = gapTo(i, mxp, myp);
      let [a, b] = S.pair;
      if (n < 2) { a = 0; b = -1; }
      else if (a < 0 || b < 0 || a >= n || b >= n) { const order = [...Array(n).keys()].sort((i, j) => gaps[i] - gaps[j]); a = order[0]; b = order[1]; }
      else {
        const others = [...Array(n).keys()].filter((i) => i !== a && i !== b).sort((i, j) => gaps[i] - gaps[j]);
        for (const c of others.slice(0, 2)) { const far = gaps[a] > gaps[b] ? a : b; if (gaps[c] + 8 < gaps[far]) { if (far === a) a = c; else b = c; } }
      }
      S.pair = [a, b];
      let busy = gathering || S.drag || Math.hypot(tx - S.mx, ty - S.my) > 0.3;
      const kl = smooth(dt, TAU_L);
      // pull targets for the two responders; each is eased back if it would come within 5 px of a neighbour
      const tdx = new Float32Array(n), tdy = new Float32Array(n), trot = new Float32Array(n);
      if (act > 0) {
        for (const i of [a, b]) {
          if (i < 0) continue;
          const [rx, ry] = rest(i);
          const vx = mxp - rx, vy = myp - ry, d = Math.hypot(vx, vy) || 1;
          const f = ease(1 - gaps[i] / REACH);
          const pull = Math.min(MAXPULL * f, Math.max(0, gaps[i] - CLEAR)) * act;
          let t = 1;
          for (; t > 0; t -= 0.25) {
            const px = rx + (vx / d) * pull * t, py = ry + (vy / d) * pull * t;
            let ok = true;
            for (let j = 0; j < n && ok; j++) {
              if (j === i) continue;
              ok = boxGap(px, py, sizes[i].w + 6, sizes[i].h + 6, rest(j)[0] + S.dx[j], rest(j)[1] + S.dy[j], sizes[j].w + 6, sizes[j].h + 6) >= 5;
            }
            if (ok) break;
          }
          t = Math.max(0, t);
          tdx[i] = (vx / d) * pull * t; tdy[i] = (vy / d) * pull * t;
          trot[i] = f * act * clamp(vy * 0.06, -7, 7) * (vx >= 0 ? 1 : -1) * t;
        }
      }
      for (let i = 0; i < n; i++) {
        const [rx, ry] = rest(i);
        S.dx[i] += (tdx[i] - S.dx[i]) * kl; S.dy[i] += (tdy[i] - S.dy[i]) * kl; S.rot[i] += (trot[i] - S.rot[i]) * kl;
        let ax = S.dx[i], ay = S.dy[i], rot = S.rot[i], sc = 1;
        if (S.p > 0 || gathering) {
          const c = S.cluster[i] ?? [0, 0];
          const gx = cx0 + S.mx + c[0] - rx, gy = cy0 + S.my + c[1] - ry;
          ax = ax * (1 - S.p) + gx * S.p; ay = ay * (1 - S.p) + gy * S.p; rot *= 1 - S.p; sc = 1 + (S.csc - 1) * S.p;
        }
        if (Math.abs(S.dx[i]) + Math.abs(S.dy[i]) + Math.abs(S.rot[i]) > 0.04) busy = true;
        const el = itemEls[i];
        if (el) el.style.transform = `translate(-50%, -50%) translate3d(${ax.toFixed(2)}px, ${ay.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        // a short, faint connector only once the pull is meaningful; it ends on the visible edges of the square and of the logo
        const ln = lineEls[i];
        if (ln) {
          const disp = Math.hypot(S.dx[i], S.dy[i]);
          const meaning = S.p > 0 ? 0 : clamp((disp - 5) / 12, 0, 1) * (1 - clamp((gaps[i] - 50) / 40, 0, 1));
          if (meaning < 0.02) ln.style.opacity = "0";
          else {
            const lx = rx + S.dx[i], ly = ry + S.dy[i];
            const s0 = edge(mxp, myp, mag + 1, mag + 1, lx, ly), e0 = edge(lx, ly, sizes[i].w / 2 + 3, sizes[i].h / 2 + 3, mxp, myp);
            ln.setAttribute("x1", s0[0].toFixed(1)); ln.setAttribute("y1", s0[1].toFixed(1)); ln.setAttribute("x2", e0[0].toFixed(1)); ln.setAttribute("y2", e0[1].toFixed(1));
            ln.style.opacity = (0.8 * meaning).toFixed(3);
          }
        }
      }
      magEl.style.transform = `translate3d(${S.mx.toFixed(2)}px, ${S.my.toFixed(2)}px, 0)`;
      if (!busy) {
        for (let i = 0; i < n; i++) { const el = itemEls[i]; if (el) el.style.transform = "translate(-50%, -50%)"; const ln = lineEls[i]; if (ln) ln.style.opacity = "0"; S.dx[i] = S.dy[i] = S.rot[i] = 0; }
        S.mx = S.tx; S.my = S.ty; magEl.style.transform = S.tx || S.ty ? `translate3d(${S.mx}px, ${S.my}px, 0)` : ""; S.last = 0; return;
      }
      if (S.visible) S.raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!S.raf && S.visible) { S.last = 0; S.raf = requestAnimationFrame(frame); } };

    // pointer inside the field (mouse): the square follows it across the whole field
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || S.drag) return;
      const r = fieldEl.getBoundingClientRect();
      setTarget(e.clientX - r.left, e.clientY - r.top);
      kick();
    };
    const onLeave = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; S.tx = 0; S.ty = 0; kick(); };
    // drag from the square (touch / pen; a mouse can drag it too)
    let down: { id: number; x: number; y: number; moved: boolean; ox: number; oy: number } | null = null;
    let suppress = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const r = fieldEl.getBoundingClientRect();
      // offset between the finger and the square's centre, so it does not jump under the finger
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, ox: e.clientX - (r.left + cx0 + S.mx), oy: e.clientY - (r.top + cy0 + S.my) };
      magEl.setPointerCapture(e.pointerId);
    };
    const onDragMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { down.moved = true; S.drag = true; magEl.dataset.drag = "1"; }
      if (down.moved) { const r = fieldEl.getBoundingClientRect(); setTarget(e.clientX - down.ox - r.left, e.clientY - down.oy - r.top); kick(); }
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      suppress = down.moved; // a drag must not be taken for a tap
      down = null; S.drag = false; delete magEl.dataset.drag;
      if (e.pointerType !== "mouse") { S.tx = 0; S.ty = 0; } // released: settle back home
      kick();
    };
    const gather = () => {
      if (suppress) { suppress = false; return; }
      if (S.phase !== "idle") return; // repeated activations never stack
      buildCluster(); S.phase = "in"; S.t = 0; kick();
    };
    magEl.addEventListener("click", gather);
    magEl.addEventListener("pointerdown", onDown);
    magEl.addEventListener("pointermove", onDragMove);
    magEl.addEventListener("pointerup", onUp);
    magEl.addEventListener("pointercancel", onUp);
    fieldEl.addEventListener("pointermove", onMove);
    fieldEl.addEventListener("pointerleave", onLeave);
    const io = new IntersectionObserver(([e]) => { S.visible = e.isIntersecting; if (S.visible) kick(); else if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; } }, { threshold: 0.05 });
    if (section.current) io.observe(section.current);
    return () => {
      if (S.raf) cancelAnimationFrame(S.raf);
      io.disconnect();
      magEl.removeEventListener("click", gather); magEl.removeEventListener("pointerdown", onDown); magEl.removeEventListener("pointermove", onDragMove); magEl.removeEventListener("pointerup", onUp); magEl.removeEventListener("pointercancel", onUp);
      fieldEl.removeEventListener("pointermove", onMove); fieldEl.removeEventListener("pointerleave", onLeave);
      for (let i = 0; i < n; i++) { const el = itemEls[i]; if (el) el.style.transform = "translate(-50%, -50%)"; }
      lineEls.forEach((l) => l && (l.style.opacity = "0"));
      magEl.style.transform = "";
    };
  }, [reduced, phone, n, layout, sizes]);

  if (!content.visible || n === 0) return null;

  const magSide = layout?.mag ?? 56;
  const art = m.artwork && !magFailed ? m.artwork : null;
  const artPct = clamp(m.artworkScale, 30, 100);
  return (
    <section ref={section} id={anchorId ?? undefined} className="cm" aria-labelledby="cm-h">
      <div className="cm-wrap">
        <p className="cm-label">{content.label}</p>
        <h2 id="cm-h" className="cm-h">
          {content.headingLead} <span className="cm-iv">{content.headingEmphasis}</span>
        </h2>
        <div ref={field} className="cm-field" data-ready={ready ? "" : undefined} style={layout ? { height: layout.height, minHeight: 0 } : undefined}>
          <svg className="cm-lines" aria-hidden="true">
            {partners.map((p, i) => <line key={p.id} ref={(e) => { lines.current[i] = e; }} />)}
          </svg>
          <ul className="cm-logos">
            {partners.map((p, i) => {
              const s = sizes[i];
              const mark = (
                <Mark
                  p={p}
                  w={s.w}
                  h={s.h}
                  failed={!!failed[p.id]}
                  onFail={() => setFailed((f) => (f[p.id] ? f : { ...f, [p.id]: true }))}
                  onMeasure={(a) => setMeasured((mm) => (Math.abs((mm[p.id] ?? 0) - a) < 0.001 ? mm : { ...mm, [p.id]: a }))}
                />
              );
              const external = !!p.href && /^https?:\/\//i.test(p.href);
              return (
                <li
                  key={p.id}
                  ref={(e) => { items.current[i] = e; }}
                  className="cm-logo"
                  style={layout ? { left: layout.pos[i][0], top: layout.pos[i][1] } : undefined}
                >
                  {p.href ? (
                    <a href={p.href} className="cm-link" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {mark}
                    </a>
                  ) : (
                    <span className="cm-static">{mark}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            ref={magnet}
            type="button"
            className="cm-magnet"
            aria-label={m.label}
            aria-disabled={reduced || undefined}
            style={{
              left: layout ? layout.magnet[0] - magSide / 2 : undefined,
              top: layout ? layout.magnet[1] - magSide / 2 : undefined,
              width: magSide,
              height: magSide,
              background: m.background,
              color: m.artworkColor,
              padding: 6,
            }}
          >
            {art ? (
              m.tint ? (
                <span
                  aria-hidden="true"
                  className="cm-mask"
                  style={{ width: `${artPct}%`, height: `${artPct}%`, background: m.artworkColor, WebkitMask: `url("${art.src}") center / contain no-repeat`, mask: `url("${art.src}") center / contain no-repeat` }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- editor-supplied artwork, original colours kept
                <img className="cm-art" src={art.src} alt="" aria-hidden="true" draggable={false} style={{ width: `${artPct}%`, height: `${artPct}%` }} onError={() => setMagFailed(true)} />
              )
            ) : (
              <span aria-hidden="true" style={{ fontSize: `${(phone ? 14 : 15) * (artPct / 100)}px` }}>
                RMZ
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
