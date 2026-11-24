import { forwardRef, memo, useId } from "react";
import {
  ARTWORK_SIZE,
  CREAM,
  GREEN,
  INK,
  M_BAR,
  M_LEGS,
  ORANGE,
  REG_R,
  REG_RING,
  R_SHAPE,
  SQUARES,
  WORDMARK,
  YELLOW,
  Z_BOTTOM,
  Z_DIAGONAL,
  Z_TOP,
} from "./logo-artwork";

/**
 * The logo as a static, animation-ready SVG. The artwork paths are the PDF's own (see logo-artwork.ts); this component only
 * arranges them in layers and adds the helper geometry the motion needs:
 *   - hairline outlines (silhouettes of r / m / Z, built from the PDF's own coordinates) that draw on before the fills,
 *   - wipe masks (centre-lines / rectangles over each piece) that reveal each fill,
 *   - a clip at the Z's right edge that the wordmark slides out from behind.
 * Nothing here is animated; buildLogoTimeline() finds parts through [data-part].
 */

/** The r outline is the PDF path itself, minus the dangling zero-length "M" the export leaves after "Z". */
const R_OUTLINE = R_SHAPE.replace(/\s+M\s+[\d.]+\s+[\d.]+\s*$/, "");

/** m silhouette, starting top-left going down (counter-clockwise), top edge left out: the bar's own wipe draws that edge. Coordinates are the PDF's leg/bar edges. */
const M_OUTLINE =
  "M 370.94 526.73 L 370.94 630.83 L 412.78 630.83 L 412.78 568.58 L 433.42 568.58 L 433.42 630.83 L 475.23 630.83 L 475.23 568.58 L 495.87 568.58 L 495.87 630.83 L 537.72 630.83 L 537.72 526.73";

/** Z silhouette (union of top bar, diagonal and bottom bar), starting top-left going clockwise. Vertices are the PDF's bar edges and the diagonal's edges intersected with them. */
const Z_OUTLINE =
  "M 558.24 464.06 L 725.1 464.06 L 725.1 505.87 L 712.77 505.87 L 629.69 588.95 L 725.1 588.95 L 725.1 630.76 L 558.24 630.76 L 558.24 588.95 L 570.56 588.95 L 653.65 505.87 L 558.24 505.87 Z";

/** Wipe centre-lines. Stroke width 44 > the 41.8 piece thickness, butt caps: the leading edge is perpendicular to the path (as in the reference). */
const WIPE = {
  r: "M 352.5 485.215 L 289.41 485.215 A 84.245 84.245 0 0 0 205.165 569.46 L 205.165 632.3",
  zTop: "M 727 484.965 L 556 484.965",
  zBottom: "M 556 609.855 L 727 609.855",
  zDiagonal: "M 702.76 486.32 L 580.57 608.5",
} as const;

const HAIRLINE = { fill: "none", stroke: CREAM, strokeOpacity: 0.5, strokeWidth: 1.2, pathLength: 1 } as const;

export const LogoStage = memo(
  forwardRef<SVGSVGElement, { className?: string }>(function LogoStage({ className }, ref) {
    const uid = useId().replace(/:/g, "");
    const id = (name: string) => `${uid}-${name}`;
    const url = (name: string) => `url(#${id(name)})`;
    const wipeStroke = { fill: "none", stroke: "#fff", strokeWidth: 44, pathLength: 1 } as const;

    return (
      <svg
        ref={ref}
        className={className}
        viewBox={`0 0 ${ARTWORK_SIZE} ${ARTWORK_SIZE}`}
        role="img"
        aria-label="Rebel Mind Zone logo"
        style={{ visibility: "hidden" }}
      >
        <defs>
          <mask id={id("r")} maskUnits="userSpaceOnUse" x="-200" y="-200" width="1500" height="1500">
            <path data-part="wipe-r" d={WIPE.r} {...wipeStroke} />
          </mask>
          <mask id={id("bar")} maskUnits="userSpaceOnUse" x="-200" y="-200" width="1500" height="1500">
            <rect data-part="wipe-bar" x="350" y="525.27" width="210" height="0" fill="#fff" />
          </mask>
          <mask id={id("legs")} maskUnits="userSpaceOnUse" x="-200" y="-200" width="1500" height="1500">
            {/* the legs' upper part (under the bar) reveals together with the bar, so the overlap the PDF paints is reproduced exactly */}
            <rect data-part="wipe-bar" x="350" y="525.27" width="210" height="0" fill="#fff" />
            <rect data-part="wipe-legs" x="350" y="565" width="210" height="0" fill="#fff" />
          </mask>
          <mask id={id("zt")} maskUnits="userSpaceOnUse" x="-200" y="-200" width="1500" height="1500">
            <path data-part="wipe-zt" d={WIPE.zTop} {...wipeStroke} />
          </mask>
          <mask id={id("zd")} maskUnits="userSpaceOnUse" x="-200" y="-200" width="1500" height="1500">
            <path data-part="wipe-zd" d={WIPE.zDiagonal} {...wipeStroke} />
          </mask>
          <mask id={id("zb")} maskUnits="userSpaceOnUse" x="-200" y="-200" width="1500" height="1500">
            <path data-part="wipe-zb" d={WIPE.zBottom} {...wipeStroke} />
          </mask>
          {/* the wordmark is visible only to the right of the Z's right edge (x = 725.1) */}
          <clipPath id={id("wordmark")}>
            <rect x="725.1" y="0" width="400" height={ARTWORK_SIZE} />
          </clipPath>
        </defs>

        <rect width={ARTWORK_SIZE} height={ARTWORK_SIZE} fill={INK} />

        {/* everything that belongs to the lockup moves together when the lockup re-centres */}
        <g data-part="lockup">
          {/* ® sits behind the r and glides out from under its corner */}
          <g data-part="reg" fill={CREAM}>
            <path d={REG_R} />
            {REG_RING.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          <g clipPath={url("wordmark")}>
            <g data-part="wordmark" fill={CREAM}>
              {WORDMARK.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </g>

          {/* hairline outlines, under the fills */}
          <g data-part="outlines">
            <path data-part="outline-r" d={R_OUTLINE} {...HAIRLINE} />
            <path data-part="outline-m" d={M_OUTLINE} {...HAIRLINE} />
            <path data-part="outline-z" d={Z_OUTLINE} {...HAIRLINE} />
          </g>

          {/* fills (the PDF's own paths), each revealed through its wipe mask */}
          <path data-part="fill-r" d={R_SHAPE} fill={CREAM} mask={url("r")} />
          <g fill={CREAM}>
            {M_LEGS.map((d, i) => (
              <path key={i} d={d} mask={url("legs")} />
            ))}
          </g>
          <path data-part="fill-bar" d={M_BAR} fill={CREAM} mask={url("bar")} />
          <path data-part="fill-zb" d={Z_BOTTOM} fill={CREAM} mask={url("zb")} />
          <path data-part="fill-zd" d={Z_DIAGONAL} fill={CREAM} mask={url("zd")} />
          <path data-part="fill-zt" d={Z_TOP} fill={CREAM} mask={url("zt")} />

          {/* squares: yellow and green start hidden behind the orange one */}
          <path data-part="yellow" d={SQUARES.yellow.d} fill={YELLOW} />
          <path data-part="green" d={SQUARES.green.d} fill={GREEN} />
          <path data-part="orange" d={SQUARES.orange.d} fill={ORANGE} />
        </g>
      </svg>
    );
  }),
);
