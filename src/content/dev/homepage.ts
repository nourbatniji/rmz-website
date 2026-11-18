import type { HeroBanner, HomepageContent } from "../types";

/**
 * Banner 1 uses a real photographic sequence of a woman lifting a silver cloche lid.
 *  - default: SIX independently generated keyframes (explicit frame manifest, ordered closed → highest).
 *  - HERO_CLOCHE_VARIANT=interpolated: EXPERIMENTAL 41-frame motion-interpolated set made from those six
 *    keyframes (visible ghosting around hand/sleeve/tray — for comparison only).
 */
const interpolated = process.env.HERO_CLOCHE_VARIANT === "interpolated";
const clocheSequence: HeroBanner["sequence"] = interpolated
  ? { pattern: "/media/hero/cloche-interpolated/{n}.webp", frameCount: 41, startAt: 1, digits: 3 }
  : {
      frames: [1, 2, 3, 4, 5, 6].map((n) => `/media/hero/cloche/${String(n).padStart(3, "0")}.webp`),
    };
const clochePoster = interpolated ? "/media/hero/cloche-interpolated/poster.webp" : "/media/hero/cloche/poster.webp";


/**
 * DEVELOPMENT CONTENT — the single place media references live until the CMS exists.
 *
 * To swap in real media, replace a `media: null` with a `sequence` / `still` ref.
 * Nothing in components needs to change. Copy is taken from the approved canvas.
 */
export const devHomepageContent: HomepageContent = {
  site: {
    brand: {
      name: "Rebel Mind Zone",
      // MISSING: official logo file (SVG preferred). Header falls back to a text wordmark.
      logo: null,
    },
    nav: [
      { label: "Work", href: "#work" },
      { label: "Capabilities", href: "#capabilities" },
      { label: "Studio", href: "#studio" },
      { label: "Contact", href: "#contact" },
    ],
  },
  hero: {
    headline: { lead: "One wall.", emphasis: "Three faces." },
    intro:
      "Rebel Mind Zone builds brand identities, campaigns and digital experiences. Scroll to move the picture. Turn the wall to see each face.",
    scrollHint: "Scroll to move the picture",
    // DEV SEQUENCES (public/media/dev/hero) — labelled, not final art. Each banner has its own
    // frame count on purpose (50 / 36 / 64) to prove per-banner mapping. Replace with delivered frames.
    banners: [
      {
        id: "identity",
        number: "01",
        label: "Identity",
        accent: "#FFCA26",
        description:
          "Banner 1, Identity: a woman in a yellow coat and straw hat lifts the lid of a silver cloche on a green background as you scroll.",
        poster: { src: clochePoster, alt: "", width: 1672, height: 941 },
        sequence: clocheSequence,
      },
      {
        id: "campaign",
        number: "02",
        label: "Campaign",
        accent: "#F86015",
        description: "Banner 2, Campaign: a scene that plays forward and backward as you scroll the page.",
        poster: { src: "/media/dev/hero/banner-2/poster.webp", alt: "", width: 1600, height: 1000 },
        sequence: { pattern: "/media/dev/hero/banner-2/{n}.webp", frameCount: 36, startAt: 1, digits: 3 },
      },
      {
        id: "digital",
        number: "03",
        label: "Digital",
        accent: "#9ACC42",
        description: "Banner 3, Digital: a scene that plays forward and backward as you scroll the page.",
        poster: { src: "/media/dev/hero/banner-3/poster.webp", alt: "", width: 1600, height: 1000 },
        sequence: { pattern: "/media/dev/hero/banner-3/{n}.webp", frameCount: 64, startAt: 1, digits: 3 },
      },
    ],
  },
};
