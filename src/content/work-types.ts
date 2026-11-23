import type { ImageRef } from "./types";

/**
 * Typed content contract for the Work section (archive + project pages).
 * Read ONLY through `getWorkContent()` / `getWorkProject()` (src/lib/content/work.ts).
 * Layout and motion stay in code; this holds copy, ordering and media references.
 */

export type WorkCategory = "brand" | "camp" | "dig" | "cont";

export type WorkProject = {
  slug: string;
  /** Two-digit label, e.g. "01". */
  number: string;
  name: string;
  category: WorkCategory;
  /** Human label for the category, e.g. "Brand identity". */
  discipline: string;
  year: string;
  /** `null` = client name not supplied yet (placeholder shown). */
  client: string | null;
  /** Four colours (ground, deep, signal, ink) driving the placeholder art and the brand swatches. */
  palette: [string, string, string, string];
  /** Hero image. `null` = not delivered yet (labelled placeholder art is shown). */
  image: ImageRef | null;
  about: string;
  services: string;
  brief: string;
  idea: string;
  keys: string[];
  deliverables: string[];
  /** Credit roles; `name: null` = not supplied yet. */
  credits: { role: string; name: string | null }[];
  /** `placeholder` = demo copy, shown as such. */
  copyStatus: "placeholder" | "approved";
  /** Page blocks shown/hidden and their order (see src/lib/work-layout.ts). Missing = the original page. */
  layout?: { id: string; show: boolean }[];
  /** Ids of single images / paragraphs deleted from the page (see `elementsOf` in src/lib/work-layout.ts). */
  hidden?: string[];
  /** Real pictures that replace the demo art, keyed by element id (e.g. "idea.image"). */
  images?: Record<string, ImageRef>;
  /** The showcase film of campaign / content projects. Missing = placeholder. */
  video?: { src: string } | null;
  /** Replacements for the page's fixed wording, by id (see `fixedTextsOf` in src/lib/work-layout.ts). */
  texts?: Record<string, string>;
};

export type WorkContent = {
  label: string;
  headingLead: string;
  headingEmphasis: string;
  intro: string;
  categories: { id: "all" | WorkCategory; label: string }[];
  emptyTitle: string;
  emptyBody: string;
  contact: { label: string; href: string };
  projects: WorkProject[];
};
