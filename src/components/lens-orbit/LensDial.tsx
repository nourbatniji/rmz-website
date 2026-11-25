"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import type { LensContent } from "@/content/types";
import { LensScene } from "@/components/home/lens/lens-scenes";
import "@/components/home/lens/services-lens.css"; // the existing lens' own styles (marks, placeholders); the homepage component is NOT modified

/**
 * LensDial — the EXISTING lens from the homepage Services section (src/components/home/lens/ServicesLens.tsx, `dial()`), lifted into a
 * stand-alone component for the orbital exploration. The markup, geometry, gradients, aperture-blade math, ring marks and glass are copied
 * verbatim from that implementation (800-unit coordinate system, 8 blades, drop shadow, specular highlight, cream pointer); the scenes are the
 * same <LensScene> studies. Only the interaction is removed (the orbit drives it) and the selection point is moved from 9 o'clock to 12 o'clock.
 * The homepage component is untouched; this file does not import from it except the shared scene renderer and stylesheet.
 */

export const STEP = 24; // degrees between focal marks (as on the homepage ring)
const IA = 270; // angle of the first mark: the homepage uses 180 (faces the list at 9 o'clock); here the selection point is 12 o'clock
const VIS = 75; // marks further than this from the pointer are hidden
const IR = { Rp: 356, ap: 361, dl: 21.66, closed: 0.04 };
export const REST = [0.94, 0.66, 0.84, 0.74, 0.96, 0.6, 0.8]; // resting aperture per focal length (homepage values)
export const IRIS = IR;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const th = (o: number) => (Math.acos(clamp((o * IR.ap - IR.dl) / IR.Rp, -1, 1)) * 180) / Math.PI;
const blade = (deg: number) => `translate(${IR.Rp}px,0px) rotate(${deg.toFixed(3)}deg) translate(${-IR.Rp}px,0px)`;

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

export type DialItem = { id: string; ringMark: string; scene: LensContent["items"][number]["scene"] };

type Props = {
  items: DialItem[];
  images: LensContent["images"];
  /** index of the study currently visible in the glass */
  shown: number;
  /** selected service (ring mark at the pointer) */
  sel: number;
  /** iris opening 0–1 (the homepage's `op`) */
  op: number;
  reduced: boolean;
  /** milliseconds for the blade transition */
  bladeMs: number;
  /** Prototype only: replaces the interior scene stack (the lens drawing, blades, glass and pointer stay exactly as they are). */
  interior?: ReactNode;
};

export function LensDial({ items, images, shown, sel, op, reduced, bladeMs, interior }: Props) {
  const uid = useId();
  const rot = -sel * STEP;
  const T = (t: string) => (reduced ? "none" : t);
  const bladeStyle = {
    transform: blade(th(op)),
    transformOrigin: "0 0",
    transition: reduced ? "none" : `transform ${bladeMs}ms cubic-bezier(.22,0,.12,1)`,
    filter: "drop-shadow(0 0 5px rgba(0,0,0,.55))",
  } as CSSProperties;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 800, height: 800 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#0F0F0E", boxShadow: "0 0 0 1px rgba(15,15,14,.9),0 16px 30px -22px rgba(15,15,14,.45),inset 0 0 0 1px rgba(243,232,204,.16)" }} />
      <div data-ring="" style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", transform: `rotate(${rot}deg)`, transition: T("transform .65s cubic-bezier(.2,.8,.2,1)") }}>
        <div style={RING_TICKS} />
        <div style={RING_MAJOR} />
        {items.map((v, i) => {
          const visible = Math.abs(i * STEP + rot) <= VIS;
          const on = i === sel;
          return (
            <div key={v.id} style={{ position: "absolute", left: 400, top: 400, width: 0, height: 0, transform: `rotate(${IA + i * STEP}deg)` }}>
              <div
                aria-hidden="true"
                className={`lens-mk ${on ? "on" : ""}`}
                style={{ left: 365, width: 40, height: 96, top: -48, fontSize: 11, opacity: visible ? 1 : 0, pointerEvents: "none", color: on ? "#0F0F0E" : "#F3E8CC", transition: T("opacity .3s ease") }}
              >
                <span style={{ padding: "7px 3px", borderRadius: 3 }}>{v.ringMark}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 39, top: 39, width: 722, height: 722, borderRadius: "50%", overflow: "hidden", background: "#0F0F0E", boxShadow: "0 0 0 5px #1c1b19,0 0 0 6px rgba(243,232,204,.2)" }}>
        {interior ? (
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{interior}</div>
        ) : (
          items.map((v, i) => (
            <div key={v.id} data-sc={i} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: i === shown ? 1 : 0, transition: T("opacity 140ms linear") }}>
              <LensScene kind={v.scene} imgs={images} />
            </div>
          ))
        )}
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
      {/* the homepage's cream pointer, turned to 12 o'clock */}
      <div aria-hidden="true" style={{ position: "absolute", left: 400, top: 400, width: 0, height: 0, transform: "rotate(270deg)", pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: 361, top: -1.5, width: 44, height: 3, background: "#F3E8CC" }} />
        <div style={{ position: "absolute", left: 405, top: -9, width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderRight: "14px solid #F3E8CC" }} />
      </div>
    </div>
  );
}
