"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Media, Project } from "@/content/work-v3/types";
import { Plate } from "./art";
import { MQ, setupMotion } from "./motion";

/**
 * THE LIVING CANVAS — the signature gallery.
 *  A fixed composition with named poses: one dominant frame (D), supporting frames offset and partly cropped by the stage edge
 *  (S0…S2), and the previous dominant frame parked in a lower-left position (P). Every other frame waits off-stage.
 *  Start    D = first item, P = the last, S = the next ones in order.
 *  Trigger  click/tap a frame, the arrows, ← → / Home / End, or a horizontal drag/swipe on the stage. Never captures wheel or vertical touch.
 *  Middle   every frame travels to its new pose together (transform-only, staggered by role), the old D moving to P.
 *  End      the chosen frame is dominant; number, caption and progress have updated; nothing is locked.
 *  Exit     there is nothing to exit: it is ordinary content in normal page flow.
 */

type Box = { cx: number; cy: number; w: number; h: number };
const DESK = {
  D: { cx: 36, cy: 51, w: 52, h: 88 },
  S: [{ cx: 79, cy: 24, w: 27, h: 40 }, { cx: 91, cy: 70, w: 24, h: 46 }, { cx: 66, cy: 84, w: 19, h: 30 }],
  P: { cx: 5, cy: 87, w: 22, h: 30 },
};
const MOB = {
  D: { cx: 46, cy: 36, w: 80, h: 62 },
  S: [{ cx: 84, cy: 84, w: 38, h: 30 }, { cx: 50, cy: 91, w: 30, h: 20 }],
  P: { cx: 10, cy: 84, w: 30, h: 28 },
};
const OFF_R: Box = { cx: 118, cy: 50, w: 22, h: 34 };
const OFF_L: Box = { cx: -18, cy: 50, w: 22, h: 34 };
const BASE = 760; // px width every frame is built at; poses only scale/translate it

type Role = "D" | "P" | "QR" | "QL" | `S${number}`;

function roles(cur: number, prev: number | null, n: number, nS: number): Role[] {
  const r: (Role | null)[] = Array(n).fill(null);
  r[cur] = "D";
  if (prev !== null && prev !== cur && n > 1) r[prev] = "P";
  let k = 0;
  for (let step = 1; step < n && k < nS; step++) {
    const j = (cur + step) % n;
    if (!r[j]) r[j] = `S${k++}` as Role;
  }
  return r.map((x, j) => x ?? (((j - cur + n) % n) <= n / 2 ? "QR" : "QL"));
}

export function LivingCanvas({ project, items }: { project: Project; items: Media[] }) {
  const n = items.length;
  const stage = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const [st, setSt] = useState<{ cur: number; prev: number | null }>({ cur: 0, prev: n > 1 ? n - 1 : null });
  const stRef = useRef(st);
  const first = useRef(true);
  const drag = useRef({ x: 0, y: 0, down: false, moved: false });
  const [desktop, setDesktop] = useState(true);
  const nS = desktop ? DESK.S.length : MOB.S.length;
  const rolesNow = roles(st.cur, st.prev, n, nS);

  const poseOf = useCallback((role: Role, i: number, SW: number, SH: number, isDesk: boolean) => {
    const set = isDesk ? DESK : MOB;
    const box: Box = role === "D" ? set.D : role === "P" ? set.P : role === "QR" ? OFF_R : role === "QL" ? OFF_L : set.S[Number(role.slice(1))] ?? OFF_R;
    const h0 = BASE / items[i].ratio;
    const s = Math.min((box.w * SW / 100) / BASE, (box.h * SH / 100) / h0);
    const z = role === "D" ? 6 : role === "P" ? 3 : role.startsWith("S") ? 5 - Number(role.slice(1)) : 0;
    return { x: box.cx * SW / 100 - (BASE * s) / 2, y: box.cy * SH / 100 - (h0 * s) / 2, scale: s, opacity: role === "QR" || role === "QL" ? 0 : 1, zIndex: z };
  }, [items]);

  // Place (instantly) on mount and whenever the stage resizes; animate on selection.
  const layout = useCallback((animate: boolean) => {
    const { gsap } = setupMotion();
    const el = stage.current;
    if (!el) return;
    const SW = el.clientWidth, SH = el.clientHeight;
    const isDesk = window.matchMedia(MQ.desktop).matches;
    const cur = stRef.current;
    const rs = roles(cur.cur, cur.prev, n, isDesk ? DESK.S.length : MOB.S.length);
    const motion = window.matchMedia(MQ.motion).matches;
    items.forEach((_, i) => {
      const node = els.current[i];
      if (!node) return;
      const p = poseOf(rs[i], i, SW, SH, isDesk);
      const role = rs[i];
      gsap.set(node, { zIndex: p.zIndex, transformOrigin: "0 0" });
      if (!animate || !motion) {
        gsap.set(node, { x: p.x, y: p.y, scale: p.scale, opacity: p.opacity });
      } else {
        const delay = role === "D" ? 0 : role === "P" ? 0.05 : role.startsWith("S") ? 0.1 + Number(role.slice(1)) * 0.05 : 0;
        gsap.to(node, { x: p.x, y: p.y, scale: p.scale, opacity: p.opacity, duration: role === "D" ? 1.05 : 0.95, delay, ease: "rmz", overwrite: "auto" });
      }
    });
  }, [items, n, poseOf]);

  useLayoutEffect(() => {
    stRef.current = st;
    layout(!first.current);
    first.current = false;
  }, [st, layout, desktop]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const mq = window.matchMedia(MQ.desktop);
    const onMq = () => setDesktop(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    const ro = new ResizeObserver(() => layout(false));
    ro.observe(el);
    return () => {
      mq.removeEventListener("change", onMq);
      ro.disconnect();
    };
  }, [layout]);

  const go = useCallback((to: number) => {
    const next = ((to % n) + n) % n;
    if (next === stRef.current.cur) return;
    setSt({ cur: next, prev: stRef.current.cur });
  }, [n]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(st.cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(st.cur - 1); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(n - 1); }
  };

  // Horizontal drag / swipe. Vertical movement is never captured (touch-action: pan-y), so page scroll is untouched.
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, down: true, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      d.moved = true;
      const node = els.current[st.cur];
      if (node) {
        const { gsap } = setupMotion();
        const p = poseOf("D", st.cur, stage.current!.clientWidth, stage.current!.clientHeight, window.matchMedia(MQ.desktop).matches);
        gsap.to(node, { x: p.x + dx * 0.35, duration: 0.25, ease: "rmz", overwrite: "auto" });
      }
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (d.moved && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) go(st.cur + (dx < 0 ? 1 : -1));
    else if (d.moved) layout(true);
    window.setTimeout(() => { d.moved = false; }, 0);
  };
  const onCancel = () => { if (drag.current.moved) layout(true); drag.current.down = false; drag.current.moved = false; };

  const click = (i: number) => {
    if (drag.current.moved) return;
    go(i);
    stage.current?.focus({ preventScroll: true });
  };

  const m = items[st.cur];
  const pad = (v: number) => String(v).padStart(2, "0");

  return (
    <div className="v3-lc" id="canvas">
      <div
        ref={stage}
        className="v3-lc-stage"
        tabIndex={0}
        role="group"
        aria-roledescription="gallery"
        aria-label={`${project.name} — gallery, ${n} frames. Use the arrow keys to change the dominant frame.`}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        {items.map((it, i) => {
          const role = rolesNow[i];
          const active = role === "D";
          const visible = active || role === "P" || role.startsWith("S");
          return (
            <button
              key={it.id}
              ref={(node) => { els.current[i] = node; }}
              type="button"
              className={`v3-lc-item${active ? " is-dom" : ""}`}
              style={{ width: BASE, height: BASE / it.ratio }}
              tabIndex={visible && !active ? 0 : -1}
              aria-hidden={visible ? undefined : true}
              aria-current={active || undefined}
              aria-label={`${it.title}, ${it.tag}. Frame ${i + 1} of ${n}${active ? ", current" : ""}`}
              onClick={() => click(i)}
            >
              <span className="v3-lc-in"><Plate media={it} project={project} /></span>
            </button>
          );
        })}
      </div>

      <div className="v3-lc-hud">
        <div className="v3-lc-num" aria-hidden="true">
          <span className="v3-lc-roll"><b key={st.cur}>{pad(st.cur + 1)}</b></span>
          <i>/ {pad(n)}</i>
        </div>
        <div className="v3-lc-cap" aria-live="polite" key={m.id}>
          <p className="v3-lc-tag">{m.tag}</p>
          <h3>{m.title}</h3>
          <p>{m.caption}</p>
        </div>
        <div className="v3-lc-ctl">
          <div className="v3-lc-ticks" role="group" aria-label="Gallery progress">
            {items.map((it, i) => (
              <button key={it.id} type="button" className={`v3-lc-tick${i === st.cur ? " is-on" : ""}`} aria-label={`Go to frame ${i + 1}: ${it.title}`} aria-current={i === st.cur || undefined} onClick={() => go(i)}>
                <span />
              </button>
            ))}
          </div>
          <div className="v3-lc-btns">
            <button type="button" className="v3-lc-btn" aria-label="Previous frame" onClick={() => go(st.cur - 1)}>←</button>
            <button type="button" className="v3-lc-btn" aria-label="Next frame" onClick={() => go(st.cur + 1)}>→</button>
          </div>
          <p className="v3-lc-hint t-meta">{desktop ? "Select a frame · drag · ← →" : "Tap a frame · or swipe"}</p>
        </div>
      </div>
    </div>
  );
}
