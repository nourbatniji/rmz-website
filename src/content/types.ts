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
  /** The headline shown with this banner: a bold cream lead line and a red italic emphasis line (e.g. "A DIFFERENT" / "perspective."). */
  phraseLead?: string;
  phraseEmphasis?: string;
};

export type HeroContent = {
  headline: { lead: string; emphasis: string };
  intro: string;
  scrollHint: string;
  /** Short description under the headline. */
  tagline?: string;
  /** Link under the description (label + target: #section, /path or https://…). */
  ctaLabel?: string;
  ctaHref?: string;
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

/** One mind (team member) hanging as a column in the Minds section. Not a service. */
export type MindItem = {
  id: string;
  /** Two-digit label, e.g. "01". */
  number: string;
  /** Full name. Placeholder until approved. */
  name: string;
  /** Role / title line. Placeholder until approved. */
  role: string;
  /** Short biography shown in the open column. Placeholder until approved. */
  bio: string;
  /** "placeholder" = temporary content, never final. */
  copyStatus: "approved" | "placeholder";
  /** `null` until delivered — a labelled development placeholder is shown. */
  image: ImageRef | null;
  /** CSS object-position for the cropped portrait, e.g. "50% 25%". */
  imagePosition: string;
};

/** Minds: exactly eight columns, one open at a time. Order = array order. */
export type MindsContent = {
  /** Accessible (visually hidden) section heading. */
  label: string;
  /** Id of the column open on first render. */
  initialOpenId: string;
  items: MindItem[];
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

/** Which illustrated "study" is drawn inside the lens glass for a service (layout lives in code; imagery in `LensContent.images`). */
export type LensSceneKey = "triptych" | "detail" | "fullframe" | "collage" | "devices" | "contactsheet" | "reach";
/** Image slots used by the lens scenes. `null`/missing → labelled development placeholder. */
export type LensImageKey = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i";

export type LensServiceItem = {
  /** References `ServiceTaxonomyItem.id`: the name and order come from the shared taxonomy. */
  serviceId: string;
  /** Focal-length chip shown beside the name, e.g. "24mm", "Macro". */
  focal: string;
  /** Short label printed on the lens ring, e.g. "24", "MACRO". */
  ringMark: string;
  /** Section-specific copy (not shared with the fins). */
  description: string;
  details: [string, string, string];
  scene: LensSceneKey;
  /** Service page URL. `null` until service pages exist: the "Explore service" link is then not rendered. */
  href: string | null;
  copyStatus: "approved" | "provisional";
};

/** Home services section ("HOME - SERVICES SECTION"): a lens whose aperture reframes the work. Layout/animation live in code. */
export type LensContent = {
  kicker: string;
  heading: { lead: string; emphasis: string };
  intro: string;
  hintDesktop: string;
  hintMobile: string;
  /** Id of the service selected on first render. */
  initialSelectedId: string;
  /** One entry per service, in taxonomy order. */
  items: LensServiceItem[];
  images: Partial<Record<LensImageKey, ImageRef | null>>;
};

/**
 * Featured work focus (canvas board "HOME - ABOUT SECTION"). The canvas board is TITLED About but its approved design is a pinned
 * wall of project cards: each card shows its image on the front and turns (scroll-linked) to its description on the back.
 * There is no About Us copy in the canvas. All entries below are placeholders until verified case summaries and images are supplied.
 */
export type FeaturedWorkItem = {
  id: string;
  /** Two-digit label, e.g. "01". */
  number: string;
  /** Project name (card title). */
  name: string;
  /** Category line, e.g. "Brand identity". */
  category: string;
  /** Back-face description. Must stay short (about five lines in the open card). */
  description: string;
  /** "placeholder" = temporary content, never final. */
  copyStatus: "approved" | "placeholder";
  /** Front-face image. `null` until delivered: a labelled development placeholder fill (`placeholderColor`) is shown. */
  image: ImageRef | null;
  /** CSS object-position for the cropped front image. */
  imagePosition: string;
  /** Fill of the development placeholder only. */
  placeholderColor: string;
};

export type FeaturedWorkContent = {
  /** Visible section label and accessible heading. */
  label: string;
  items: FeaturedWorkItem[];
};

export type HomepageContent = {
  site: SiteContent;
  hero: HeroContent;
  corridor: CorridorContent;
  statement: StatementContent;
  services: ServiceTaxonomyItem[];
  lens: LensContent;
  minds: MindsContent;
  featured: FeaturedWorkContent;
};
