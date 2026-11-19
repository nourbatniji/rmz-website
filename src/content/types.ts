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

/**
 * An ordered image sequence for ONE banner: consecutive frames of the same scene.
 * Either an explicit frame manifest, or a numbered URL pattern. Banners may have different lengths.
 */
export type SequenceRef =
  | { frames: string[] }
  | {
      /** URL pattern; `{n}` is replaced with the zero-padded frame number. */
      pattern: string;
      frameCount: number;
      /** First frame number in the file names (usually 0 or 1). */
      startAt: number;
      /** Zero-padding width of `{n}`. */
      digits: number;
    };

export type HeroBanner = {
  id: string;
  /** Two-digit label shown on the chip, e.g. "01". */
  number: string;
  label: string;
  /** Accent colour for the chip swatch (and placeholder art). */
  accent: string;
  /** Short description for assistive tech. */
  description: string;
  /** Shown immediately, and as the explicit fallback if the sequence is missing/unusable. */
  poster: ImageRef | null;
  /** `null` = no sequence yet (poster, then a labelled placeholder, is shown). */
  sequence: SequenceRef | null;
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

/** Statement: a fixed sentence whose final word rotates. Timing/animation live in code. */
export type StatementContent = {
  /** Fixed words of the first line, e.g. ["RMZ,", "when", "expectations"]. */
  lead: string[];
  /** Fixed words before the rotating word on the second line, e.g. ["are"]. */
  connector: string[];
  /** Rotating final words, in order. */
  words: string[];
};

/**
 * The ONE shared service taxonomy (approved names and order). Every section that lists services (fins, Lens
 * selector, footer, nav, future CMS) takes names/order/ids from here; sections add their own copy and media.
 */
export type ServiceTaxonomyItem = {
  /** Stable id — never change once published; other content references it. */
  id: string;
  name: string;
};

export type ServiceFinItem = {
  /** References `ServiceTaxonomyItem.id`. Title and number come from the taxonomy (name + position). */
  serviceId: string;
  /** Section-specific copy. Not shared with other sections. */
  description: string;
  /** "provisional" = written by the build team, not approved by the client. */
  copyStatus: "approved" | "provisional";
  /** `null` until delivered — a labelled development placeholder is shown. */
  image: ImageRef | null;
  /** CSS object-position for the cropped image, e.g. "50% 40%". */
  imagePosition: string;
};

/** Service "fins": one open at a time. Order = array order. */
export type ServiceFinsContent = {
  label: string;
  intro: string;
  /** Service id of the fin open on first render. */
  initialOpenId: string;
  /** One entry per service, in taxonomy order. */
  items: ServiceFinItem[];
};

/** One project card hanging in the showreel corridor. */
export type CorridorProject = {
  id: string;
  /** Two-digit label, e.g. "01". */
  number: string;
  title: string;
  /** References `ServiceTaxonomyItem.id` (category line). */
  serviceId: string;
  /** Short suffix after the category, e.g. "Demo project" while projects are placeholders. */
  tag: string;
  /** Project page URL. `null` = not linkable yet (project pages are deferred): rendered as a plain card. */
  href: string | null;
  /** Static poster for mobile side frames; `null` = labelled placeholder. */
  poster: ImageRef | null;
};

/**
 * Home video section ("HOME - VIDEO SECTION" corridor). One showreel video plays on every screen.
 * Layout, perspective, scroll mapping and animation live in code; only content and media live here.
 */
export type CorridorContent = {
  kicker: string;
  headline: { lead: string; emphasis: string };
  intro: string;
  /** `null` until the final showreel exists: poster / labelled placeholder is shown and no player controls appear. */
  video: { src: string } | null;
  /** Approved poster still. `null` = labelled development placeholder. */
  poster: ImageRef | null;
  /** Accessible description of the video (read by screen readers on the main screen). */
  accessibleDescription: string;
  /** Strip under the main screen ("All projects / Open the archive"). `href` null until the Work page exists. */
  archive: { kicker: string; title: string; href: string | null };
  /** Six projects: wall order left, right, left, right, left, right (1…6). */
  projects: CorridorProject[];
};

export type HomepageContent = {
  site: SiteContent;
  hero: HeroContent;
  corridor: CorridorContent;
  statement: StatementContent;
  services: ServiceTaxonomyItem[];
  serviceFins: ServiceFinsContent;
};
