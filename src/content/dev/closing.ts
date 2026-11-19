import type { ClosingContent, WordmarkId } from "../closing-types";

/** Demo content (canvas "Concept A · The Collective" + "Footer"). The twelve partners are clearly-marked placeholders, not real RMZ collaborations. */
const P: [string, string, WordmarkId][] = [
  ["Northwind", "Identity", "northwind"],
  ["Halo", "Campaign", "halo"],
  ["Orbital Press", "Content", "orbital"],
  ["kiln.", "Digital", "kiln"],
  ["Tideworks", "Growth", "tideworks"],
  ["Mango Lab", "Campaign", "mango"],
  ["Paper Moon", "Identity", "papermoon"],
  ["Atlas & Co", "Content", "atlas"],
  ["Fable", "Content", "fable"],
  ["Solstice", "Digital", "solstice"],
  ["Brick House", "Growth", "brick"],
  ["Nine Lines", "Identity", "ninelines"],
];

export const devClosingContent: ClosingContent = {
  collective: {
    label: "Collaborations",
    headingLead: "Good",
    headingEmphasis: "company.",
    intro: "Brands and organizations we have made work with. Hover, focus or tap a mark to inspect it.",
    introTouch: "Brands and organizations we have made work with. Tap a mark to inspect it.",
    hint: "Hover, focus or tap a mark",
    hintTouch: "Tap a mark",
    partnerLine: "Placeholder partner · case-study link to come",
    placeholderNote: "Placeholder wordmarks · not real RMZ collaborations · swap in approved artwork",
    partners: P.map(([name, role, mark]) => ({ name, role, mark, logo: null, href: null, copyStatus: "placeholder" as const })),
  },
  footer: {
    label: "Contact",
    place: "Cairo, Egypt",
    timeZone: "Africa/Cairo",
    headlineLines: ["Let's start", "something"],
    headlineEmphasis: "rebel.",
    cta: { top: "Say", bottom: "hello", href: "mailto:management@rmz.solutions" },
    email: "management@rmz.solutions",
    studio: {
      heading: "Studio",
      body: "Rebel Mind Zone is a creative identity house in Cairo, Egypt. Brands, campaigns, content and digital, for people who refuse to blend in.",
    },
    explore: {
      heading: "Explore",
      links: [
        { label: "Work", href: "/#work" },
        { label: "Selected", href: "/#selected" },
        { label: "Capabilities", href: "/#services" },
        { label: "Studio", href: "/#minds" },
        { label: "Collaborations", href: "/#collaborations" },
      ],
    },
    services: { heading: "What we do", items: ["Brand identity", "Campaigns", "Content production", "Digital and web", "Growth"] },
    elsewhere: {
      heading: "Elsewhere",
      links: [
        { label: "Instagram", href: "https://www.instagram.com/" },
        { label: "Behance", href: "https://www.behance.net/" },
        { label: "LinkedIn", href: "https://www.linkedin.com/" },
        { label: "TikTok", href: "https://www.tiktok.com/" },
      ],
    },
    copyright: "© 2026 Rebel Mind Zone · All rights reserved",
    placeholderNote: "Social links are placeholders, swap in real profiles",
    toTop: "Back to top ↑",
  },
};
