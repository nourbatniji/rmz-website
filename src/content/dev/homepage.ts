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
  // Video section: one showreel on three walls. No footage yet: poster/video are null → labelled placeholder on all walls,
  // no player controls. COPY IS PROVISIONAL (pending approval): the canvas wording ("Six rooms. One long wall." / "Each project
  // hangs on the wall…") described project cards that no longer exist, so it was replaced with wording that matches the
  // current experience. Previous canvas copy is recorded in docs/video-section.md.
  corridor: {
    kicker: "Work — walk the corridor",
    headline: { lead: "One reel.", emphasis: "Three walls." },
    intro: "Scroll to walk the corridor. The showreel plays on every wall and the film fills the front.",
    arrivalHeadline: "The work, in motion.",
    arrivalDescription: "A selection of recent brand, campaign and digital work from Rebel Mind Zone, together in one reel.",
    // Supplied showreel (H.264 High 8-bit, 2206 × 946, silent). Centre-cropped to the 2.4:1 walls (≈ 3 % off top/bottom, never
    // stretched). Replace with the final 2.4:1 master when delivered — see docs/video-section.md for the export spec.
    video: { src: "/media/showreel/showreel.mp4" },
    poster: { src: "/media/showreel/poster.webp", alt: "", width: 2206, height: 946 },
    accessibleDescription:
      "Showreel footage: a cream sphere glides across a dark space past tall red, amber and cream panels. The film plays without sound.",
  },
  // Copy below is taken verbatim from the approved canvas (board "HOME - TEXT SECTION").
  statement: {
    lead: ["RMZ,", "when", "expectations"],
    connector: ["are"],
    words: ["broken", "rewritten", "exceeded", "challenged"],
  },
  // APPROVED service taxonomy (client-confirmed names and order). Single source of truth for every section.
  services: [
    { id: "branding", name: "Branding" },
    { id: "creative-strategy", name: "Creative Strategy" },
    { id: "content-production", name: "Content Production" },
    { id: "social-media", name: "Social Media" },
    { id: "design", name: "Design" },
    { id: "paid-media", name: "Paid Media" },
    { id: "web-experiences", name: "Web Experiences" },
  ],
  // Lens services section ("HOME - SERVICES SECTION"). Names/order come from `services` (the approved taxonomy).
  // PROVISIONAL: descriptions, bullet lists, focal labels and scene assignment are build-team wording written for the new
  // taxonomy (the canvas copy described the old eight services and was not carried over). Scene imagery is not exportable
  // from the canvas, so the nine image slots show labelled placeholders. See docs/lens-section.md.
  lens: {
    kicker: "What we do, as focal lengths",
    heading: { lead: "Seven ways of", emphasis: "looking." },
    intro: "Choose one and the lens reframes the work.",
    hintDesktop: "click or drag the ring · use ↑ ↓ on the list",
    hintMobile: "drag the ring or swipe the lens",
    initialSelectedId: "content-production",
    items: [
      { serviceId: "branding", focal: "24mm", ringMark: "24", scene: "detail", href: null, copyStatus: "provisional",
        description: "Identity, naming and the visual system a brand lives in, built to work wherever it appears.",
        details: ["Naming and verbal identity", "Logo and visual system", "Guidelines and toolkit"] },
      { serviceId: "creative-strategy", focal: "35mm", ringMark: "35", scene: "triptych", href: null, copyStatus: "provisional",
        description: "The thinking behind the work: positioning, audience and the idea a brand can own.",
        details: ["Positioning and narrative", "Audience and market map", "Creative platform and direction"] },
      { serviceId: "content-production", focal: "50mm", ringMark: "50", scene: "contactsheet", href: null, copyStatus: "provisional",
        description: "Photo, film and written content, produced with care and made to travel across channels.",
        details: ["Photography", "Film and motion", "Copy and editorial"] },
      { serviceId: "social-media", focal: "85mm", ringMark: "85", scene: "collage", href: null, copyStatus: "provisional",
        description: "Social presence planned, created and managed, so a brand shows up consistently.",
        details: ["Channel strategy", "Content planning and creation", "Community management"] },
      { serviceId: "design", focal: "135mm", ringMark: "135", scene: "fullframe", href: null, copyStatus: "provisional",
        description: "Layouts, campaign visuals and design assets, finished with care.",
        details: ["Key visuals", "Layout and editorial design", "Digital and social assets"] },
      { serviceId: "paid-media", focal: "Macro", ringMark: "MACRO", scene: "reach", href: null, copyStatus: "provisional",
        description: "Paid campaigns planned, bought and measured, so the work reaches the people it was made for.",
        details: ["Media planning", "Performance campaigns", "Measurement and reporting"] },
      { serviceId: "web-experiences", focal: "Tele", ringMark: "TELE", scene: "devices", href: null, copyStatus: "provisional",
        description: "Websites and interactive work, designed and built for the screen they will be seen on.",
        details: ["Websites", "Interactive features", "UX and UI design"] },
    ],
    // MISSING: nine scene images (canvas assets are not exportable). Set any slot to { src, alt: "", width, height }.
    images: { a: null, b: null, c: null, d: null, e: null, f: null, g: null, h: null, i: null },
  },
  // Service fins. Names/order come from `services`; descriptions here are PROVISIONAL build-team copy written for
  // the new taxonomy (the old eight-service descriptions were not carried over) — pending client approval.
  // Images are not delivered (labelled placeholders are shown). See docs/content-flags.md.
  serviceFins: {
    label: "Capabilities",
    intro:
      "Brand identities, campaigns and digital experiences, from strategy to production. Select a service to see what it covers.",
    initialOpenId: "content-production",
    items: [
      { serviceId: "branding", description: "Identity, naming and the visual system a brand is built on, designed to hold up everywhere it appears.", copyStatus: "provisional", image: null, imagePosition: "50% 40%" },
      { serviceId: "creative-strategy", description: "The idea and the direction behind the work: where a brand stands, who it speaks to and how it should sound.", copyStatus: "provisional", image: null, imagePosition: "50% 40%" },
      { serviceId: "content-production", description: "Photo, film and written content, produced close enough to see the craft and made to run across channels.", copyStatus: "provisional", image: null, imagePosition: "50% 25%" },
      { serviceId: "social-media", description: "Social presence planned, created and managed, so a brand shows up consistently where its audience already is.", copyStatus: "provisional", image: null, imagePosition: "50% 40%" },
      { serviceId: "design", description: "Layouts, campaign visuals and design assets for screen and print, finished with care.", copyStatus: "provisional", image: null, imagePosition: "50% 40%" },
      { serviceId: "paid-media", description: "Paid campaigns planned and measured, so the work reaches the people it was made for.", copyStatus: "provisional", image: null, imagePosition: "50% 36%" },
      { serviceId: "web-experiences", description: "Websites and interactive work, designed and built for the screen they will be seen on.", copyStatus: "provisional", image: null, imagePosition: "50% 40%" },
    ],
  },
};
