"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { FieldShell, inputCls } from "./FormFields";

type Pt = { x: number; y: number };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Visual point picker for the Services lens: shows an image, a pin on it, and (for the overview) the window the lens will show at the chosen zoom.
 * Click or drag to place the pin; arrow keys nudge it (Shift = bigger steps); the two number boxes are the same coordinates in percent.
 * Coordinates are 0–1 of the image file itself (x → right, y → down). `zoom` (target picker): the pin is kept where the zoomed window stays inside the image.
 */
export function PointField({ label, help, error, value, onChange, image, zoom, role }: { label: string; help?: string; error?: string; value: Pt | null; onChange: (v: Pt) => void; image: string | null; zoom?: number; role: "target" | "focal" }) {
  const box = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const aspect = nat ? nat.w / nat.h : 1;
  const m = nat ? Math.min(nat.w, nat.h) : 1;
  // the window (target) / square crop (focal) as a share of the image width and height
  const k = role === "target" && zoom ? 1 / zoom : 1;
  const ww = nat ? (k * m) / nat.w : k;
  const wh = nat ? (k * m) / nat.h : k;
  const lim = (v: number, half: number) => clamp(v, half, 1 - half);
  const p = { x: lim(value?.x ?? 0.5, role === "target" ? ww / 2 : 0), y: lim(value?.y ?? 0.5, role === "target" ? wh / 2 : 0) };
  const set = (x: number, y: number) => onChange({ x: r3(lim(x, role === "target" ? ww / 2 : 0)), y: r3(lim(y, role === "target" ? wh / 2 : 0)) });
  const at = (e: PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (r) set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const key = (e: KeyboardEvent) => {
    const s = e.shiftKey ? 0.05 : 0.01;
    const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (!d[e.key]) return;
    e.preventDefault();
    set(p.x + d[e.key][0], p.y + d[e.key][1]);
  };
  const num = (axis: "x" | "y", t: string) => {
    const n = Number(t);
    if (Number.isFinite(n)) set(axis === "x" ? n / 100 : p.x, axis === "y" ? n / 100 : p.y);
  };
  return (
    <FieldShell label={label} help={help} error={error}>
      <div className="grid gap-2">
        <div
          ref={box}
          role="application"
          aria-label={`${label}: click or drag to place the point`}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); at(e); }}
          onPointerMove={(e) => { if (e.buttons) at(e); }}
          className="relative w-full max-w-[340px] touch-none select-none overflow-hidden rounded-md border border-fg/25 bg-[#151412]"
          style={{ aspectRatio: String(aspect), cursor: "crosshair" }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" draggable={false} onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} className="absolute inset-0 h-full w-full" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-xs text-white/50">Add the image first</span>
          )}
          {role === "target" && (
            <span aria-hidden className="pointer-events-none absolute border-2 border-dashed border-[#ffca26]" style={{ left: `${(p.x - ww / 2) * 100}%`, top: `${(p.y - wh / 2) * 100}%`, width: `${ww * 100}%`, height: `${wh * 100}%`, boxShadow: "0 0 0 9999px rgba(0,0,0,.45)" }} />
          )}
          <button
            type="button"
            aria-label={`${label} pin, ${Math.round(p.x * 100)}% across, ${Math.round(p.y * 100)}% down`}
            onKeyDown={key}
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#d52518] shadow focus:outline-none focus:ring-2 focus:ring-[#ffca26]"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-fg/70">
          <label className="flex items-center gap-1">Across %<input type="number" min={0} max={100} step={1} value={Math.round(p.x * 100)} onChange={(e) => num("x", e.target.value)} className={`${inputCls} w-20`} /></label>
          <label className="flex items-center gap-1">Down %<input type="number" min={0} max={100} step={1} value={Math.round(p.y * 100)} onChange={(e) => num("y", e.target.value)} className={`${inputCls} w-20`} /></label>
        </div>
      </div>
    </FieldShell>
  );
}
