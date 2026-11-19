/** Content contracts for the two closing home sections: Collaborations ("The Collective") and the Footer. */

/** Ids of the built-in placeholder wordmarks (see components/home/collective/wordmarks.tsx). Real logos replace them via `logo`. */
export type WordmarkId =
  | "northwind" | "halo" | "orbital" | "kiln" | "tideworks" | "mango"
  | "papermoon" | "atlas" | "fable" | "solstice" | "brick" | "ninelines";

export type CollectivePartner = {
  name: string;
  role: string; // discipline label shown in the caption, e.g. "Identity"
  mark: WordmarkId; // placeholder wordmark used while `logo` is null
  logo: { src: string; width: number; height: number } | null; // approved artwork (single-colour SVG/PNG recommended: it is tinted by CSS only if SVG-inline; PNG shown as is)
  href: string | null; // case-study page, once it exists
  copyStatus: "placeholder" | "approved";
};

export type CollectiveContent = {
  label: string;
  headingLead: string;
  headingEmphasis: string;
  intro: string; // desktop
  introTouch: string; // mobile
  hint: string; // caption when nothing is selected (desktop)
  hintTouch: string; // (mobile)
  partnerLine: string; // caption line under the selected partner
  placeholderNote: string;
  partners: CollectivePartner[]; // up to 12 are laid out
};

export type FooterLink = { label: string; href: string };

export type FooterContent = {
  label: string;
  place: string; // "Cairo, Egypt"
  timeZone: string; // IANA zone for the live clock
  headlineLines: [string, string]; // second line ends with the italic emphasis
  headlineEmphasis: string;
  cta: { top: string; bottom: string; href: string };
  email: string;
  studio: { heading: string; body: string };
  explore: { heading: string; links: FooterLink[] };
  services: { heading: string; items: string[] };
  elsewhere: { heading: string; links: FooterLink[] };
  copyright: string;
  placeholderNote: string;
  toTop: string;
};

export type ClosingContent = { collective: CollectiveContent; footer: FooterContent };
