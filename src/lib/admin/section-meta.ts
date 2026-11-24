/** Client-safe metadata about the editable homepage sections (no server imports). */
export const SECTION_KEYS = ["site", "hero", "corridor", "statement", "featured", "services", "lens", "minds", "workIntro", "collaborations"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export function isSectionKey(v: string): v is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(v);
}

export type SectionMeta = {
  label: string;
  /** Short line shown on the overview and above the form. */
  about: string;
  /** Anchor the live preview scrolls to. */
  anchor: string;
  group: "page" | "site";
};

export const SECTION_META: Record<SectionKey, SectionMeta> = {
  site: { label: "Header and menu", about: "Brand name, logo and the links in the top menu.", anchor: "top", group: "site" },
  hero: { label: "Top banner", about: "The first thing visitors see: headline, intro and the three animated banners.", anchor: "top", group: "page" },
  corridor: { label: "Showreel video", about: "The big showreel video, its cover image and the words around it.", anchor: "showreel", group: "page" },
  statement: { label: "Statement", about: "The one-sentence statement and the words that rotate in it.", anchor: "statement", group: "page" },
  featured: { label: "About", about: "The scroll-linked About steps: an image, a title and a short text for each step.", anchor: "featured", group: "page" },
  services: { label: "Service names", about: "The names of the services the studio offers.", anchor: "services", group: "page" },
  lens: { label: "Services showcase", about: "A description, label and picture for each service.", anchor: "services", group: "page" },
  minds: { label: "Team", about: "The eight team members: names, roles, short bios and portraits.", anchor: "minds", group: "page" },
  collaborations: { label: "Collaborations", about: "The partner logos around the red RMZ square: add, hide, resize and reorder logos, and set the square's artwork.", anchor: "collaborations", group: "page" },
  workIntro: { label: "Work archive intro", about: "The heading, intro text and filters above the grid of projects.", anchor: "work-archive", group: "page" },
};

/** Sidebar order for the "Homepage" group (page order). */
export const PAGE_ORDER: SectionKey[] = ["hero", "corridor", "statement", "featured", "services", "lens", "minds", "workIntro", "collaborations"];
