import type { Media, Project } from "./types";

/**
 * Sample projects for the V3 prototype. ALPHA follows the original RMZ page (cream, dark green, orange, black).
 * No real client names, credits, results or figures are claimed: every fact marked "pending" is exactly that.
 * Artwork is generated prototype imagery (see components/work-v3/art.tsx), replaceable per item via `src` / `video`.
 */

const m = (
  id: string, art: Media["art"], v: number, ratio: number, title: string, tag: string, caption: string,
): Media => ({ id, art, v, ratio, title, tag, caption, alt: `${title} — prototype artwork` });


/** Real imagery borrowed from the RMZ homepage (public/media): the identity hero stills and the showreel. */
const still = (n: number) => `/media/hero/identity/frame-${String(n).padStart(2, "0")}.webp`;
const POS = ["50% 50%", "30% 50%", "70% 50%"];
const real = (list: Media[], mul: number, off: number): Media[] =>
  list.map((x, i) => {
    if (x.art === "film") return { ...x, src: "/media/showreel/poster.webp", video: "/media/showreel/showreel.mp4", title: "Showreel", tag: "Film", caption: "RMZ showreel, from the homepage.", alt: "RMZ showreel" };
    const n = ((i * mul + off) % 25) + 1;
    return { ...x, src: still(n), pos: POS[i % 3], title: `Still ${String(i + 1).padStart(2, "0")}`, tag: "Identity", caption: `RMZ identity sequence, frame ${String(n).padStart(2, "0")}.`, alt: `Woman in a cream dress among golden fish and red grass. RMZ identity sequence, frame ${n}` };
  });

const alphaMedia: Media[] = [
  m("a-mark", "mark", 0, 1, "The mark", "Identity", "One arch, one dot. Built to hold at any size."),
  m("a-poster", "poster", 0, 0.8, "Key poster", "Campaign", "The mark cropped until it becomes a landscape."),
  m("a-pack", "pack", 1, 1.25, "Pack, front", "Packaging", "A flat, loud carton that still reads from across a shelf."),
  m("a-type", "type", 3, 1.33, "Typography", "Identity", "One heavy weight. Everything else gets out of the way."),
  m("a-pattern", "pattern", 1, 1, "Pattern", "System", "The mark repeated until it behaves like a texture."),
  m("a-social", "social", 4, 0.8, "Feed tile", "Social", "Square-first, built to survive a thumb scroll."),
  m("a-tote", "tote", 2, 0.8, "Carry", "Merchandise", "The identity leaving the building."),
  m("a-cards", "cards", 2, 1.25, "Stationery", "Print", "Two cards, two voices, one system."),
  m("a-bill", "billboard", 5, 1.6, "Out of home", "Campaign", "Scaled to the street without redrawing anything."),
  m("a-campaign", "campaign", 1, 1.6, "Launch photograph", "Campaign", "The launch image, shot to be re-cropped."),
  m("a-poster2", "poster", 2, 1.25, "Poster, wide", "Campaign", "The same poster, recomposed for a landscape wall."),
  m("a-pack2", "pack", 3, 1, "Pack, detail", "Packaging", "A closer look at how the mark sits on the carton."),
  m("a-social2", "social", 1, 0.8, "Feed tile, alt", "Social", "Alternate palette role for the second drop."),
  m("a-tote2", "tote", 4, 0.8, "Tote, alt", "Merchandise", "Same bag, deep green."),
  m("a-pattern2", "pattern", 3, 1.5, "Pattern, wide", "System", "The pattern at poster scale."),
  m("a-s1", "social", 0, 0.8, "Sequence 1", "Social", "Frame one of the launch sequence."),
  m("a-s2", "poster", 4, 1, "Sequence 2", "Social", "Frame two."),
  m("a-s3", "cards", 1, 0.7, "Sequence 3", "Print", "Frame three."),
  m("a-s4", "pack", 5, 0.9, "Sequence 4", "Packaging", "Frame four."),
  m("a-bridge-b", "pack", 4, 0.9, "Pack on shelf", "Packaging", "The carton in context."),
  m("a-bridge-c", "detail", 1, 1, "Mark detail", "Identity", "A detail of the arch."),
  { ...m("a-film", "film", 0, 1.78, "Launch film", "Film", "A short film cut from the launch shoot."), alt: "Launch film — prototype placeholder" },
  m("a-detail1", "mark", 5, 0.8, "Arch, constructed", "Identity", "How the arch is drawn."),
  m("a-detail2", "detail", 1, 1, "Dot, in place", "Identity", "The dot is the only colour accent."),
];

const betaMedia: Media[] = [
  m("b-mark", "mark", 0, 1, "The mark", "Identity", "Two halves that read as one letter."),
  m("b-poster", "poster", 0, 0.8, "Key visual", "Campaign", "The campaign line and the mark, nothing else."),
  m("b-social", "social", 4, 0.8, "Reel cover", "Social", "Built for a full-screen vertical feed."),
  m("b-billboard", "billboard", 5, 1.6, "Out of home", "Campaign", "One image, scaled to the street."),
  m("b-pack", "pack", 1, 1.25, "Limited pack", "Packaging", "Launch-week packaging."),
  m("b-cards", "cards", 2, 1.25, "Press kit", "Print", "Cards that go in the press box."),
  m("b-campaign", "campaign", 0, 1.9, "Launch photograph", "Campaign", "The hero frame of the launch."),
  m("b-pair-a", "tote", 3, 0.8, "Merch", "Merchandise", "A bag for the launch crowd."),
  m("b-pair-b", "pattern", 2, 1.5, "Pattern", "System", "The mark as wallpaper."),
  m("b-bridge-a", "campaign", 2, 1.6, "Launch photograph, alt", "Campaign", "Re-cropped for the bridge."),
  m("b-bridge-b", "pack", 5, 0.9, "Pack", "Packaging", "Launch-week pack, shelf view."),
  m("b-bridge-c", "detail", 0, 1, "Detail", "Identity", "The mark, close."),
  { ...m("b-film", "film", 1, 1.78, "Launch film", "Film", "Fifteen seconds that carry the whole idea."), alt: "Launch film — prototype placeholder" },
];

export const projects: Project[] = [
  {
    slug: "alpha",
    number: "01",
    name: "Alpha",
    glyph: "alpha",
    client: null,
    category: "Brand identity",
    year: "2026",
    services: ["Identity", "Typography", "Packaging", "Campaign"],
    palette: ["#E9DFC8", "#1F3B2E", "#F86015", "#0F0F0E"],
    statement: "An identity that behaves like a *sound*, not a sign.",
    lead: "A young company with a sharp product and no voice. We gave it *one* loud mark and a palette to say it with.",
    brief: "A new company with a strong product and no visual language needed an identity that could carry across packaging, screens and film from day one.",
    challenge: "Launch in a crowded category with a small footprint: the identity had to be recognisable at thumbnail size and still hold up on a carton.",
    solution: "One arch and one dot. A restrained four-colour palette taken from the product, and a single heavy weight of type, applied with strict rules and room to break them.",
    media: real(alphaMedia, 7, 0),
    hero: { src: still(1), pos: "49% 50%" },
    sequence: [
      { type: "full", id: "a-campaign" },
      { type: "trio", main: "a-poster2", details: ["a-pack2", "a-social2"] },
      { type: "canvas", ids: ["a-mark", "a-poster", "a-pack", "a-type", "a-pattern", "a-social", "a-tote", "a-cards", "a-bill"] },
      { type: "pair", a: "a-tote2", b: "a-pattern2" },
      { type: "bridge", a: "a-campaign", b: "a-bridge-b", c: "a-bridge-c", note: "Same launch photograph, re-cropped. The carton and the mark detail arrive as the frame opens." },
      { type: "strip", ids: ["a-s1", "a-s2", "a-s3", "a-s4"] },
      { type: "film", id: "a-film" },
    ],
    detail: {
      kicker: "The idea",
      title: "One arch. Two ways to read it.",
      body: [
        "The mark is an A and a doorway at once. The dot sits where the crossbar would be, and it is the only place the orange is allowed to be loud.",
        "That single rule did most of the work: every layout, from carton to feed tile, is decided by where the dot lands.",
      ],
      a: "a-detail1",
      b: "a-detail2",
    },
    next: "beta",
    placeholder: true,
  },
  {
    slug: "beta",
    number: "02",
    name: "Beta",
    glyph: "beta",
    client: null,
    category: "Campaign",
    year: "2026",
    services: ["Campaign idea", "Art direction", "Film"],
    palette: ["#FFCA26", "#6B1E12", "#F3E8CC", "#0F0F0E"],
    statement: "Make the product the *loudest* thing in the room.",
    lead: "A launch week, a fixed date and a small budget. One line, one colour and *every* format.",
    brief: "A launch needed attention in a crowded week, with a fixed date and a small budget.",
    challenge: "Be unmissable across street, feed and press without producing a different campaign for each.",
    solution: "A single line and a single colour, cut for every format from a vertical reel to a wall.",
    media: real(betaMedia, 11, 3),
    hero: { src: still(13), pos: "50% 50%" },
    sequence: [
      { type: "full", id: "b-campaign" },
      { type: "canvas", ids: ["b-mark", "b-poster", "b-social", "b-billboard", "b-pack", "b-cards"] },
      { type: "pair", a: "b-pair-a", b: "b-pair-b", flip: true },
      { type: "bridge", a: "b-bridge-a", b: "b-bridge-b", c: "b-bridge-c", note: "One frame, re-cropped. The pack and the mark detail arrive as it opens." },
      { type: "film", id: "b-film" },
    ],
    next: "alpha",
    placeholder: true,
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
export const mediaOf = (p: Project, id: string): Media => {
  const found = p.media.find((x) => x.id === id);
  if (!found) throw new Error(`Project ${p.slug}: unknown media id "${id}"`);
  return found;
};
