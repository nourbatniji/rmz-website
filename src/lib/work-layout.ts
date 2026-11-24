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
