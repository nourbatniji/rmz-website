"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Pose } from "./world-camera";
import type { WorldConfig } from "./world-config";

/**
 * The interior of the lens for the shared-world prototype: ONE overview image plus one dedicated image per service, all inside a single "world" layer that the
 * camera moves and zooms. The glass is 722 design units (the lens is scaled as one object by its parent), so every number below is in those units and
 * the picture is identical at any rendered size.
 *
 * Geometry: the overview is cover-fitted in the glass first (rect = Wd × Hd at offX/offY); a normalised target is measured from THAT rectangle. The camera
 * centre is clamped so the zoomed window never leaves the image. A dedicated image sits in the world layer exactly on its window (side = glass / zoom, centred
 * on the target) so it follows the same transform as the overview and lands pixel-for-pixel on arrival. Images are never stretched (object-fit: cover).
 */
export const GLASS = 722;

/** Preload + decode: an image is only revealed once it can paint without a flash; the overview underlay is always present. */
function useDecoded(srcs: string[], first: string[]) {
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const load = (src: string) => {
      if (seen.current.has(src)) return;
      seen.current.add(src);
      const im = new Image();
      im.decoding = "async";
      im.src = src;
      const done = () => setReady((s) => (s.has(src) ? s : new Set(s).add(src)));
      // a file that fails to load or decode is never marked ready: its layer stays hidden and the overview underneath stays on screen
      if (im.decode) im.decode().then(done, () => {});
      else im.onload = done;
    };
    first.forEach(load);
    const t = window.setTimeout(() => srcs.forEach(load), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `first` is derived from the current selection
  }, [first.join("|"), srcs.join("|")]);
  return ready;
}

export function WorldScene({ cfg, pose, urgent }: { cfg: WorldConfig; pose: Pose; urgent: number[] }) {
  const { overview, services } = cfg;
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null); // measured size when the saved image has no width/height
  const known = overview.width > 0 && overview.height > 0;
  const ow = known ? overview.width : (nat?.w ?? 1);
  const oh = known ? overview.height : (nat?.h ?? 1);
  const s0 = Math.max(GLASS / ow, GLASS / oh);
  const Wd = ow * s0, Hd = oh * s0;
  const offX = (GLASS - Wd) / 2, offY = (GLASS - Hd) / 2;
  // the camera centre in glass units, clamped so a window of size GLASS/z stays inside the fitted overview
  const centre = (nx: number, ny: number, z: number) => {
    const hw = GLASS / (2 * z);
    return {
      x: Math.min(offX + Wd - hw, Math.max(offX + hw, offX + nx * Wd)),
      y: Math.min(offY + Hd - hw, Math.max(offY + hw, offY + ny * Hd)),
    };
  };
  const P = centre(pose.cx, pose.cy, pose.z);
  const world: CSSProperties = { position: "absolute", left: 0, top: 0, width: GLASS, height: GLASS, transformOrigin: "0 0", transform: `translate(${(GLASS / 2 - pose.z * P.x).toFixed(2)}px,${(GLASS / 2 - pose.z * P.y).toFixed(2)}px) scale(${pose.z.toFixed(4)})` };

  const srcs = services.flatMap((s) => (s.image ? [s.image.src] : []));
  const first = [overview.src, ...urgent.flatMap((i) => (services[i]?.image ? [services[i].image!.src] : []))];
  const ready = useDecoded(srcs, first);

  return (
    <div data-world="" style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0F0F0E" }}>
      <div style={world}>
        {/* eslint-disable-next-line @next/next/no-img-element -- camera-driven artwork, sized in glass units */}
        <img src={overview.src} alt="" draggable={false} decoding="async" onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} style={{ position: "absolute", display: "block", left: offX, top: offY, width: Wd, height: Hd, maxWidth: "none" }} />
        {services.map((s, i) => {
          if (!s.image) return null;
          const o = pose.blend[i] ?? 0;
          const win = GLASS / s.zoom;
          const c = centre(s.target.x, s.target.y, s.zoom);
          const show = o > 0.001 && ready.has(s.image.src); // an image still loading (or failed) is simply not shown: the overview underneath stays
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.serviceId}
              src={s.image.src}
              alt=""
              draggable={false}
              decoding="async"
              data-svc={i}
              style={{ position: "absolute", display: show ? "block" : "none", left: c.x - win / 2, top: c.y - win / 2, width: win, height: win, maxWidth: "none", objectFit: "cover", objectPosition: `${s.focal.x * 100}% ${s.focal.y * 100}%`, opacity: show ? o : 0 }}
            />
          );
        })}
      </div>
    </div>
  );
}
