/**
 * One scroll timeline for the scroll-linked orbit (variant A), in abstract units (scaled to the scene's scroll travel by the caller):
 *
 *   hold(0) → [ return(k) → travel(k → k+1) → rise(k+1) → hold(k+1) ] × (N−1)
 *
 * `return` / `rise`: the label leaves / rejoins the ring (lift 1 → 0 / 0 → 1). `travel`: the orbit turns one step with the lens/description following
 * (the orbit is exactly stationary during every other phase, so the held service stays aligned at 12 o'clock). The last hold runs to the end of the travel.
 * Everything is a pure function of the position q, so every intermediate pose is reversible.
 */
export const HOLD = 0.6;
export const RISE = 0.36; // also the return duration
export const TRAVEL = 0.62;

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const cl = (x: number) => Math.min(1, Math.max(0, x));

export type Phase = { kind: "hold" | "return" | "travel" | "rise"; i: number; a: number; b: number }; // i = service (travel: the outgoing one)

/**
 * `intro`: the timeline starts with service 0's rise (nothing selected yet) instead of its hold: the lens opens on the shared-world overview.
 * `hold` / `lastHold`: length of each service's steady hold, and of the last one before the section is released (default: HOLD).
 */
export type TimelineOpts = { intro?: boolean; hold?: number; lastHold?: number };
/** The homepage Services lens (shared-world imagery): an entrance from the overview and longer holds; the scroll travel is lengthened in CSS (`.orb-track[data-world]`). */
export const WORLD_TL: TimelineOpts = { intro: true, hold: 0.8, lastHold: 1.2 };

export function buildPhases(n: number, o: TimelineOpts = {}) {
  const H = o.hold ?? HOLD;
  const ph: Phase[] = [];
  let t = 0;
  if (o.intro) { ph.push({ kind: "rise", i: 0, a: t, b: t + RISE }); t += RISE; }
  const h0 = n === 1 ? (o.lastHold ?? H) : H;
  ph.push({ kind: "hold", i: 0, a: t, b: t + h0 });
  t += h0;
  for (let k = 0; k < n - 1; k++) {
    ph.push({ kind: "return", i: k, a: t, b: t + RISE }); t += RISE;
    ph.push({ kind: "travel", i: k, a: t, b: t + TRAVEL }); t += TRAVEL;
    ph.push({ kind: "rise", i: k + 1, a: t, b: t + RISE }); t += RISE;
    const hk = k === n - 2 ? (o.lastHold ?? H) : H;
    ph.push({ kind: "hold", i: k + 1, a: t, b: t + hk }); t += hk;
  }
  return { ph, total: t };
}

export function timelineAt(q: number, n: number, o: TimelineOpts = {}) {
  const { ph, total } = buildPhases(n, o);
  const x = Math.min(total, Math.max(0, q));
  const lift = new Array<number>(n).fill(0);
  let kf = 0;
  const cur = ph.find((p) => x >= p.a && x <= p.b) ?? ph[ph.length - 1];
  const u = cur.b > cur.a ? cl((x - cur.a) / (cur.b - cur.a)) : 1;
  if (cur.kind === "hold") { lift[cur.i] = 1; kf = cur.i; }
  else if (cur.kind === "return") { lift[cur.i] = 1 - ease(u); kf = cur.i; }
  else if (cur.kind === "rise") { lift[cur.i] = ease(u); kf = cur.i; }
  else { kf = cur.i + ease(u); }
  return { kf, lift, total };
}

/** Timeline position at the middle of service j's hold. */
export function holdCenter(j: number, n: number, o: TimelineOpts = {}) {
  const { ph } = buildPhases(n, o);
  const h = ph.find((p) => p.kind === "hold" && p.i === j)!;
  return (h.a + h.b) / 2;
}

/**
 * Where the lens "camera" is on the SAME timeline (prototype image system). Each service-to-service change spans return + travel + rise as ONE
 * continuous segment (p 0 → 1); the intro (rise of service 0) is a segment from the overview (from = -1). Holds are at rest on one service.
 */
export type CameraSeg = { from: number; to: number; p: number };
export function cameraAt(q: number, n: number, o: TimelineOpts = WORLD_TL): CameraSeg {
  const { ph, total } = buildPhases(n, o);
  const intro = !!o.intro;
  const x = Math.min(total, Math.max(0, q));
  const cur = ph.find((p) => x >= p.a && x <= p.b) ?? ph[ph.length - 1];
  if (cur.kind === "hold") return { from: cur.i, to: cur.i, p: 1 };
  if (cur.kind === "rise" && intro && cur.i === 0 && cur.a === 0) return { from: -1, to: 0, p: cl((x - cur.a) / (cur.b - cur.a)) };
  // transition k → k+1 : from the start of return(k) to the end of rise(k+1)
  const k = cur.kind === "rise" ? cur.i - 1 : cur.i;
  const a = ph.find((p) => p.kind === "return" && p.i === k)!.a;
  const b = ph.find((p) => p.kind === "rise" && p.i === k + 1)!.b;
  return { from: k, to: k + 1, p: cl((x - a) / (b - a)) };
}
