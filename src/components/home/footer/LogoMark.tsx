import { M_BAR, M_LEGS, R_SHAPE, SQUARES, Z_BOTTOM, Z_DIAGONAL, Z_TOP } from "@/components/brand/logo-animation/logo-artwork";

/** The full RMZ logo (r · m · z with its three coloured squares), drawn from the logo artwork. Letters take the surrounding text colour. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="184 463 541 169" role="img" aria-label="RMZ" focusable="false">
      <g fill="currentColor">
        <path d={R_SHAPE} />
        <path d={M_BAR} />
        {M_LEGS.map((d, i) => <path key={i} d={d} />)}
        <path d={Z_TOP} />
        <path d={Z_DIAGONAL} />
        <path d={Z_BOTTOM} />
      </g>
      {Object.values(SQUARES).map((q, i) => <path key={i} d={q.d} fill={q.fill} />)}
    </svg>
  );
}
