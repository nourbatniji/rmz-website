/**
 * Layout of the Collaborations field. Pure maths, no DOM: the arrangement is calculated from the visible logos' real bounds and the available width,
 * so adding, hiding, resizing or reordering logos never needs a code change.
 *
 * The composition (the approved one for twelve logos): rows of logos ABOVE the square, rows BELOW it, and — from six logos on — one logo on each side of it.
 * Rows are balanced (never one long row and a stray logo), spread out with an even gap that is capped so few logos stay together instead of drifting apart,
 * and wrap onto more rows when the width runs out. The field then simply grows taller; logos are never shrunk to fit, overlapped, hidden or scrolled.
 */
export type Pt = [number, number];

export type Layout = {
  width: number;
  height: number;
  /** Rest centre of every logo, in field pixels (same order as the input). */
  pos: Pt[];
  /** Rest centre of the square. */
  magnet: Pt;
  /** Side of the square in px. */
  mag: number;
  /** Which logos sit above / beside / below the square. */
  groups: { top: number[]; mid: number[]; bottom: number[] };
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Split `idxs` into the fewest balanced rows that each fit in `W` with at least `gap` between logos. */
export function packRows(widths: number[], idxs: number[], W: number, gap: number): number[][] {
  const k = idxs.length;
  if (!k) return [];
  for (let r = 1; r <= k; r++) {
    const rows: number[][] = [];
    const base = Math.floor(k / r);
    const extra = k % r;
    let at = 0;
    for (let q = 0; q < r; q++) {
      const c = base + (q < extra ? 1 : 0);
      rows.push(idxs.slice(at, at + c));
      at += c;
    }
    if (rows.every((row) => row.reduce((a, i) => a + widths[i], 0) + gap * (row.length - 1) <= W)) return rows;
  }
  return idxs.map((i) => [i]);
}

/**
 * Phones, eight logos or more: the approved RING — a few rows above, a few below, one column on each side — leaving a free channel in the middle where the square
 * can travel up and down under a finger without ever covering a logo. Returns null when the artwork is too wide for a clear channel (the row layout is used then).
 */
function ringLayout(widths: number[], heights: number[], W: number): Layout | null {
  const n = widths.length;
  const mag = 52, minGap = 14, maxGap = 40, rowGap = 18, st = 3;
  const order = [...Array(n).keys()];
  const edgeN = Math.ceil(n / 4);
  const top = order.slice(0, edgeN);
  const sides = order.slice(edgeN, n - edgeN);
  const bottom = order.slice(n - edgeN);
  const left = sides.filter((_, k) => k % 2 === 0);
  const right = sides.filter((_, k) => k % 2 === 1);
  const lw = Math.max(0, ...left.map((i) => Math.max(widths[i] / 2 + 2, W * 0.19) + widths[i] / 2));
  const rw = Math.max(0, ...right.map((i) => Math.max(widths[i] / 2 + 2, W * 0.19) + widths[i] / 2));
  if (W - lw - rw < mag + 44) return null;
  const pos: Pt[] = Array(n);
  let y = 0;
  let rowNo = 0;
  const place = (idxs: number[]) => {
    for (const row of packRows(widths, idxs, W, minGap)) {
      const rh = Math.max(...row.map((i) => heights[i])) + 2 * st;
      const cy = y + rh / 2;
      const sum = row.reduce((a, i) => a + widths[i], 0);
      const gap = clamp((W - sum) / row.length, 0, maxGap);
      let x = (W - (sum + gap * row.length)) / 2 + gap / 2;
      row.forEach((i, q) => {
        pos[i] = [x + widths[i] / 2, cy + ((q + rowNo) % 2 ? st : -st)];
        x += widths[i] + gap;
      });
      y += rh + rowGap;
      rowNo++;
    }
  };
  place(top);
  const sideStart = y;
  const R = Math.max(left.length, right.length);
  for (let r = 0; r < R; r++) {
    const l = left[r], rr = right[r];
    const rh = Math.max(l !== undefined ? heights[l] : 0, rr !== undefined ? heights[rr] : 0) + 2 * st;
    const cy = y + rh / 2;
    if (l !== undefined) pos[l] = [Math.max(widths[l] / 2 + 2, W * 0.19), cy + (r % 2 ? st : -st)];
    if (rr !== undefined) pos[rr] = [W - Math.max(widths[rr] / 2 + 2, W * 0.19), cy + (r % 2 ? -st : st)];
    y += rh + rowGap;
  }
  const sideEnd = y - rowGap;
  const band = Math.max(sideEnd - sideStart, mag + 70); // the channel is at least a little taller than the square
  y = sideStart + band + rowGap;
  place(bottom);
  return { width: W, height: Math.round(y - rowGap), pos, magnet: [W / 2, sideStart + band / 2], mag, groups: { top, mid: sides, bottom } };
}

export function computeLayout(widths: number[], heights: number[], W: number, phone: boolean): Layout {
  if (phone && widths.length >= 8) {
    const ring = ringLayout(widths, heights, W);
    if (ring) return ring;
  }
  return rowLayout(widths, heights, W, phone);
}

function rowLayout(widths: number[], heights: number[], W: number, phone: boolean): Layout {
  const n = widths.length;
  const mag = phone ? 52 : 56;
  const half = mag / 2;
  const minGap = phone ? 14 : 36;
  const maxGap = phone ? 40 : 140;
  const rowGap = phone ? 18 : 22;
  const st = phone ? 3 : 5; // gentle vertical stagger so rows feel placed, not ruled
  const side = phone ? 18 : Math.round(clamp(W * 0.07, 70, 110));
  const order = [...Array(n).keys()];

  let midN = n >= 6 ? 2 : 0;
  const split = () => {
    const rest = n - midN;
    const T = Math.ceil(rest / 2);
    return { top: order.slice(0, T), mid: order.slice(T, T + midN), bottom: order.slice(T + midN) };
  };
  let g = split();
  if (midN && g.mid.some((i) => widths[i] > W / 2 - half - side)) {
    midN = 0;
    g = split();
  }

  const pos: Pt[] = Array(n);
  let y = 0;
  let rowNo = 0;
  const place = (idxs: number[]) => {
    for (const row of packRows(widths, idxs, W, minGap)) {
      const rh = Math.max(...row.map((i) => heights[i])) + 2 * st;
      const cy = y + rh / 2;
      const sum = row.reduce((a, i) => a + widths[i], 0);
      const gap = clamp((W - sum) / row.length, 0, maxGap);
      let x = (W - (sum + gap * row.length)) / 2 + gap / 2;
      row.forEach((i, q) => {
        pos[i] = [x + widths[i] / 2, cy + ((q + rowNo) % 2 ? st : -st)];
        x += widths[i] + gap;
      });
      y += rh + rowGap;
      rowNo++;
    }
  };

  place(g.top);
  const band = Math.max(mag + (phone ? 56 : 0), ...g.mid.map((i) => heights[i])); // phones: a free vertical channel for the finger
  const cy = y + band / 2;
  const magnet: Pt = [W / 2, cy];
  if (g.mid[0] !== undefined) pos[g.mid[0]] = [W / 2 - half - side - widths[g.mid[0]] / 2, cy];
  if (g.mid[1] !== undefined) pos[g.mid[1]] = [W / 2 + half + side + widths[g.mid[1]] / 2, cy];
  y += band + rowGap;
  place(g.bottom);
  return { width: W, height: Math.round(y - rowGap), pos, magnet, mag, groups: g };
}
