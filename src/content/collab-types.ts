import type { ImageRef } from "./types";
import type { WordmarkId } from "./closing-types";

/** Content contract of the homepage Collaborations section (magnetic logos). Editable from the dashboard ("collaborations" section). */

export const PARTNER_SCALE = { min: 50, max: 160, def: 100 } as const;
export const MAGNET_SCALE = { min: 30, max: 100, def: 100 } as const;
/** The approved RMZ square. These are the defaults for every magnet setting. */
export const MAGNET_DEFAULTS = { background: "#D52518", artworkColor: "#F3E8CC", label: "RMZ — gather the collaborations" } as const;

export type CollabPartner = {
  /** Stable id (used as the React key and for reordering); never shown. */
  id: string;
  name: string;
  /** Accessible alternative text for the artwork (what a screen reader announces). */
  alt: string;
  /** Real artwork (SVG or PNG with transparency recommended). `null` = not supplied yet: the built-in placeholder `mark`, or the name as text. */
  logo: ImageRef | null;
  /** Built-in placeholder wordmark shown only while `logo` is null (the original demo entries). */
  mark: WordmarkId | null;
  /** Optional destination: the logo becomes a real link. */
  href: string | null;
  /** Hidden entries stay in the dashboard but are left off the website. */
  visible: boolean;
  /** Visual size in percent of the automatic optical size (50–160). */
  scale: number;
};

export type CollabMagnet = {
  /** Accessible label of the central button. */
  label: string;
  /** Uploaded artwork for the square; `null` = the default "RMZ" lettering. */
  artwork: ImageRef | null;
  /** Square colour. */
  background: string;
  /** Colour of the default lettering, and of uploaded artwork when `tint` is on. */
  artworkColor: string;
  /** Uploaded artwork only: paint it in one colour (uses its transparency as a stencil). Off = original colours are kept. */
  tint: boolean;
  /** Artwork size inside the square, in percent (30–100). */
  artworkScale: number;
};

export type CollaborationsContent = {
  visible: boolean;
  label: string;
  headingLead: string;
  headingEmphasis: string;
  magnet: CollabMagnet;
  partners: CollabPartner[];
};
