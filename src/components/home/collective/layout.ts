/** Where each of the twelve marks sits (canvas "Concept A" desktop 1440×900 artboard; "Mobile 08a" 390 px board) and how it gathers in. */
export type Slot = {
  dx: number; dy: number; dw: number; // desktop left / top / width (px in the artboard)
  mx: number; my: number; mw: number; // mobile left / top / width (px in the 390 board)
  sx: number; sy: number; sr: number; d: number; // gather: start offset (px), start rotation (deg), delay (ms)
};
const S = 0.62; // mobile scale of the desktop widths
const row = (dx: number, dy: number, dw: number, mx: number, my: number, sx: number, sy: number, sr: number, d: number): Slot => ({
  dx, dy, dw, mx, my, mw: Math.round(dw * S * 10) / 10, sx, sy, sr, d,
});
export const SLOTS: Slot[] = [
  row(64, 304, 464.1, 24, 36, 216, -222, -3, 0),
  row(610, 262, 245, 24, 136, 58, -71, -8, 420),
  row(64, 450, 193.2, 24, 270, -41, -86, 16, 140),
  row(920, 300, 203.6, 236, 150, -205, 229, 5, 700),
  row(700, 702, 291.9, 176, 284, 291, 20, 16, 560),
  row(360, 560, 234.3, 200, 350, 228, 36, 8, 280),
  row(700, 490, 216.7, 44, 430, 3, 35, -15, 840),
  row(360, 470, 222, 24, 570, 21, 39, 14, 210),
  row(1170, 286, 202.7, 230, 440, 20, 35, -18, 490),
  row(64, 706, 245, 40, 650, -432, -64, -9, 770),
  row(1000, 480, 187.4, 236, 560, 83, 216, 10, 350),
  row(1120, 640, 219.3, 210, 640, 100, 162, 5, 630),
];
