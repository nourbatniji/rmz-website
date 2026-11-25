import { M_BAR, M_LEGS, R_SHAPE, SQUARES, Z_BOTTOM, Z_DIAGONAL, Z_TOP } from "@/components/brand/logo-animation/logo-artwork";

/** One glyph of the RMZ logo (r · m · z, or the logo's square for the last panel), drawn from the logo artwork itself. Colour comes from CSS (`fill: currentColor`). */
const BOX: Record<"r" | "m" | "z", string> = { r: "184 464 167 167", m: "371 464 167 167", z: "558 464 167 167" };

export function LogoGhost({ glyph }: { glyph: "r" | "m" | "z" | "dot" }) {
  if (glyph === "dot") {
    return (
      <svg viewBox="0 0 42 42" fill="currentColor" aria-hidden="true" focusable="false">
        <rect width="42" height="42" />
      </svg>
    );
  }
  return (
    <svg viewBox={BOX[glyph]} fill="currentColor" aria-hidden="true" focusable="false">
      {glyph === "r" && <path d={R_SHAPE} />}
      {glyph === "m" && (
        <>
          {Object.values(SQUARES).map((q, i) => <path key={i} d={q.d} />)}
          <path d={M_BAR} />
          {M_LEGS.map((d, i) => <path key={i} d={d} />)}
        </>
      )}
      {glyph === "z" && (
        <>
          <path d={Z_TOP} />
          <path d={Z_DIAGONAL} />
          <path d={Z_BOTTOM} />
        </>
      )}
    </svg>
  );
}
