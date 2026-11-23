/**
 * The project page is built from blocks the studio can show, hide and reorder per project.
 * The top of the page (back link, name, summary) and the "next project" strip at the bottom are fixed.
 * Pure and client-safe: used by the public page, the admin editor and its live preview.
 */
export const PAGE_BLOCKS = [
  { id: "meta", label: "Project facts", about: "Client, services, year and status." },
  { id: "hero", label: "Main image", about: "The big picture under the facts. Hide it to drop the image completely." },
  { id: "brief", label: "The brief", about: "The brief text." },
  { id: "idea", label: "The idea", about: "The idea and the key points, with a concept image." },
  { id: "execution", label: "Execution pictures", about: "Large picture blocks under “The execution”. Demo art until real images are added." },
  { id: "showcase", label: "Category showcase", about: "The extra block for this category: logo system, film, screens or production." },
  { id: "strip", label: "Image strip", about: "Three square pictures." },
  { id: "outcome", label: "The outcome", about: "What was delivered." },
  { id: "credits", label: "Credits", about: "Who did what." },
] as const;

export type BlockId = (typeof PAGE_BLOCKS)[number]["id"];
export type LayoutItem = { id: BlockId; show: boolean };

const IDS = PAGE_BLOCKS.map((b) => b.id) as readonly string[];
export const isBlockId = (v: unknown): v is BlockId => typeof v === "string" && IDS.includes(v);

/** Saved layout → full ordered list. Unknown or repeated ids are dropped; blocks added later appear at the end, shown. No saved layout = the original page. */
export function resolveLayout(saved: unknown): LayoutItem[] {
  const out: LayoutItem[] = [];
  const seen = new Set<string>();
  if (Array.isArray(saved)) {
    for (const it of saved) {
      const id = (it as { id?: unknown } | null)?.id;
      if (!isBlockId(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, show: (it as { show?: unknown }).show !== false });
    }
  }
  for (const b of PAGE_BLOCKS) if (!seen.has(b.id)) out.push({ id: b.id, show: true });
  return out;
}

/**
 * Inside each block, single pictures and paragraphs can be kept, deleted, or (pictures) swapped for a real image.
 * A deleted element is left off the page completely; its content stays saved so it can be brought back.
 * Saved as `hidden` (ids of deleted elements) and `images` (element id → replacement picture) on the project.
 */
export type ElementKind = "image" | "text" | "video" | "other";
export type PageElement = {
  id: string;
  block: BlockId | "top";
  label: string;
  kind: ElementKind;
  /** Pictures only: where it sits on the page, in plain words (shown next to its uploader). */
  where?: string;
  /** Pictures only: the shape the picture is shown in, width:height. */
  ratio?: string;
  /** Text parts with no project field of their own: the built-in wording, which the editor may replace (saved in `texts`). */
  def?: string;
};

const el = (id: string, block: PageElement["block"], label: string, kind: ElementKind, where?: string, ratio?: string, def?: string): PageElement => ({ id, block, label, kind, where, ratio, def });

const SHOWCASE: Record<string, PageElement[]> = {
  brand: [el("showcase.logo", "showcase", "Logo system panel", "other"), el("showcase.swatches", "showcase", "Colour swatches", "other")],
  camp: [el("showcase.film", "showcase", "Key film", "video"), el("showcase.image1", "showcase", "Reel picture 1", "image", "Tall picture, left of the two reels beside the film", "9:16"), el("showcase.image2", "showcase", "Reel picture 2", "image", "Tall picture, right of the two reels beside the film", "9:16"), el("showcase.caption", "showcase", "Reels caption", "text", undefined, undefined, "Reels · 9:16 placeholders")],
  dig: [el("showcase.image1", "showcase", "Desktop screen", "image", "Big picture inside the browser window frame", "16:10"), el("showcase.image2", "showcase", "Mobile screen", "image", "Tall picture inside the phone frame, on the right", "9:19"), el("showcase.caption", "showcase", "Screens caption", "text", undefined, undefined, "Selected screens and responsive view. Interaction demo to be linked when the live site is verified.")],
  cont: [el("showcase.image1", "showcase", "Square picture", "image", "Square picture, top left, beside the production film", "1:1"), el("showcase.image2", "showcase", "Wide picture", "image", "Wide picture under the square one", "3:2"), el("showcase.film", "showcase", "Production film", "video")],
};

const FIXED_ELEMENTS: Record<string, PageElement[]> = {
  top: [el("top.about", "top", "Summary paragraph", "text")],
  hero: [el("hero.image", "hero", "Main image", "image", "Wide banner right under the project facts. Also shown on the project card in the archive.", "21:9")],
  meta: [el("meta.client", "meta", "Client", "text"), el("meta.services", "meta", "Services", "text"), el("meta.year", "meta", "Year", "text"), el("meta.status", "meta", "Status", "text")],
  brief: [el("brief.text", "brief", "Brief paragraph", "text")],
  idea: [el("idea.image", "idea", "Concept image", "image", "Tall picture on the left, beside the idea text", "4:5"), el("idea.text", "idea", "The idea statement", "text"), el("idea.keys", "idea", "Key points list", "text"), el("idea.caption", "idea", "Figure caption", "text", undefined, undefined, "Fig. 02 — Concept frame. Demo copy.")],
  execution: [el("execution.image1", "execution", "Wide picture", "image", "Full-width picture right under “The execution”", "16:9"), el("execution.image2", "execution", "Left picture", "image", "Large picture, left, below the full-width one", "4:3"), el("execution.image3", "execution", "Right picture", "image", "Tall picture, right, next to the large one", "3:4")],
  strip: [el("strip.image1", "strip", "Picture 1", "image", "Small square, first of the row of three", "1:1"), el("strip.image2", "strip", "Picture 2", "image", "Small square, middle of the row of three", "1:1"), el("strip.image3", "strip", "Picture 3", "image", "Square, last of the row of three (a bit larger)", "1:1")],
  outcome: [el("outcome.statement", "outcome", "Heading line", "text", undefined, undefined, "What was delivered."), el("outcome.list", "outcome", "Deliverables list", "text"), el("outcome.note", "outcome", "Footnote", "text", undefined, undefined, "No performance results have been supplied, so none are shown.")],
  credits: [el("credits.list", "credits", "Credits list", "text")],
};

/** The parts of a block that can be kept or deleted. The main image and the showcase of other categories have their own rules. */
export function elementsOf(block: BlockId | "top", category: string): PageElement[] {
  if (block === "showcase") return SHOWCASE[category] ?? [];
  return FIXED_ELEMENTS[block] ?? [];
}

/** Saved list of deleted element ids → a set. Anything that isn't a string is ignored. */
export function hiddenSet(saved: unknown): Set<string> {
  return new Set(Array.isArray(saved) ? saved.filter((s): s is string => typeof s === "string") : []);
}

/** Fixed wording on the page that is not a project field and cannot be deleted (headings, labels). The editor may replace it; empty = the built-in wording. */
export type FixedText = { id: string; label: string; def: string };
const FIXED_TEXTS: Record<string, FixedText[]> = {
  top: [{ id: "top.tag", label: "Tag after the discipline (top line)", def: "Demo project" }],
  meta: [{ id: "meta.statusText", label: "Status text (empty = automatic)", def: "Demo project · placeholder copy" }],
  brief: [{ id: "brief.heading", label: "Section heading", def: "The brief" }],
  idea: [{ id: "idea.heading", label: "Section heading", def: "The idea" }],
  execution: [{ id: "execution.heading", label: "Section heading", def: "The execution" }],
  outcome: [{ id: "outcome.heading", label: "Section heading", def: "The outcome" }],
  credits: [{ id: "credits.heading", label: "Section heading", def: "Credits" }],
};
const SHOWCASE_TEXTS: Record<string, FixedText[]> = {
  brand: [
    { id: "showcase.logoTop", label: "Logo panel, top line", def: "Logo system · placeholder wordmark" },
    { id: "showcase.logoBottom", label: "Logo panel, bottom line", def: "Temporary type: Figtree · Playfair Display" },
  ],
  dig: [{ id: "showcase.frameLabel", label: "Browser window label", def: "Website overview · desktop 1440 · placeholder" }],
};
export function fixedTextsOf(block: BlockId | "top", category: string): FixedText[] {
  return block === "showcase" ? (SHOWCASE_TEXTS[category] ?? []) : (FIXED_TEXTS[block] ?? []);
}
/** The editor's wording for a fixed text, or the built-in one. */
export function textOf(texts: Record<string, string> | undefined, id: string, def: string): string {
  const t = texts?.[id];
  return typeof t === "string" && t.trim() ? t : def;
}

/** A block whose every part was deleted is left off the page (no lonely heading) and doesn't take a number. */
export function blockIsEmpty(block: BlockId, category: string, hidden: ReadonlySet<string>): boolean {
  const parts = elementsOf(block, category);
  return parts.length > 0 && parts.every((e) => hidden.has(e.id));
}

/**
 * Every picture slot on a project page, numbered in page order (top to bottom, following the block order set in Page layout).
 * The dashboard shows the same number on the uploader card and on the picture in the live preview, so editors can match them.
 */
export function imageSlots(layout: unknown, category: string): { el: PageElement; n: number; blockShown: boolean }[] {
  let n = 0;
  return resolveLayout(layout).flatMap((b) => elementsOf(b.id, category).filter((e) => e.kind === "image").map((e) => ({ el: e, n: ++n, blockShown: b.show })));
}
