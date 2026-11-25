import type { WorldConfig } from "./world-config";

/**
 * Pure camera model of the shared-world image system. Everything is a function of (from, to, p): no timers, no state, so the same scroll position always gives
 * the same picture and reversing the scroll retraces the same path.
 *
 *  from → to, p 0 → 1 : the dedicated image of `from` hands back to the overview while the camera pulls out a little, moves toward the next target (the zoom
 *  dips most when the two targets are far apart), then the dedicated image of `to` takes over as the camera arrives. The overview is never a stop of its own.
 *  from = -1 : the opening overview (no service selected yet). from === to : at rest on that service.
 */
export type Pose = {
  /** Camera centre on the overview image, normalised. */
  cx: number;
  cy: number;
  /** Zoom relative to the cover-fitted overview (1 = whole overview). */
  z: number;
  /** Aperture 0–1 (the lens's `op`). */
  op: number;
  /** Opacity of each service's dedicated image. */
  blend: number[];
  /** True while nothing is selected yet (the opening overview). */
  idle: boolean;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (x: number) => x * x * (3 - 2 * x);
const step = (a: number, b: number, x: number) => smooth(clamp((x - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Aperture of a service at rest (the existing lens' resting openings). */
export type RestAperture = (i: number) => number;

const DIP_OP = 0.16; // how far the aperture closes in the middle of a movement
const OUT_AT = [0.04, 0.34] as const; // the outgoing dedicated image fades out over this span of p
const IN_AT = [0.62, 0.94] as const; // the incoming one fades in over this span (arrival at p = 1)

export function poseAt(cfg: WorldConfig, rest: RestAperture, from: number, to: number, p: number): Pose {
  const n = cfg.services.length;
  const blend = new Array<number>(n).fill(0);
  const node = (i: number) => (i < 0 ? { x: 0.5, y: 0.5, z: 1, op: cfg.openAperture } : { x: cfg.services[i].target.x, y: cfg.services[i].target.y, z: cfg.services[i].zoom, op: rest(i) });
  const A = node(from);
  const B = node(to);
  if (from === to) {
    blend[to] = 1;
    return { cx: B.x, cy: B.y, z: B.z, op: B.op, blend, idle: false };
  }
  const e = smooth(clamp(p));
  const dist = Math.hypot(A.x - B.x, A.y - B.y);
  const dip = from < 0 ? 0 : clamp(0.3 + 0.9 * dist, 0.3, 0.9); // ln-zoom pulled out in the middle: more when the targets are far apart
  const base = lerp(Math.log(A.z), Math.log(B.z), e);
  const lz = base - Math.min(dip, base) * Math.sin(Math.PI * clamp(p));
  if (from >= 0) blend[from] = 1 - step(OUT_AT[0], OUT_AT[1], p);
  blend[to] = step(IN_AT[0], IN_AT[1], p);
  return {
    cx: lerp(A.x, B.x, e),
    cy: lerp(A.y, B.y, e),
    z: Math.exp(lz),
    op: clamp(lerp(A.op, B.op, e) - DIP_OP * Math.sin(Math.PI * clamp(p)), 0.3, 1),
    blend,
    idle: from < 0 && p <= 0,
  };
}

/** The opening overview. */
export const overviewPose = (cfg: WorldConfig): Pose => poseAt(cfg, () => 0.8, -1, -1 as number, 0);

/**
 * Pose from a continuous service position `kf` (0 … N−1), used where there is no label timeline (mobile selector, interactive variant): integer kf is at rest,
 * and each step between services plays the same segment, with a short rest at both ends so a service holds steady while the selector settles.
 */
export function poseFromKf(cfg: WorldConfig, rest: RestAperture, kf: number): Pose {
  const n = cfg.services.length;
  const k = clamp(kf, 0, n - 1);
  const i = Math.min(n - 2, Math.floor(k));
  if (n < 2) return poseAt(cfg, rest, 0, 0, 1);
  const f = k - i;
  const REST_FRAC = 0.16;
  if (f <= REST_FRAC) return poseAt(cfg, rest, i, i, 1);
  if (f >= 1 - REST_FRAC) return poseAt(cfg, rest, i + 1, i + 1, 1);
  return poseAt(cfg, rest, i, i + 1, (f - REST_FRAC) / (1 - 2 * REST_FRAC));
}
