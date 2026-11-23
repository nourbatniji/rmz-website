/**
 * Hero (HeroThreeWorlds) tuning. Change values here only.
 *
 * sequenceScrollDistancePx — how many pixels of page scroll play ONE complete image sequence
 * (first frame → last frame). Scrolling further plays it back (last → first), then forward again:
 * a continuous ping-pong, derived from absolute scroll position (never accumulated wheel events).
 * Smaller = more sensitive (more frame change per pixel scrolled).
 */
export const heroConfig = {
  sequenceScrollDistancePx: 720,
} as const;

/**
 * Normalised sequence progress (0..1) for an absolute scroll position: a triangle wave with one
 * traversal per `distance` pixels. Deterministic: same scrollY → same value, reversal retraces exactly,
 * scrollY ≤ 0 → 0 (first frame).
 */
export function pingPongProgress(scrollY: number, distance = heroConfig.sequenceScrollDistancePx): number {
  const t = Math.max(0, scrollY) / Math.max(1, distance);
  const m = t % 2; // 0..2
  return m <= 1 ? m : 2 - m;
}
