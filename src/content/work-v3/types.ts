/**
 * Project Details V3 — content contract.
 * A project is a small piece of data: facts, copy, an ordered media library and a sequence of composition blocks.
 * No CMS, no database: add a project by adding an object to `projects.ts`.
 *
 * `art` plates are PROTOTYPE imagery (generated in code from the project palette). Give any media item a `src`
 * (image) or `video` and the real asset replaces the plate with no other change.
 */

export type ArtKind =
  | "hero" | "mark" | "poster" | "pack" | "tote" | "type" | "pattern"
  | "social" | "billboard" | "cards" | "film" | "campaign" | "detail";

/** [ground, deep, signal, ink] — same four-colour order as the existing Work data. */
export type Palette = [string, string, string, string];

export type Media = {
  id: string;
  art: ArtKind;
  /** Palette-role variant 0–5: re-casts which project colour plays ground / deep / signal / ink. */
  v?: number;
  /** width / height */
  ratio: number;
  /** Real image. Replaces the prototype plate. */
  src?: string;
  /** CSS object-position for the real image crop, e.g. "40% 50%". */
  pos?: string;
  /** Real film. Autoplays muted, looped. */
  video?: string;
  alt: string;
  title: string;
  /** Short discipline label: Identity, Packaging, Campaign, Film … */
  tag: string;
  /** One short line. */
  caption: string;
};

/** A small set of flexible composition types — the sequence decides rhythm, not fixed service chapters. */
export type Block =
  | { type: "full"; id: string }
  | { type: "trio"; main: string; details: [string, string]; flip?: boolean }
  | { type: "pair"; a: string; b: string; flip?: boolean }
  | { type: "strip"; ids: string[] }
  | { type: "film"; id: string }
  | { type: "canvas"; ids: string[] }
  | { type: "bridge"; a: string; b: string; c: string; note: string };

export type Project = {
  slug: string;
  number: string;
  name: string;
  glyph: "alpha" | "beta";
  /** `null` = not supplied yet (shown as pending, never invented). */
  client: string | null;
  category: string;
  year: string;
  services: string[];
  palette: Palette;
  /** Short line in the entrance. */
  statement: string;
  /** Oversized editorial statement; `*word*` is set in the Playfair italic accent. */
  lead: string;
  brief: string;
  challenge: string;
  solution: string;
  media: Media[];
  sequence: Block[];
  /** Optional creative-detail module. Remove it and the page recomposes. */
  detail?: { kicker: string; title: string; body: string[]; a: string; b: string };
  next: string;
  /** Prototype content notice. */
  /** Real hero image. Falls back to the generated plate. */
  hero?: { src: string; pos?: string };
  placeholder: boolean;
};
