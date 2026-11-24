"use client";

import { useEffect, useMemo, useRef } from "react";
import { Heading, Logo, aspectOf, optical, useMedia, type Partner } from "./shared";

/**
 * MAGNETIC COLLABORATIONS (lab prototype). Readable partner logos sit around a small red RMZ square that acts as a magnet.
 *  · Desktop: moving the pointer inside the field moves the square a limited distance; only the two nearest logos respond — a small, damped pull towards the square and a slight tilt —
 *    and a hairline red connector joins the square to each. Leaving settles everything back.
 *  · Click / tap / Enter / Space on the square: the logos gather into a compact, non-overlapping cluster around it, hold briefly, and return. One deliberate moment, never automatic,
 *    repeated activations are ignored until it has finished.
 *  · Phones: drag the square (dragging is captured only when it starts on the square; the rest of the field scrolls normally); a tap gathers; a drag never triggers the gather.
 * Everything is driven by ONE requestAnimationFrame loop that writes transforms only, runs only while something is moving and the section is on screen, and cleans up after itself.
 * Reduced motion: the static composition; no attraction, tilt or gathering travel.
 */

type Pt = [number, number];
// Slot centres as fractions of the field (x, y). Slightly irregular, balanced on both sides of the square, the centre kept clear.
const DESKTOP: Pt[] = [[0.075, 0.3], [0.2, 0.7], [0.19, 0.16], [0.325, 0.5], [0.325, 0.84], [0.275, 0.2], [0.925, 0.26], [0.795, 0.74], [0.8, 0.14], [0.675, 0.5], [0.68, 0.86], [0.7, 0.22]];
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
  const sizes = useMemo(() => partners.map((p) => {
    const w = phone ? optical(p, 2900, 66, 94, 52) : optical(p, 3900, 80, 150, 60);
    return { w, h: Math.round(w / aspectOf(p)) };
  }), [partners, phone]);

  const section = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const magnet = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const api = useRef<{ activate: () => void } | null>(null);

  useEffect(() => {
    const fieldEl = field.current, magEl = magnet.current;
    const itemEls = items.current;
    if (!fieldEl || !magEl) return;
    api.current = { activate: () => {} };
    if (reduced) return; // static composition: nothing is ever moved
    const mag = 28; // half the square
    const S = {
      w: 0, h: 0, tx: 0, ty: 0, mx: 0, my: 0,
      wt: new Float32Array(n), wc: new Float32Array(n), dx: new Float32Array(n), dy: new Float32Array(n), rot: new Float32Array(n),
      pair: [-1, -1] as [number, number], phase: "idle" as "idle" | "in" | "hold" | "out", t: 0, p: 0, drag: false, visible: false, raf: 0, last: 0, cluster: [] as Pt[], csc: 1,
    };
    // limits keep the square clear of the logos at rest (desktop: ±60 × ±30; phone: it may travel in the gap between the logo columns)
    const lim = phone ? { x: 30, y: 62, maxD: 9 } : { x: 60, y: 30, maxD: 14 };
    const rest = (i: number): Pt => [slots[i][0] * S.w, slots[i][1] * S.h];

    const measure = () => { const r = fieldEl.getBoundingClientRect(); S.w = r.width; S.h = r.height; };
    const buildCluster = () => {
      // Two halves (by rest height) of the logos packed in rows above and below the square: no overlap, every logo identifiable.
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
      S.cluster = out; S.csc = sc;
    };

    const frame = (now: number) => {
      S.raf = 0;
      const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
      const gathering = S.phase !== "idle";
      // magnet: follows its target (the centre while gathering), damped
      const tx = gathering ? 0 : S.tx, ty = gathering ? 0 : S.ty;
      const km = smooth(dt, gathering ? 0.16 : 0.13);
      S.mx += (tx - S.mx) * km; S.my += (ty - S.my) * km;
      // gather phases
      if (S.phase !== "idle") {
        S.t += dt;
        if (S.phase === "in") { S.p = ease(S.t / 0.6); if (S.t >= 0.6) { S.phase = "hold"; S.t = 0; S.p = 1; } }
        else if (S.phase === "hold") { S.p = 1; if (S.t >= 0.65) { S.phase = "out"; S.t = 0; } }
        else { S.p = 1 - ease(S.t / 0.85); if (S.t >= 0.85) { S.phase = "idle"; S.t = 0; S.p = 0; } }
      }
      // nearest two (with hysteresis) respond to the square — only once it has actually been moved
      const mxp = S.w / 2 + S.mx, myp = S.h / 2 + S.my;
      const dist = (i: number) => { const [rx, ry] = rest(i); return Math.hypot(rx - mxp, ry - myp); };
      const mv = Math.hypot(S.mx, S.my);
      const active = !gathering && S.p === 0 ? clamp((mv - 3) / 10, 0, 1) : 0;
      let [a, b] = S.pair;
      if (a < 0 || b < 0) { const order = [...Array(n).keys()].sort((i, j) => dist(i) - dist(j)); a = order[0]; b = order[1]; }
      else {
        const challenger = [...Array(n).keys()].filter((i) => i !== a && i !== b).sort((i, j) => dist(i) - dist(j))[0];
        if (challenger !== undefined) { const far = dist(a) > dist(b) ? a : b; if (dist(challenger) + 14 < dist(far)) { if (far === a) a = challenger; else b = challenger; } }
      }
      S.pair = [a, b];
      let busy = gathering || mv > 0.4 || S.drag || Math.hypot(tx - S.mx, ty - S.my) > 0.3;
      const kw = smooth(dt, 0.2);
      for (let i = 0; i < n; i++) {
        S.wt[i] = (i === a || i === b ? 1 : 0) * active;
        S.wc[i] += (S.wt[i] - S.wc[i]) * kw;
        const [rx, ry] = rest(i);
        const vx = mxp - rx, vy = myp - ry, d = Math.hypot(vx, vy) || 1;
        // never pull a logo closer than 14 px to the square (edge to edge, along the line between them)
        const e1 = edge(rx, ry, sizes[i].w / 2, sizes[i].h / 2, mxp, myp), e2 = edge(mxp, myp, mag, mag, rx, ry);
        const gap = Math.hypot(e1[0] - e2[0], e1[1] - e2[1]);
        const pull = Math.min(lim.maxD, d * 0.1, Math.max(0, gap - 14)) * S.wc[i];
        let ax = (vx / d) * pull, ay = (vy / d) * pull;
        let rot = S.wc[i] * clamp(vy * 0.05, -6, 6) * (vx >= 0 ? 1 : -1);
        let sc = 1;
        if (S.p > 0 || S.phase !== "idle") {
          const c = S.cluster[i] ?? [0, 0];
          const gx = S.w / 2 + S.mx + c[0] - rx, gy = S.h / 2 + S.my + c[1] - ry;
          ax = ax * (1 - S.p) + gx * S.p; ay = ay * (1 - S.p) + gy * S.p; rot *= 1 - S.p; sc = 1 + (S.csc - 1) * S.p;
        }
        S.dx[i] = ax; S.dy[i] = ay; S.rot[i] = rot;
        if (S.wc[i] > 0.002 || Math.abs(S.wt[i] - S.wc[i]) > 0.002) busy = true;
        const el = itemEls[i];
        if (el) el.style.transform = `translate(-50%, -50%) translate3d(${ax.toFixed(2)}px, ${ay.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
      magEl.style.transform = `translate3d(${S.mx.toFixed(2)}px, ${S.my.toFixed(2)}px, 0)`;
      // hairline connectors to the two responding logos (hidden while gathering)
      [a, b].forEach((i, k) => {
        const ln = lines.current[k]; if (!ln) return;
        const w = S.p > 0 ? 0 : S.wc[i];
        if (w < 0.01) { ln.style.opacity = "0"; return; }
        const [rx, ry] = rest(i); const lx = rx + S.dx[i], ly = ry + S.dy[i];
        const s = edge(mxp, myp, mag + 3, mag + 3, lx, ly), e = edge(lx, ly, sizes[i].w / 2 + 5, sizes[i].h / 2 + 5, mxp, myp);
        ln.setAttribute("x1", s[0].toFixed(1)); ln.setAttribute("y1", s[1].toFixed(1)); ln.setAttribute("x2", e[0].toFixed(1)); ln.setAttribute("y2", e[1].toFixed(1)); ln.style.opacity = (0.85 * w).toFixed(3);
      });
      if (!busy) { for (let i = 0; i < n; i++) { const el = itemEls[i]; if (el) el.style.transform = ""; } magEl.style.transform = ""; lines.current.forEach((l) => l && (l.style.opacity = "0")); S.last = 0; return; }
      if (S.visible) S.raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!S.raf && S.visible) { S.last = 0; S.raf = requestAnimationFrame(frame); } };

    // pointer inside the field (mouse): the square follows a little
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || S.drag) return;
      const r = fieldEl.getBoundingClientRect();
      S.tx = clamp((e.clientX - (r.left + r.width / 2)) * 0.2, -lim.x, lim.x);
      S.ty = clamp((e.clientY - (r.top + r.height / 2)) * 0.28, -lim.y, lim.y);
      kick();
    };
    const onLeave = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; S.tx = 0; S.ty = 0; kick(); };
    // drag from the square (touch / pen; also works with a mouse)
    let down: { id: number; x: number; y: number; t: number; moved: boolean; ox: number; oy: number } | null = null;
    let suppress = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, ox: S.tx, oy: S.ty };
      magEl.setPointerCapture(e.pointerId);
    };
    const onDragMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const mvx = e.clientX - down.x, mvy = e.clientY - down.y;
      if (!down.moved && Math.hypot(mvx, mvy) > 8) { down.moved = true; S.drag = true; magEl.dataset.drag = "1"; }
      if (down.moved) { S.tx = clamp(down.ox + mvx, -lim.x, lim.x); S.ty = clamp(down.oy + mvy, -lim.y, lim.y); kick(); }
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
    api.current = { activate: gather };
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
      magEl.style.transform = "";
    };
  }, [reduced, phone, n, slots, sizes]);

  return (
    <section ref={section} className="mg" aria-labelledby="mg-h">
      <div className="mg-wrap">
        <Heading label={label} lead={headingLead} emphasis={headingEmphasis} />
        <div ref={field} className="mg-field">
          <svg className="mg-lines" aria-hidden="true"><line ref={(e) => { lines.current[0] = e; }} /><line ref={(e) => { lines.current[1] = e; }} /></svg>
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
