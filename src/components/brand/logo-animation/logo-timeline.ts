import gsap from "gsap";
import { cubicBezier } from "./ease";

/**
 * RMZ logo choreography, measured from the motion reference (rmz_3.mp4: 25 fps, 6.04 s) and applied to the supplied PDF artwork.
 * Start/duration/easing of every property were fitted to per-frame measurements of the reference (square areas and edges, outline
 * progress along the letter silhouettes, fill-wipe coverage per piece, wordmark and ® offsets); easings are cubic-bezier fits
 * unless a plain GSAP ease fitted as well. Times are in seconds from the start of the sequence.
 *
 * The animation is a single paused GSAP timeline: drive it with play()/restart()/time(). It knows nothing about page loading.
 */

export const LOGO_DURATION = 6.04;
/**
 * The time at which every part has settled: the complete lockup is at rest from here (the last movement, the ® travel, ends at 3.895 s).
 * Everything after it in the reference is a pure hold, so a consumer that has to wait (e.g. the page loader) pauses here instead of replaying.
 */
export const LOGO_RESOLVED_AT = 3.9;

export type Phase = { id: string; label: string; at: number };
/** Phase markers (start times) for the scrubber. */
export const PHASES: readonly Phase[] = [
  { id: "orange", label: "Orange square", at: 0.14 },
  { id: "squares", label: "Squares spread", at: 0.72 },
  { id: "outlines", label: "Outlines draw", at: 0.72 },
  { id: "fills", label: "Fills wipe in", at: 1.44 },
  { id: "lockup", label: "Wordmark + ®", at: 2.4 },
  { id: "hold", label: "Hold", at: LOGO_RESOLVED_AT },
];

/** Logo units (PDF 1080 space). */
const SQUARE_PITCH = 62.44; // orange x 433.42 -> yellow x 370.98 (yellow) / green x 495.87 (green)
const LOCKUP_OFFSET = 86.3; // the lockup starts with the orange square centred on the canvas (454.3 -> 540.6)
const WORDMARK_START = -200; // fully hidden behind the Z (needs <= -186)
const REG_START = { x: 38, y: 45 }; // ® starts hidden behind the r's corner

const bez = cubicBezier;

type Ease = string | ((p: number) => number);

export function buildLogoTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const part = (name: string): SVGElement => {
    const el = svg.querySelector<SVGElement>(`[data-part="${name}"]`);
    if (!el) throw new Error(`logo-timeline: missing [data-part="${name}"]`);
    return el;
  };

  const parts = (name: string): SVGElement[] => Array.from(svg.querySelectorAll<SVGElement>(`[data-part="${name}"]`));

  // Fractional stroke-dashoffset (0..1) is animated through `attr`, which GSAP does not round.
  const tl = gsap.timeline({ paused: true });
  const clamp01 = (ease: (p: number) => number) => (p: number) => Math.min(1, Math.max(0, ease(p)));
  const e = (x: Ease): Ease => (typeof x === "string" ? x : clamp01(x));

  /** stroke-dash "draw": 0 -> 1 along the path (pathLength is normalised to 1 in the markup). */
  const draw = (el: SVGElement, at: number, dur: number, ease: Ease) => {
    tl.fromTo(
      el,
      { attr: { "stroke-dasharray": "1 1", "stroke-dashoffset": 1 } },
      { attr: { "stroke-dashoffset": 0 }, duration: dur, ease: e(ease) },
      at,
    );
  };
  const grow = (el: SVGElement | SVGElement[], to: number, at: number, dur: number, ease: Ease) => {
    tl.fromTo(el, { attr: { height: 0 } }, { attr: { height: to }, duration: dur, ease: e(ease) }, at);
  };
  const reveal = (el: SVGElement | SVGElement[], at: number) => {
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, ease: "none" }, at);
  };

  // ── 1. lockup re-centring: starts offset right (orange square on the canvas centre), glides to the true layout ──
  tl.fromTo(part("lockup"), { x: LOCKUP_OFFSET }, { x: 0, duration: 1.058, ease: e(bez(0.36, 0, 0, 0.97)) }, 2.388);

  // ── 2. orange square grows from a point at its own centre ──
  tl.fromTo(
    part("orange"),
    { scale: 0.001, transformOrigin: "50% 50%" },
    { scale: 1, duration: 0.539, ease: e(bez(0.25, 0.91, 0.69, 0.82)) },
    0.142,
  );

  // ── 3. yellow and green slide out from behind the orange square, one pitch each ──
  reveal([part("yellow"), part("green")], 0.7);
  tl.fromTo(part("yellow"), { x: SQUARE_PITCH }, { x: 0, duration: 0.809, ease: e(bez(0.27, 0.26, 0.02, 0.89)) }, 0.722);
  tl.fromTo(part("green"), { x: -SQUARE_PITCH }, { x: 0, duration: 0.809, ease: e(bez(0.27, 0.26, 0.02, 0.89)) }, 0.722);

  // ── 4. hairline outlines draw on, each starting where the reference starts it (r: top-right end going left; m: top-left going down; Z: top-left going right) ──
  draw(part("outline-r"), 0.895, 0.778, "power1.in");
  draw(part("outline-m"), 1.069, 0.997, "power1.in");
  draw(part("outline-z"), 1.21, 1.008, bez(0.24, 0.07, 0.15, 0.04));
  // outlines are scaffolding: they leave once the fills have covered them, so the final frame is exactly the artwork
  tl.fromTo(part("outlines"), { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "none" }, 2.75);

  // ── 5. fills ──
  // r: wipe along its centre-line, right end -> round the corner -> bottom of the stem
  draw(part("wipe-r"), 1.432, 1.212, bez(0.27, 0.16, 0.01, 0.92));
  // m: top bar thickens down from its top edge, then the three legs wipe downward
  grow(parts("wipe-bar"), 44, 1.9, 0.224, "power1.in"); // mask edge sits 1.5 units above the bar so it never coincides with the artwork edge
  grow(part("wipe-legs"), 68, 2.127, 0.487, bez(0.14, 0.26, 0.27, 0.7));
  // Z: top bar right -> left, diagonal top-right -> bottom-left (45° leading edge), bottom bar left -> right
  draw(part("wipe-zt"), 1.984, 0.692, bez(0.27, 0, 0.39, 0.85));
  draw(part("wipe-zd"), 2.078, 0.883, bez(0.31, 0.37, 0.3, 1));
  draw(part("wipe-zb"), 2.103, 0.861, "power2.out");

  // ── 6. ® glides out from behind the r's corner (diagonal up-left, long ease-out) ──
  reveal(part("reg"), 2.412);
  tl.fromTo(part("reg"), { x: REG_START.x, y: REG_START.y }, { x: 0, y: 0, duration: 1.483, ease: e(bez(0.37, 0, 0.03, 0.89)) }, 2.412);

  // ── 7. wordmark slides out from behind the Z's right edge ──
  tl.fromTo(part("wordmark"), { x: WORDMARK_START }, { x: 0, duration: 1.004, ease: e(bez(0.12, 0.68, 0.27, 1)) }, 2.558);

  // hold to the reference's length
  tl.to({}, { duration: 0 }, LOGO_DURATION);

  return tl;
}
