/**
 * Typed homepage content contract.
 *
 * The frontend consumes ONLY this shape, through `getHomepageContent()`
 * (src/lib/content/homepage.ts). Today the data comes from development content;
 * later the same function reads from Prisma/PostgreSQL (CMS) with no component changes.
 *
 * Layout, animation mechanics and design tokens stay in code — not in this contract.
 */

/** A still image reference. `null` anywhere this is allowed = media not delivered yet (placeholder shown). */
export type ImageRef = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

/** A numbered image sequence, e.g. `/media/hero/identity/{n}.webp`. */
export type SequenceRef = {
  /** URL pattern; `{n}` is replaced with the zero-padded frame number. */
  pattern: string;
  frameCount: number;
  /** First frame number in the file names (usually 0 or 1). */
  startAt: number;
  /** Zero-padding width of `{n}`. */
  digits: number;
};

export type HeroBannerMedia =
  | { kind: "sequence"; sequence: SequenceRef; poster: ImageRef | null }
  | { kind: "still"; image: ImageRef };

export type HeroBanner = {
  id: string;
  /** Two-digit label shown on the chip, e.g. "01". */
  number: string;
  label: string;
  /** Accent colour for the chip swatch (and placeholder art). */
  accent: string;
  /** Short description for assistive tech. */
  description: string;
  /** What the final media will be; decides how the placeholder behaves while `media` is null. */
  expects: "sequence" | "still";
  /** `null` until real media is delivered — a dev placeholder is rendered instead. */
  media: HeroBannerMedia | null;
};

export type HeroContent = {
  headline: { lead: string; emphasis: string };
  intro: string;
  scrollHint: string;
  banners: HeroBanner[];
};

export type NavItem = { label: string; href: string };

export type SiteContent = {
  brand: { name: string; logo: ImageRef | null };
  nav: NavItem[];
};

export type HomepageContent = {
  site: SiteContent;
  hero: HeroContent;
};
