"use client";

import { useEffect, useMemo, useRef } from "react";
import { Heading, Logo, aspectOf, optical, useMedia, type Partner } from "./shared";

/**
 * MAGNETIC COLLABORATIONS (lab prototype). Readable partner logos sit around a small red RMZ square — above, below and diagonally — that acts as a magnet.
 *  · Pointer (desktop) / finger dragging the square (phones): the square follows across the whole field, kept inside it and out of the logos (collisions are resolved locally,
 *    a logo's box simply pushes the square round it). Only the nearest TWO logos respond, by distance: a soft pull of up to 32 px towards the square and a slight tilt, and a short
 *    hairline connector fades in between the square's and the logo's edges once the pull is meaningful. Different logos take turns as the square travels.
 *  · Click / tap / Enter / Space on the square: the logos gather into a compact, non-overlapping cluster around it, hold, and return (unchanged). Repeats never stack.
 * ONE requestAnimationFrame loop, frame-rate-independent damping (the square is prompt, the logos follow with a soft lag, no overshoot), transforms only; it runs only while something moves
 * and the section is on screen. Reduced motion: the static composition.
 */

type Pt = [number, number];
// Slot centres as fractions of the field (x, y): one balanced field around the square — rows above and below, two diagonal-side marks — with its surroundings kept clear.
const DESKTOP: Pt[] = [[0.13, 0.2], [0.285, 0.83], [0.325, 0.19], [0.355, 0.52], [0.5, 0.86], [0.52, 0.16], [0.885, 0.2], [0.715, 0.83], [0.725, 0.2], [0.645, 0.52], [0.115, 0.82], [0.9, 0.82]];
const PHONE: Pt[] = [[0.2, 0.1], [0.5, 0.13], [0.8, 0.1], [0.17, 0.3], [0.17, 0.5], [0.17, 0.7], [0.83, 0.3], [0.83, 0.5], [0.83, 0.7], [0.2, 0.9], [0.5, 0.87], [0.8, 0.9]];

const smooth = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);
const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Where the ray from the centre (cx,cy) towards (tx,ty) leaves a box of half-size (hw,hh): used to stop connectors at the edge of a logo / the square. */
function edge(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number): Pt {
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return [cx + dx * s, cy + dy * s];
}

export function MagneticCollab({ label, headingLead, headingEmphasis, partners, reduced }: { label: string; headingLead: string; headingEmphasis: string; partners: Partner[]; reduced: boolean }) {
  const phone = useMedia("(max-width: 767px)");
  const n = partners.length;
  const slots = useMemo(() => (phone ? PHONE : DESKTOP).slice(0, n), [phone, n]);
  // Optical sizing: equal visual weight by area, and a legibility boost for the stacked / compact marks (their lettering is small inside a near-square box).
  const sizes = useMemo(() => partners.map((p) => {
    const a = aspectOf(p);
    const boost = 1 + clamp(1.9 - a, 0, 1) * 0.85;
    const w = phone ? optical(p, 3400 * boost, 70, 96, 64) : optical(p, 4700 * boost, 96, 158, 78);
    return { w, h: Math.round(w / a) };
  }), [partners, phone]);

  const section = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const magnet = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const fieldEl = field.current, magEl = magnet.current;
    const itemEls = items.current, lineEls = lines.current;
    if (!fieldEl || !magEl) return;
    if (reduced) return; // static composition: nothing is ever moved
    const mag = phone ? 26 : 28; // half the square
    const MAXPULL = phone ? 26 : 32, REACH = 240, CLEAR = 12, TAU_M = 0.07, TAU_L = 0.16;
    const S = {
      w: 0, h: 0, tx: 0, ty: 0, mx: 0, my: 0,
      dx: new Float32Array(n), dy: new Float32Array(n), rot: new Float32Array(n), vis: new Float32Array(n),
      pair: [-1, -1] as [number, number], phase: "idle" as "idle" | "in" | "hold" | "out", t: 0, p: 0, drag: false, visible: false, raf: 0, last: 0, cluster: [] as Pt[], csc: 1,
    };
    const rest = (i: number): Pt => [slots[i][0] * S.w, slots[i][1] * S.h];
    const measure = () => { const r = fieldEl.getBoundingClientRect(); S.w = r.width; S.h = r.height; };
    /** Edge-to-edge gap between the square at (px,py) and logo i at rest. */
    const gapTo = (i: number, px: number, py: number) => {
      const [rx, ry] = rest(i);
      return Math.hypot(Math.max(Math.abs(px - rx) - (mag + sizes[i].w / 2), 0), Math.max(Math.abs(py - ry) - (mag + sizes[i].h / 2), 0));
    };
    /** The square follows the pointer anywhere in the field but never covers a logo. Collisions are resolved locally: if the pointer is over a logo's (expanded) box, the square takes the
     *  nearest free spot on the edge of that box (checked against all the others), and the field's edge keeps it inside. If no free spot exists it simply stays where it is. */
    const pad = mag + 16;
    const resolve = (fx: number, fy: number): Pt => {
      const m = mag + 6;
      const free = (x: number, y: number) => {
        if (x < m - 0.5 || x > S.w - m + 0.5 || y < m - 0.5 || y > S.h - m + 0.5) return false;
        for (let i = 0; i < n; i++) { const [cx, cy] = rest(i); if (Math.abs(x - cx) < sizes[i].w / 2 + pad - 0.5 && Math.abs(y - cy) < sizes[i].h / 2 + pad - 0.5) return false; }
        return true;
      };
      const px = clamp(fx, m, S.w - m), py = clamp(fy, m, S.h - m);
      if (free(px, py)) return [px, py];
      let best: Pt | null = null, bd = Infinity;
      for (let i = 0; i < n; i++) {
        const [cx, cy] = rest(i); const ex = sizes[i].w / 2 + pad, ey = sizes[i].h / 2 + pad;
        const cand: Pt[] = [[cx - ex, clamp(py, cy - ey, cy + ey)], [cx + ex, clamp(py, cy - ey, cy + ey)], [clamp(px, cx - ex, cx + ex), cy - ey], [clamp(px, cx - ex, cx + ex), cy + ey]];
        for (const [x, y] of cand) { if (!free(x, y)) continue; const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = [x, y]; } }
      }
      return best ?? [S.w / 2 + S.tx, S.h / 2 + S.ty];
    };
    const setTarget = (fx: number, fy: number) => { const [px, py] = resolve(fx, fy); S.tx = px - S.w / 2; S.ty = py - S.h / 2; };

    const buildCluster = () => {
      const idx = [...Array(n).keys()].sort((a, b) => slots[a][1] - slots[b][1] || slots[a][0] - slots[b][0]);
      const half = Math.ceil(n / 2), top = idx.slice(0, half), bot = idx.slice(half);
      const rowsPer = phone ? 2 : 1;
      const out: Pt[] = Array(n);
      let sc = 1;
      const rowsOf = (list: number[]) => { const rows: number[][] = []; const per = Math.ceil(list.length / rowsPer); for (let r = 0; r < rowsPer; r++) rows.push(list.slice(r * per, (r + 1) * per).sort((a, b) => slots[a][0] - slots[b][0])); return rows.filter((r) => r.length); };
      const gap = phone ? 12 : 24;
      const all = [...rowsOf(top), ...rowsOf(bot)];
      for (const row of all) { const wsum = row.reduce((a, i) => a + sizes[i].w, 0) + gap * (row.length - 1); sc = Math.min(sc, (S.w - 28) / wsum); }
      const place = (rows: number[][], dir: -1 | 1) => {
        let y = mag + 16;
        rows.forEach((row) => {
          const rh = Math.max(...row.map((i) => sizes[i].h)) * sc;
          const wsum = row.reduce((a, i) => a + sizes[i].w * sc, 0) + gap * sc * (row.length - 1);
          let x = -wsum / 2;
          row.forEach((i) => { out[i] = [x + (sizes[i].w * sc) / 2, dir * (y + rh / 2)]; x += sizes[i].w * sc + gap * sc; });
          y += rh + 14;
        });
      };
      place(rowsOf(top), -1);
      place(rowsOf(bot), 1);
      // the cluster must also fit the field's height: scale everything down a little if it would not
      const ext = Math.max(...out.map((c, i) => Math.abs(c[1]) + (sizes[i].h * sc) / 2));
      const room = S.h / 2 - 8;
      if (ext > room) { sc *= room / ext; place(rowsOf(top), -1); place(rowsOf(bot), 1); }
      S.cluster = out; S.csc = sc;
    };

    const frame = (now: number) => {
      S.raf = 0;
      const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
      const gathering = S.phase !== "idle";
      // the square: prompt, frame-rate independent (the centre while gathering)
      const tx = gathering ? 0 : S.tx, ty = gathering ? 0 : S.ty;
      const km = smooth(dt, TAU_M);
      S.mx += (tx - S.mx) * km; S.my += (ty - S.my) * km;
      if (S.phase !== "idle") {
        S.t += dt;
        if (S.phase === "in") { S.p = ease(S.t / 0.6); if (S.t >= 0.6) { S.phase = "hold"; S.t = 0; S.p = 1; } }
        else if (S.phase === "hold") { S.p = 1; if (S.t >= 0.65) { S.phase = "out"; S.t = 0; } }
        else { S.p = 1 - ease(S.t / 0.85); if (S.t >= 0.85) { S.phase = "idle"; S.t = 0; S.p = 0; } }
      }
      const mxp = S.w / 2 + S.mx, myp = S.h / 2 + S.my;
      const away = Math.hypot(S.mx, S.my);
      const act = !gathering && S.p === 0 ? clamp((away - 6) / 18, 0, 1) : 0;
      // the nearest two (by edge gap), with a small hysteresis so the choice never feels stuck
      const gaps = new Float32Array(n); for (let i = 0; i < n; i++) gaps[i] = gapTo(i, mxp, myp);
      let [a, b] = S.pair;
      if (a < 0 || b < 0) { const order = [...Array(n).keys()].sort((i, j) => gaps[i] - gaps[j]); a = order[0]; b = order[1]; }
      else {
        const others = [...Array(n).keys()].filter((i) => i !== a && i !== b).sort((i, j) => gaps[i] - gaps[j]);
        for (const c of others.slice(0, 2)) { const far = gaps[a] > gaps[b] ? a : b; if (gaps[c] + 8 < gaps[far]) { if (far === a) a = c; else b = c; } }
      }
      S.pair = [a, b];
      let busy = gathering || S.drag || Math.hypot(tx - S.mx, ty - S.my) > 0.3;
      const kl = smooth(dt, TAU_L);
      for (let i = 0; i < n; i++) {
        const [rx, ry] = rest(i);
        let tdx = 0, tdy = 0, trot = 0;
        if ((i === a || i === b) && act > 0) {
          const vx = mxp - rx, vy = myp - ry, d = Math.hypot(vx, vy) || 1;
          const f = ease(1 - gaps[i] / REACH);
          const pull = Math.min(MAXPULL * f, Math.max(0, gaps[i] - CLEAR)) * act; // distance-based; never closer than CLEAR to the square
          tdx = (vx / d) * pull; tdy = (vy / d) * pull;
          trot = f * act * clamp(vy * 0.06, -7, 7) * (vx >= 0 ? 1 : -1);
        }
        S.dx[i] += (tdx - S.dx[i]) * kl; S.dy[i] += (tdy - S.dy[i]) * kl; S.rot[i] += (trot - S.rot[i]) * kl;
        let ax = S.dx[i], ay = S.dy[i], rot = S.rot[i], sc = 1;
        if (S.p > 0 || gathering) {
          const c = S.cluster[i] ?? [0, 0];
          const gx = S.w / 2 + S.mx + c[0] - rx, gy = S.h / 2 + S.my + c[1] - ry;
          ax = ax * (1 - S.p) + gx * S.p; ay = ay * (1 - S.p) + gy * S.p; rot *= 1 - S.p; sc = 1 + (S.csc - 1) * S.p;
        }
        if (Math.abs(S.dx[i]) + Math.abs(S.dy[i]) + Math.abs(S.rot[i]) > 0.04) busy = true;
        const el = itemEls[i];
        if (el) el.style.transform = `translate(-50%, -50%) translate3d(${ax.toFixed(2)}px, ${ay.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        // a short, faint connector only once the pull is meaningful; it ends on the visible edges of the square and of the logo, and fades on its own as the logo lets go
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
        for (let i = 0; i < n; i++) { const el = itemEls[i]; if (el) el.style.transform = ""; const ln = lineEls[i]; if (ln) ln.style.opacity = "0"; S.dx[i] = S.dy[i] = S.rot[i] = 0; }
        magEl.style.transform = ""; S.mx = S.tx; S.my = S.ty; if (S.tx || S.ty) magEl.style.transform = `translate3d(${S.mx}px, ${S.my}px, 0)`; S.last = 0; return;
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
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, ox: e.clientX - (r.left + S.w / 2 + S.mx), oy: e.clientY - (r.top + S.h / 2 + S.my) };
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
      if (e.pointerType !== "mouse") { S.tx = 0; S.ty = 0; } // released: settle back to the centre
      kick();
    };
    const gather = () => {
      if (suppress) { suppress = false; return; }
      if (S.phase !== "idle") return; // repeated activations never stack
      measure(); buildCluster(); S.phase = "in"; S.t = 0; kick();
    };
    magEl.addEventListener("click", gather);
    magEl.addEventListener("pointerdown", onDown);
    magEl.addEventListener("pointermove", onDragMove);
    magEl.addEventListener("pointerup", onUp);
    magEl.addEventListener("pointercancel", onUp);
    fieldEl.addEventListener("pointermove", onMove);
    fieldEl.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(() => { measure(); kick(); });
    ro.observe(fieldEl);
    measure();
    const io = new IntersectionObserver(([e]) => { S.visible = e.isIntersecting; if (S.visible) kick(); else if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; } }, { threshold: 0.05 });
    if (section.current) io.observe(section.current);
    return () => {
      if (S.raf) cancelAnimationFrame(S.raf);
      io.disconnect(); ro.disconnect();
      magEl.removeEventListener("click", gather); magEl.removeEventListener("pointerdown", onDown); magEl.removeEventListener("pointermove", onDragMove); magEl.removeEventListener("pointerup", onUp); magEl.removeEventListener("pointercancel", onUp);
      fieldEl.removeEventListener("pointermove", onMove); fieldEl.removeEventListener("pointerleave", onLeave);
      for (let i = 0; i < n; i++) { const el = itemEls[i]; if (el) el.style.transform = ""; }
      lineEls.forEach((l) => l && (l.style.opacity = "0"));
      magEl.style.transform = "";
    };
  }, [reduced, phone, n, slots, sizes]);

  return (
    <section ref={section} className="mg" aria-labelledby="mg-h">
      <div className="mg-wrap">
        <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
        <div ref={field} className="mg-field">
          <svg className="mg-lines" aria-hidden="true">{partners.map((p, i) => <line key={p.name} ref={(e) => { lines.current[i] = e; }} />)}</svg>
          <ul className="mg-logos">
            {partners.map((p, i) => {
              const inner = <Logo p={p} width={sizes[i].w} />;
              return (
                <li key={p.name} ref={(e) => { items.current[i] = e; }} className="mg-logo" style={{ left: `${slots[i][0] * 100}%`, top: `${slots[i][1] * 100}%` }}>
                  {p.href ? <a href={p.href} className="mg-link" aria-label={p.name}>{inner}</a> : <span className="mg-static" role="group" aria-label={p.name}>{inner}</span>}
                </li>
              );
            })}
          </ul>
          <button ref={magnet} type="button" className="mg-magnet" aria-label={reduced ? "RMZ" : "RMZ — gather the collaborations"} aria-disabled={reduced || undefined}>
            <span aria-hidden="true">RMZ</span>
          </button>
        </div>
      </div>
    </section>
  );
}
