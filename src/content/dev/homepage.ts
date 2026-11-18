import type { HomepageContent } from "../types";

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
    banners: [
      {
        id: "identity",
        number: "01",
        label: "Identity",
        accent: "#FFCA26",
        description: "Banner 1, Identity. A ribbed wall whose picture moves as you scroll.",
        // MISSING: 72-frame image sequence (see docs/asset-checklist.md).
        // Example once delivered:
        // media: { kind: "sequence", poster: null, sequence: { pattern: "/media/hero/identity/{n}.webp", frameCount: 72, startAt: 0, digits: 3 } },
        expects: "sequence",
        media: null,
      },
      {
        id: "campaign",
        number: "02",
        label: "Campaign",
        accent: "#F86015",
        description: "Banner 2, Campaign.",
        // MISSING: still image 2880×1800.
        expects: "still",
        media: null,
      },
      {
        id: "digital",
        number: "03",
        label: "Digital",
        accent: "#9ACC42",
        description: "Banner 3, Digital.",
        // MISSING: still image 2880×1800.
        expects: "still",
        media: null,
      },
    ],
  },
};
