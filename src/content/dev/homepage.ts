import type { HeroBanner, HomepageContent } from "../types";

/**
 * Banner 1: 25 delivered PNG frames (1478 × 622) of a woman surrounded by golden fish and red grass, converted to WebP
 * (public/media/hero/identity/frame-01.webp … frame-25.webp). Frame 01 is also the poster, so it is shown as soon as the banner appears.
 */
const identitySequence: HeroBanner["sequence"] = {
  frames: Array.from({ length: 25 }, (_, i) => `/media/hero/identity/frame-${String(i + 1).padStart(2, "0")}.webp`),
};
const identityPoster = "/media/hero/identity/frame-01.webp";

/**
 * DEVELOPMENT CONTENT — the single place media references live until the CMS exists.
 *
 * To swap in real media, replace a `media: null` with a `sequence` / `still` ref.
 * Nothing in components needs to change. Copy is taken from the approved canvas.
 */
const FEATURED_PHOTOS: { src: string; alt: string; pos: string }[] = [
  { src: "/media/featured/work-01-arid.webp", alt: "Portrait of a woman in red lipstick and red bead earrings among prickly-pear cactus pads", pos: "50% 28%" },
  { src: "/media/featured/work-02-drift.webp", alt: "A woman in a black feather collar looking through a magnifying glass against a red gradient", pos: "50% 36%" },
  { src: "/media/featured/work-03-tidepool.webp", alt: "A woman in a red coat surfing a wave while carrying a green suitcase", pos: "50% 38%" },
];

export const devHomepageContent: HomepageContent = {
  site: {
    brand: {
      name: "Rebel Mind Zone",
      // MISSING: official logo file (SVG preferred). Header falls back to a text wordmark.
      logo: null,
    },
    nav: [
      { label: "Work", href: "#work" },
      { label: "Capabilities", href: "#services" },
      { label: "Studio", href: "#minds" },
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
          "Banner 1, Identity: a woman in a cream dress stands among golden fish and red grass; the scene moves as you scroll.",
        poster: { src: identityPoster, alt: "", width: 1478, height: 622 },
        sequence: identitySequence,
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
  // Minds: the people behind the work (NOT services). No approved names, roles, biographies or portraits exist yet, so all
  // eight entries are clearly marked TEMPORARY PLACEHOLDERS (copyStatus "placeholder"). Do not ship as final.
  // See docs/minds-section.md.
  minds: {
    label: "Minds", // visually hidden section heading
    initialOpenId: "mind-03",
    items: Array.from({ length: 8 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return {
        id: `mind-${n}`,
        number: n,
        name: `Mind ${n}`,
        role: "Role to be confirmed",
        bio: "Placeholder: name, role and short biography to be supplied.",
        copyStatus: "placeholder" as const,
        image: null,
        imagePosition: "50% 30%",
      };
    }),
  },
  // Featured work focus (canvas board "HOME - ABOUT SECTION" — titled About, designed as selected work). The six project names, categories
  // and colours are the canvas's DEMO entries, and every description is a placeholder: no verified case summaries or images exist yet.
  // Cards 01–03 now carry delivered photographs (public/media/featured, 900×1200 WebP); 04–06 still show the labelled placeholder.
  // See docs/featured-work-section.md.
  featured: {
    label: "Selected work",
    items: (
      [
        ["Arid", "Brand identity", "#F86015"],
        ["Drift", "Campaign", "#FFCA26"],
        ["Tidepool", "Digital experience", "#9ACC42"],
        ["Rouge", "Campaign", "#D52518"],
        ["Blush", "Content & production", "#E8402F"],
        ["Bloom", "Brand identity", "#971409"],
      ] as const
    ).map(([name, category, color], i) => {
      const n = String(i + 1).padStart(2, "0");
      const photo = FEATURED_PHOTOS[i] ?? null;
      return {
        id: `work-${n}`,
        number: n,
        name,
        category,
        description: `Placeholder for ${name}: two or three sentences on the brief, the idea and the result will go here once the verified case summary is supplied.`,
        copyStatus: "placeholder" as const,
        image: photo ? { src: photo.src, alt: photo.alt, width: 900, height: 1200 } : null,
        imagePosition: photo?.pos ?? "50% 50%",
        placeholderColor: color,
      };
    }),
  },
};
