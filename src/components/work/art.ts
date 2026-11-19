import type { WorkProject } from "@/content/work-types";

/** Deterministic placeholder art (the canvas's gradient generator). `v` picks one of five compositions. */
export function artBackground(palette: WorkProject["palette"], seed: number, v: number): string {
  const [a, b, c, d] = palette;
  const t = (seed + v) % 5;
  if (t === 0) return `radial-gradient(circle at 50% 64%,${c} 0 15%,transparent 15.4%),linear-gradient(180deg,${a} 0 62%,${b} 62% 100%)`;
  if (t === 1) return `radial-gradient(ellipse 46% 70% at 50% 100%,${c} 0 98%,transparent 100%),linear-gradient(160deg,${a},${b})`;
  if (t === 2) return `radial-gradient(circle at 70% 30%,${c} 0 12%,transparent 12.4%),linear-gradient(115deg,${a} 0 46%,${b} 46% 100%)`;
  if (t === 3) return `radial-gradient(circle at 28% 40%,${c} 0 22%,transparent 22.4%),radial-gradient(circle at 74% 66%,${d} 0 16%,transparent 16.4%),linear-gradient(135deg,${a},${b})`;
  return `linear-gradient(180deg,transparent 0 55%,${d} 55% 100%),radial-gradient(ellipse 60% 40% at 50% 55%,${c} 0 60%,transparent 61%),linear-gradient(0deg,${b},${a})`;
}

/** Perceived luminance 0–1 of a #rrggbb colour (for readable swatch text). */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
