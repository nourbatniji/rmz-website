import type { ReactNode } from "react";
import type { ArtKind, Media, Palette, Project } from "@/content/work-v3/types";

/**
 * PROTOTYPE ARTWORK. Every plate is generated from the project palette so the layouts and interactions can be judged
 * with realistic crops and colour. A `src` / `video` on the media item replaces the plate with the real asset.
 */

type C = [string, string, string, string]; // ground, deep, signal, ink (after the variant re-cast)
const ROLES = [[0, 1, 2, 3], [1, 0, 2, 3], [2, 3, 0, 1], [3, 2, 0, 1], [1, 2, 0, 3], [0, 3, 2, 1]];
const cast = (p: Palette, v = 0): C => ROLES[v % ROLES.length].map((i) => p[i]) as C;

type Glyph = Project["glyph"];
type A = { W: number; H: number; c: C; glyph: Glyph; name: string; ink: string };
/** A big glyph that touches a plate edge must not be page-ink colour, or the plate dissolves into the page. */
const solid = (a: string, b: string, ink: string) => (a.toLowerCase() !== ink.toLowerCase() ? a : b);

function Mark({ glyph, x, y, s, fill, dot }: { glyph: Glyph; x: number; y: number; s: number; fill: string; dot: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 100})`}>
      {glyph === "alpha" ? (
        <>
          <path d="M0 100 L40 0 H60 L100 100 H72 L50 38 L28 100Z" fill={fill} />
          <circle cx="50" cy="80" r="9" fill={dot} />
        </>
      ) : (
        <>
          <path d="M0 0H30V100H0Z" fill={fill} />
          <path d="M30 0H52A25 25 0 0 1 52 50H30Z" fill={fill} />
          <path d="M30 50H58A25 25 0 0 1 58 100H30Z" fill={dot} />
        </>
      )}
    </g>
  );
}

function T({ x, y, size, fill, children, w = 900, anchor = "start", ls = -0.03, op = 1 }: { x: number; y: number; size: number; fill: string; children: ReactNode; w?: number; anchor?: "start" | "middle" | "end"; ls?: number; op?: number }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={w} fill={fill} textAnchor={anchor} letterSpacing={`${ls}em`} opacity={op} style={{ textTransform: "uppercase", fontFamily: "var(--font-figtree), system-ui, sans-serif" }}>
      {children}
    </text>
  );
}

const arts: Record<ArtKind, (a: A) => ReactNode> = {
  /* The hero plate: designed so a window on the right shows the orange disc, and the full frame opens onto the system. */
  hero: ({ W, H, c: [g, d, s, k], glyph, name }) => {
    const portrait = W / H < 1;
    const u = Math.min(H, W * 0.625); // size unit that stays sensible in both landscape and portrait
    return (
      <>
        <rect width={W} height={H} fill={g} />
        <rect width={W} height={H * (portrait ? 0.1 : 0.14)} fill={d} />
        <circle cx={W * 0.71} cy={H * 0.47} r={portrait ? W * 0.34 : W * 0.21} fill={s} />
        <Mark glyph={glyph} x={W * (portrait ? 0.08 : 0.07)} y={H * (portrait ? 0.14 : 0.2)} s={portrait ? W * 0.62 : H * 0.36} fill={d} dot={s} />
        <rect x={W * (portrait ? 0.5 : 0.74)} y={H * (portrait ? 0.78 : 0.76)} width={W * (portrait ? 0.5 : 0.26)} height={H * (portrait ? 0.22 : 0.24)} fill={d} />
        <rect x={W * (portrait ? 0.56 : 0.77)} y={H * (portrait ? 0.83 : 0.81)} width={W * (portrait ? 0.28 : 0.14)} height={u * 0.012} fill={g} />
        <rect x={W * (portrait ? 0.56 : 0.77)} y={H * (portrait ? 0.85 : 0.85)} width={W * (portrait ? 0.18 : 0.09)} height={u * 0.012} fill={g} opacity={0.6} />
        <circle cx={W * 0.93} cy={H * (portrait ? 0.93 : 0.89)} r={u * 0.03} fill={s} />
        <T x={W * 0.07} y={H * (portrait ? 0.72 : 0.62)} size={u * 0.035} fill={k} ls={0.14} w={700}>{name} — identity system</T>
        <T x={W * (portrait ? 0.56 : 0.77)} y={H * (portrait ? 0.96 : 0.955)} size={u * 0.026} fill={g} ls={0.14} w={700} op={0.8}>prototype artwork</T>
      </>
    );
  },
  mark: ({ W, H, c: [g, d, s, k], glyph, name }) => {
    const m = Math.min(W, H);
    return (
      <>
        <rect width={W} height={H} fill={g} />
        <Mark glyph={glyph} x={W / 2 - m * 0.29} y={H / 2 - m * 0.29} s={m * 0.58} fill={k} dot={s} />
        <T x={W * 0.07} y={H - m * 0.07} size={m * 0.034} fill={k} ls={0.14} w={700}>{name} — mark</T>
        <rect x={W * 0.07} y={m * 0.07} width={m * 0.12} height={m * 0.012} fill={d} />
      </>
    );
  },
  poster: ({ W, H, c: [g, d, s, k], glyph, name, ink }) => {
    const m = Math.min(W, H);
    return (
      <>
        <rect width={W} height={H} fill={s} />
        <Mark glyph={glyph} x={W * 0.2} y={H * 0.16} s={m * 1.5} fill={solid(k, d, ink)} dot={g} />
        <T x={W * 0.07} y={m * 0.2} size={m * 0.19} fill={g}>{name}</T>
        <rect x={W * 0.07} y={H - m * 0.15} width={m * 0.22} height={m * 0.013} fill={k} />
        <rect x={W * 0.07} y={H - m * 0.115} width={m * 0.14} height={m * 0.013} fill={k} opacity={0.6} />
        <circle cx={W * 0.88} cy={H - m * 0.12} r={m * 0.035} fill={d} />
      </>
    );
  },
  pack: ({ W, H, c: [g, d, s, k], glyph, name }) => {
    const m = Math.min(W, H);
    const bw = m * 0.56, bh = m * 0.62, x = W / 2 - bw / 2 - m * 0.07, y = H / 2 - bh / 2 + m * 0.06, dx = m * 0.14, dy = m * 0.1;
    return (
      <>
        <rect width={W} height={H} fill={d} />
        <ellipse cx={W / 2} cy={y + bh + m * 0.02} rx={bw * 0.78} ry={m * 0.03} fill={k} opacity={0.35} />
        <rect x={x} y={y} width={bw} height={bh} fill={g} />
        <polygon points={`${x},${y} ${x + bw},${y} ${x + bw + dx},${y - dy} ${x + dx},${y - dy}`} fill={g} />
        <polygon points={`${x},${y} ${x + bw},${y} ${x + bw + dx},${y - dy} ${x + dx},${y - dy}`} fill={s} opacity={0.35} />
        <polygon points={`${x + bw},${y} ${x + bw + dx},${y - dy} ${x + bw + dx},${y + bh - dy} ${x + bw},${y + bh}`} fill={k} opacity={0.28} />
        <polygon points={`${x + bw},${y} ${x + bw + dx},${y - dy} ${x + bw + dx},${y + bh - dy} ${x + bw},${y + bh}`} fill={g} />
        <polygon points={`${x + bw},${y} ${x + bw + dx},${y - dy} ${x + bw + dx},${y + bh - dy} ${x + bw},${y + bh}`} fill={k} opacity={0.22} />
        <Mark glyph={glyph} x={x + bw * 0.28} y={y + bh * 0.14} s={bw * 0.44} fill={k} dot={s} />
        <T x={x + bw * 0.08} y={y + bh * 0.84} size={bw * 0.12} fill={k}>{name}</T>
        <rect x={x + bw * 0.08} y={y + bh * 0.9} width={bw * 0.3} height={bh * 0.012} fill={s} />
      </>
    );
  },
  tote: ({ W, H, c: [g, d, s, k], glyph }) => {
    const m = Math.min(W, H);
    const bw = m * 0.56, bh = m * 0.62, x = W / 2 - bw / 2, y = H / 2 - bh / 2 + m * 0.1;
    return (
      <>
        <rect width={W} height={H} fill={g} />
        <path d={`M${x + bw * 0.26} ${y} C ${x + bw * 0.26} ${y - bh * 0.5}, ${x + bw * 0.74} ${y - bh * 0.5}, ${x + bw * 0.74} ${y}`} fill="none" stroke={k} strokeWidth={m * 0.03} />
        <rect x={x} y={y} width={bw} height={bh} fill={s} />
        <rect x={x} y={y} width={bw} height={bh * 0.04} fill={k} opacity={0.22} />
        <Mark glyph={glyph} x={x + bw * 0.27} y={y + bh * 0.2} s={bw * 0.46} fill={g} dot={k} />
        <rect x={x + bw * 0.2} y={y + bh * 0.84} width={bw * 0.6} height={bh * 0.012} fill={g} opacity={0.7} />
        <ellipse cx={W / 2} cy={y + bh + m * 0.02} rx={bw * 0.6} ry={m * 0.025} fill={k} opacity={0.18} />
        <circle cx={W * 0.12} cy={H * 0.14} r={m * 0.05} fill={d} />
      </>
    );
  },
  type: ({ W, H, c: [g, d, s, k], glyph }) => (
    <>
      <rect width={W} height={H} fill={k} />
      <T x={W * 0.05} y={H * 0.74} size={H * 0.86} fill={g} ls={-0.06}>{glyph === "alpha" ? "Aa" : "Bb"}</T>
      <rect x={W * 0.05} y={H * 0.82} width={W * 0.9} height={H * 0.008} fill={s} />
      <T x={W * 0.05} y={H * 0.92} size={H * 0.055} fill={g} ls={0.1} w={700}>ABCDEFGHIJKLM 0123456789</T>
      <circle cx={W * 0.86} cy={H * 0.2} r={H * 0.07} fill={s} />
      <rect x={W * 0.05} y={H * 0.06} width={W * 0.1} height={H * 0.012} fill={d} />
    </>
  ),
  pattern: ({ W, H, c: [g, d, s, k], glyph }) => {
    const cols = 5, cell = W / cols, rows = Math.ceil(H / cell) + 1;
    const fills = [k, s, g, d];
    const items: ReactNode[] = [];
    for (let r = 0; r < rows; r++)
      for (let q = 0; q < cols + 1; q++) {
        const off = r % 2 ? cell / 2 : 0;
        const f = fills[(r + q) % 4];
        items.push(
          (r + q) % 3 === 0
            ? <circle key={`${r}-${q}`} cx={q * cell + off} cy={r * cell + cell / 2} r={cell * 0.22} fill={s} />
            : <Mark key={`${r}-${q}`} glyph={glyph} x={q * cell + off - cell * 0.28} y={r * cell + cell * 0.1} s={cell * 0.56} fill={f === d ? g : f} dot={f === s ? k : s} />,
        );
      }
    return (
      <>
        <rect width={W} height={H} fill={d} />
        {items}
      </>
    );
  },
  social: ({ W, H, c: [g, d, s, k], glyph }) => {
    const m = Math.min(W, H), pad = m * 0.09;
    return (
      <>
        <rect width={W} height={H} fill={d} />
        <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill={s} />
        <T x={pad * 1.6} y={pad * 1.6 + m * 0.2} size={m * 0.22} fill={k}>New</T>
        <T x={pad * 1.6} y={pad * 1.6 + m * 0.42} size={m * 0.22} fill={g}>Sound</T>
        <Mark glyph={glyph} x={W - pad * 1.6 - m * 0.2} y={H - pad * 1.6 - m * 0.22} s={m * 0.2} fill={k} dot={g} />
        <rect x={pad * 1.6} y={H - pad * 1.6 - m * 0.03} width={m * 0.16} height={m * 0.012} fill={k} />
      </>
    );
  },
  billboard: ({ W, H, c: [g, d, s, k], glyph, name }) => {
    const m = Math.min(W, H);
    return (
      <>
        <rect width={W} height={H} fill={g} />
        <rect y={H * 0.78} width={W} height={H * 0.22} fill={k} />
        <rect x={W * 0.02} y={H * 0.5} width={W * 0.14} height={H * 0.3} fill={d} />
        <rect x={W * 0.86} y={H * 0.4} width={W * 0.12} height={H * 0.4} fill={d} />
        <rect x={W * 0.3} y={H * 0.62} width={W * 0.02} height={H * 0.18} fill={k} />
        <rect x={W * 0.68} y={H * 0.62} width={W * 0.02} height={H * 0.18} fill={k} />
        <rect x={W * 0.18} y={H * 0.14} width={W * 0.64} height={H * 0.5} fill={s} />
        <Mark glyph={glyph} x={W * 0.24} y={H * 0.2} s={H * 0.38} fill={k} dot={g} />
        <T x={W * 0.5} y={H * 0.44} size={m * 0.12} fill={k}>{name}</T>
        <T x={W * 0.5} y={H * 0.54} size={m * 0.035} fill={k} ls={0.14} w={700}>Out of home · prototype</T>
      </>
    );
  },
  cards: ({ W, H, c: [g, d, s, k], glyph, name }) => {
    const cw = W * 0.52, ch = cw * 0.62;
    return (
      <>
        <rect width={W} height={H} fill={g} />
        <g transform={`translate(${W * 0.5} ${H * 0.5}) rotate(-8) translate(${-cw / 2 - W * 0.04} ${-ch / 2 - H * 0.08})`}>
          <rect width={cw} height={ch} fill={k} />
          <Mark glyph={glyph} x={cw * 0.07} y={ch * 0.14} s={ch * 0.42} fill={g} dot={s} />
          <rect x={cw * 0.07} y={ch * 0.8} width={cw * 0.26} height={ch * 0.025} fill={g} opacity={0.6} />
        </g>
        <g transform={`translate(${W * 0.5} ${H * 0.5}) rotate(6) translate(${-cw / 2 + W * 0.05} ${-ch / 2 + H * 0.12})`}>
          <rect width={cw} height={ch} fill={s} />
          <T x={cw * 0.07} y={ch * 0.3} size={ch * 0.2} fill={k}>{name}</T>
          <rect x={cw * 0.07} y={ch * 0.62} width={cw * 0.4} height={ch * 0.025} fill={k} />
          <rect x={cw * 0.07} y={ch * 0.72} width={cw * 0.28} height={ch * 0.025} fill={k} opacity={0.6} />
          <rect x={cw * 0.07} y={ch * 0.82} width={cw * 0.34} height={ch * 0.025} fill={k} opacity={0.6} />
        </g>
        <circle cx={W * 0.9} cy={H * 0.12} r={W * 0.03} fill={d} />
      </>
    );
  },
  film: ({ W, H, c: [g, d, s, k], glyph }) => (
    <>
      <rect width={W} height={H} fill={k} />
      <circle className="v3-film-sun" cx={W * 0.62} cy={H * 0.46} r={H * 0.3} fill={s} />
      <rect y={H * 0.66} width={W} height={H * 0.34} fill={d} />
      <Mark glyph={glyph} x={W * 0.1} y={H * 0.3} s={H * 0.4} fill={g} dot={s} />
      <T x={W * 0.9} y={H * 0.12} size={H * 0.04} fill={g} anchor="end" ls={0.14} w={700}>film · prototype</T>
      {Array.from({ length: 24 }, (_, i) => <rect key={i} y={(H / 24) * i} width={W} height={H / 240} fill={k} opacity={0.18} />)}
    </>
  ),
  campaign: ({ W, H, c: [g, d, s, k], glyph }) => {
    const m = Math.min(W, H);
    const x0 = W * 0.08, x1 = W * 0.48, top = H * 0.26, r = (x1 - x0) / 2;
    return (
      <>
        <rect width={W} height={H} fill={s} />
        <circle cx={W * 0.72} cy={H * 0.38} r={m * 0.26} fill={g} />
        <path d={`M${x0} ${H} L${x0} ${top + r} A${r} ${r} 0 0 1 ${x1} ${top + r} L${x1} ${H}Z`} fill={d} />
        <Mark glyph={glyph} x={W * 0.28 - m * 0.13} y={H * 0.56} s={m * 0.26} fill={g} dot={s} />
        <rect y={H * 0.88} width={W} height={H * 0.12} fill={k} />
        <rect x={W * 0.58} y={H * 0.62} width={W * 0.3} height={H * 0.26} fill={k} opacity={0.9} />
        <rect x={W * 0.6} y={H * 0.66} width={W * 0.12} height={H * 0.012} fill={g} />
        <rect x={W * 0.6} y={H * 0.7} width={W * 0.08} height={H * 0.012} fill={g} opacity={0.6} />
      </>
    );
  },
  detail: ({ W, H, c: [g, d, s, k], glyph, ink }) => {
    const m = Math.min(W, H);
    return (
      <>
        <rect width={W} height={H} fill={d} />
        <circle cx={W * 0.32} cy={H * 0.74} r={m * 0.5} fill={s} />
        <Mark glyph={glyph} x={W * 0.18} y={H * 0.02} s={m * 1.1} fill={solid(k, g, ink)} dot={g === solid(k, g, ink) ? s : g} />
        <T x={W * 0.07} y={H * 0.93} size={m * 0.034} fill={g} ls={0.14} w={700}>detail</T>
      </>
    );
  },
};

export function Plate({ media, project, ratio, className = "" }: { media: Media | { art: ArtKind; v?: number; alt: string; ratio: number; src?: string; pos?: string }; project: Pick<Project, "palette" | "glyph" | "name">; ratio?: number; className?: string }) {
  if (media.src) {
    // eslint-disable-next-line @next/next/no-img-element -- real project artwork, sized by its frame
    return <img className={`v3-plate ${className}`} src={media.src} alt={media.alt} draggable={false} style={media.pos ? { objectPosition: media.pos } : undefined} />;
  }
  const r = ratio ?? media.ratio;
  const W = 1000, H = 1000 / r;
  const c = cast(project.palette, media.v ?? 0);
  return (
    <svg className={`v3-plate ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={media.alt} focusable="false">
      {arts[media.art]({ W, H, c, glyph: project.glyph, name: project.name, ink: project.palette[3] })}
    </svg>
  );
}

/** Two crops of the same plate: landscape on wide screens, portrait on narrow ones (CSS swaps them; only one is ever visible). */
export function ResponsivePlate({ media, project, ratio, ratioM }: { media: Parameters<typeof Plate>[0]["media"]; project: Parameters<typeof Plate>[0]["project"]; ratio: number; ratioM: number }) {
  return (
    <>
      <Plate media={media} project={project} ratio={ratio} className="v3-d" />
      <Plate media={media} project={project} ratio={ratioM} className="v3-m" />
    </>
  );
}
