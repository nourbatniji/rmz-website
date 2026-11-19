/**
 * Card geometry of the featured-work focus, ported from the approved canvas board "HOME - ABOUT SECTION" (desktop wall) and
 * "MOBILE · 03" (single card). The canvas advances in discrete steps; here the SAME formulas are evaluated at a continuous step
 * position `s` (0 … 2n−1) that comes straight from native scroll progress:
 *
 *   state 2j   = project j, front (image)        state 2j+1 = project j, back (description)
 *   step 2j → 2j+1 : the centred card turns in place          step 2j+1 → 2j+2 : the wall moves on to the next card
 */

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // the canvas's per-step ease (cubic in-out)
const lerp3 = (ad: number, a: number, b: number, c: number) => (ad <= 1 ? a + (b - a) * ad : ad <= 2 ? b + (c - b) * (ad - 1) : c);

/** Designed (unscaled) artboards. The stage scales them uniformly to fit; nothing is ever stretched. */
export const DESKTOP_BOX = { w: 1440, h: 900 } as const;
export const MOBILE_BOX = { w: 390, h: 672 } as const;

export type Pose = {
  card: string; // cssText of the positioned card
  flip: string; // transform of the turning wrapper
  backShown: boolean;
  /** desktop only */
  imgH?: number;
  inner?: string;
};

/** Interpolated wall position `af` (fractional project index) and a per-card flip angle at step position `s`. */
function state(s: number, n: number) {
  const last = n * 2 - 1;
  const k = Math.min(last - 1, Math.max(0, Math.floor(s)));
  const tt = ease(clamp(s - k));
  const vals = (sv: number) => {
    const i = Math.floor(sv / 2);
    return { af: i, ang: (j: number) => (j < i ? 180 : j > i ? 0 : sv % 2 ? 180 : 0) };
  };
  const A = vals(k);
  const B = vals(k + 1);
  return { af: A.af + (B.af - A.af) * tt, angOf: (j: number) => A.ang(j) + (B.ang(j) - A.ang(j)) * tt };
}

export function deskPose(j: number, s: number, n: number): Pose {
  const { af, angOf } = state(s, n);
  const d = j - af;
  const ad = Math.abs(d);
  const w = lerp3(ad, 430, 290, 220);
  const ih = lerp3(ad, 470, 340, 270);
  const off = ad <= 1 ? 340 * ad : ad <= 2 ? 340 + 300 * (ad - 1) : 640 + 320 * (ad - 2);
  const left = 720 + (d < 0 ? -off : off) - w / 2;
  const top = 90 + Math.min(1, ad) * 60;
  const tz = -ad * 130;
  const rot = -d * 44;
  const op = ad <= 2 ? 1 : Math.max(0, 1 - (ad - 2) * 2);
  const h = ih + 46;
  const k = w / 430;
  const ang = angOf(j) * clamp(1 - ad);
  return {
    card: `left:${left.toFixed(2)}px;top:${top.toFixed(2)}px;width:${w.toFixed(2)}px;height:${h.toFixed(2)}px;transform:rotateY(${rot.toFixed(3)}deg) translateZ(${tz.toFixed(2)}px);z-index:${Math.round(100 - ad * 10)};opacity:${op.toFixed(3)};visibility:${op < 0.02 ? "hidden" : "visible"};`,
    flip: `rotateY(${(-ang).toFixed(3)}deg)`,
    backShown: ang >= 90,
    imgH: ih,
    inner: `transform:scale(${k.toFixed(5)});height:${(h / k).toFixed(2)}px;`,
  };
}

export function mobPose(j: number, s: number, n: number): Pose {
  const { af, angOf } = state(s, n);
  const d = j - af;
  const ang = angOf(j);
  return {
    card: `transform:translateX(${(d * 110).toFixed(3)}%);visibility:${Math.abs(d) < 1.15 ? "visible" : "hidden"};z-index:${Math.round(100 - Math.abs(d) * 10)};`,
    flip: `rotateY(${(-ang).toFixed(3)}deg)`,
    backShown: ang >= 90,
  };
}
