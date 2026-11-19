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

/**
 * Home video section ("corridor"): ONE showreel video is the surface of the front wall and both side walls.
 * Layout, perspective, scroll mapping and animation live in code; only content and media live here.
 *
 * MEDIA CONTRACT — one shared master, 2.4:1 (e.g. 3840 × 1600). All three walls are 2.4:1 planes (1680 × 700 world units),
 * so a 2.4:1 source fills every wall exactly: no crop, no stretch, no letterbox. Other ratios are centre-cropped (never stretched).
 */
export type CorridorContent = {
  kicker: string;
  /** Approach headline (visible while walking down the corridor; fades out before arrival). */
  headline: { lead: string; emphasis: string };
  /** Approach paragraph (fades out with the headline). */
  intro: string;
  /** Large headline revealed ABOVE the front video once the camera has arrived (never shown during the approach). */
  arrivalHeadline: string;
  /** Short paragraph revealed BELOW the front video at arrival. */
  arrivalDescription: string;
  /** `null` until the final showreel exists: the poster (or a labelled placeholder) is shown on all three walls, with no player controls. */
  video: { src: string } | null;
  /** Poster still, 2.4:1, used on all three walls until the video has frames. `null` = labelled development placeholder. */
  poster: ImageRef | null;
  /** Accessible description of the video (the 3D scene itself is decorative). */
  accessibleDescription: string;
};

export type HomepageContent = {
  site: SiteContent;
  hero: HeroContent;
  corridor: CorridorContent;
  statement: StatementContent;
  services: ServiceTaxonomyItem[];
  serviceFins: ServiceFinsContent;
};
