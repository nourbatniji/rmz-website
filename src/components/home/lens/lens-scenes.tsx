import type { CSSProperties } from "react";
import type { ImageRef, LensImageKey } from "@/content/types";

/**
 * What the lens glass shows for each service: ONE picture, filling the glass (722 px), with focus corners and a centre cross.
 * The picture comes from the content slot that belongs to the service (see scene-slots.ts); a missing slot renders a labelled development placeholder.
 */
type Imgs = Partial<Record<LensImageKey, ImageRef | null>>;

const TONE: Record<LensImageKey, string> = {
  a: "#3b342b", b: "#4a3b30", c: "#2f3b37", d: "#433b49", e: "#3a4350", f: "#4a4335", g: "#2e3b49", h: "#4a3b3b", i: "#3a4a3b",
};
const u = (n: number) => +(n / 7.22).toFixed(3);
const CREAM = "#F3E8CC";
const FILL: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
const ALL: CSSProperties = { left: 0, top: 0, width: "100%", height: "100%" };

function Im({ k, imgs }: { k: LensImageKey; imgs: Imgs }) {
  const ref = imgs[k];
  if (ref)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fixed-crop lens imagery, positioned by percentage
      <img data-rmz-path={`images.${k}`} src={ref.src} alt="" loading="lazy" decoding="async" draggable={false} style={{ position: "absolute", display: "block", objectFit: "cover", objectPosition: "50% 50%", ...ALL }} />
    );
  return (
    <div data-ph="" data-rmz-path={`images.${k}`} style={{ position: "absolute", background: TONE[k], overflow: "hidden", ...ALL }}>
      <span className="lens-ph">Image {k.toUpperCase()}</span>
    </div>
  );
}

export function LensScene({ slot, imgs }: { slot: LensImageKey; imgs: Imgs }) {
  return (
    <>
      <Im k={slot} imgs={imgs} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={FILL}>
        <g fill="none" stroke={CREAM} strokeWidth={u(2)}>
          <path d="M 12 20 V 12 H 20" />
          <path d="M 80 12 H 88 V 20" />
          <path d="M 88 80 V 88 H 80" />
          <path d="M 20 88 H 12 V 80" />
        </g>
      </svg>
    </>
  );
}
