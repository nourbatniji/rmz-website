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

export function buildPhases(n: number) {
  const ph: Phase[] = [];
  let t = 0;
  ph.push({ kind: "hold", i: 0, a: t, b: t + HOLD });
  t += HOLD;
  for (let k = 0; k < n - 1; k++) {
    ph.push({ kind: "return", i: k, a: t, b: t + RISE }); t += RISE;
    ph.push({ kind: "travel", i: k, a: t, b: t + TRAVEL }); t += TRAVEL;
    ph.push({ kind: "rise", i: k + 1, a: t, b: t + RISE }); t += RISE;
    ph.push({ kind: "hold", i: k + 1, a: t, b: t + HOLD }); t += HOLD;
  }
  return { ph, total: t };
}

export function timelineAt(q: number, n: number) {
  const { ph, total } = buildPhases(n);
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
export function holdCenter(j: number, n: number) {
  const { ph } = buildPhases(n);
  const h = ph.find((p) => p.kind === "hold" && p.i === j)!;
  return (h.a + h.b) / 2;
}
