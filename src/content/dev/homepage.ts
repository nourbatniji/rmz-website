import type { HeroBanner, HomepageContent } from "../types";

/**
 * Banner 1 test sequence: SIX independently generated photographic keyframes (woman lifting a silver
 * cloche lid), ordered closed → highest. They are keyframes, not a continuous animation; final smooth
 * imagery needs a continuous source video or a coherent frame sequence (see docs/hero-baseline.md).
 */
const clocheSequence: HeroBanner["sequence"] = {
  frames: [1, 2, 3, 4, 5, 6].map((n) => `/media/hero/cloche/${String(n).padStart(3, "0")}.webp`),
};
const clochePoster = "/media/hero/cloche/poster.webp";

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
  // Copy below is taken verbatim from the approved canvas (board "HOME - TEXT SECTION").
  statement: {
    lead: ["RMZ,", "when", "expectations"],
    connector: ["are"],
    words: ["broken", "rewritten", "exceeded", "challenged"],
  },
  // Copy below is taken verbatim from the approved canvas (board "HOME - MINDS SECTION", actually services fins).
  // PROVISIONAL / REPEATED — see docs/content-flags.md: items 01–07 repeat the services dial's copy; the intro
  // sentence describes the design mechanic; images are not delivered (placeholders are shown).
  serviceFins: {
    label: "Capabilities",
    intro:
      "Brand identities, campaigns and digital experiences, from strategy to production. Select a service to see what it covers.",
    initialOpenId: "creative-direction",
    items: [
      {
        id: "brand-strategy",
        number: "01",
        title: "Brand Strategy",
        description:
          "Positioning, naming and the idea a brand stands on. We start wide, with the whole market in frame.",
        image: null,
        imagePosition: "50% 40%",
      },
      {
        id: "brand-identity",
        number: "02",
        title: "Brand Identity",
        description: "Marks, systems, type and guidelines. One distinctive detail, drawn so it works everywhere.",
        image: null,
        imagePosition: "50% 40%",
      },
      {
        id: "creative-direction",
        number: "03",
        title: "Creative Direction",
        description:
          "One point of view across every frame, format and channel. We set the direction, then keep it consistent from the first sketch to the last post.",
        image: null,
        imagePosition: "50% 25%",
      },
      {
        id: "advertising-campaigns",
        number: "04",
        title: "Advertising & Campaigns",
        description: "Campaign ideas, scripts and production. One idea, carried across coordinated executions.",
        image: null,
        imagePosition: "50% 40%",
      },
      {
        id: "digital-experiences",
        number: "05",
        title: "Digital Experiences",
        description: "Websites and interactive work, designed for the screen they will be seen on.",
        image: null,
        imagePosition: "50% 40%",
      },
      {
        id: "content-production",
        number: "06",
        title: "Content & Production",
        description: "Photo, film and social content, shot close enough to see the craft.",
        image: null,
        imagePosition: "50% 20%",
      },
      {
        id: "growth-marketing",
        number: "07",
        title: "Growth & Marketing",
        description: "Media performance and measurement, so the work reaches the people it was made for.",
        image: null,
        imagePosition: "50% 36%",
      },
      {
        id: "packaging-print",
        number: "08",
        title: "Packaging & Print",
        description:
          "Packaging, print and physical touchpoints, finished with the same care as the screen.",
        image: null,
        imagePosition: "50% 40%",
      },
    ],
  },
};
