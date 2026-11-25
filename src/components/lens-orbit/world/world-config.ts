import type { ImageRef, LensContent } from "@/content/types";
import { CALIBRATION_OVERVIEW, CALIBRATION_VIEWS, FALLBACK_VIEW } from "@/content/lens-world-defaults";

/**
 * Typed configuration for the "one shared world" image system (homepage Services lens).
 *
 *  - ONE overview image shows all seven services together.
 *  - ONE dedicated image per service. Selecting a service zooms the overview toward that service's `target`, hands over to the dedicated image and settles on it.
 *
 * Coordinates are NORMALISED against the overview image itself (0,0 = top-left of the image file, 1,1 = bottom-right), never against the container:
 * the renderer cover-fits the image in the glass first and measures from that fitted rectangle, so a target keeps pointing at the same pixels at every size.
 *
 * `zoom` = how far the camera is zoomed in when it arrives, as a multiple of the cover-fitted overview. The dedicated image must show EXACTLY the part of the
 * overview that the glass shows at that camera: the square window centred on `target` whose side is (overview side / zoom). The renderer places the
 * dedicated image inside that window (so it blends in seamlessly) and cover-fits it there using `focal` (matters only if the dedicated file is not square).
 *
 */
/** width/height 0 = unknown: measured from the loaded file. */
export type WorldImage = { src: string; width: number; height: number };
export type Point = { x: number; y: number };
export type WorldService = {
  /** Taxonomy id of the service this entry belongs to (same ids as the lens content). */
  serviceId: string;
  /** Normalised point on the overview image the camera flies to. */
  target: Point;
  /** Camera zoom on arrival (≥ 1), relative to the cover-fitted overview. */
  zoom: number;
  /** Normalised point of the dedicated image kept in view when it is cropped to the window. */
  focal: Point;
  /** `null`: no dedicated image yet — the camera zooms to the target and stays on the overview. */
  image: WorldImage | null;
};
export type WorldConfig = {
  overview: WorldImage;
  /** Aperture (0–1) of the opening state: wide enough to read the whole composition. */
  openAperture: number;
  services: WorldService[];
};

/**
 * Builds the renderer's config from the saved lens content, in the order of the service taxonomy (the order of the names around the lens).
 * Non-breaking fallbacks, so the lens is never blank: no saved overview → the built-in overview; a service with no saved view (older saved content) → its built-in view
 * (and its built-in image only while the built-in overview is in use, because a dedicated image only matches the overview it was cut from); no dedicated image →
 * the camera still zooms to the target and simply stays on the overview.
 */
export function resolveWorld(lens: LensContent, serviceIds: string[]): WorldConfig {
  const customOverview = !!lens.overview?.src;
  const ref = (r: ImageRef): WorldImage => ({ src: r.src, width: r.width ?? 0, height: r.height ?? 0 });
  const overview = ref(customOverview ? (lens.overview as ImageRef) : CALIBRATION_OVERVIEW);
  const byId = new Map(lens.items.map((it) => [it.serviceId, it]));
  return {
    overview,
    openAperture: 0.96,
    services: serviceIds.filter((id) => byId.has(id)).map((id) => { // same order and filter as the names around the lens
      const saved = byId.get(id)?.world;
      const base = CALIBRATION_VIEWS[id] ?? FALLBACK_VIEW;
      const v = saved ?? { ...base, image: customOverview ? null : base.image };
      return { serviceId: id, target: v.target, zoom: v.zoom, focal: v.focal, image: v.image ? ref(v.image) : null };
    }),
  };
}
