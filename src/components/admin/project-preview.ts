import type { ImageRef } from "@/content/types";
import type { WorkCategory, WorkProject } from "@/content/work-types";

type Obj = Record<string, unknown>;
const CATEGORIES: WorkCategory[] = ["brand", "camp", "dig", "cont"];
const DEFAULT_PALETTE: WorkProject["palette"] = ["#0F0F0E", "#2A2A28", "#FFCA26", "#F3E8CC"];
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

/** Editor form values → a project the page component can draw. Forgiving on purpose: half-typed values still preview. */
export function toPreviewProject(v: { name: string; slug: string; category: string; body: Obj }): WorkProject {
  const b = v.body ?? {};
  const palette = Array.isArray(b.palette) && b.palette.length >= 4 && b.palette.slice(0, 4).every((c) => typeof c === "string" && c) ? (b.palette.slice(0, 4) as WorkProject["palette"]) : DEFAULT_PALETTE;
  const img = b.image as Partial<ImageRef> | null | undefined;
  const image: ImageRef | null = img && typeof img === "object" && typeof img.src === "string" && img.src ? { src: img.src, alt: str(img.alt), width: img.width, height: img.height } : null;
  const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string" && s.length > 0) : []);
  const credits = Array.isArray(b.credits)
    ? (b.credits as Obj[]).filter((c) => c && typeof c.role === "string").map((c) => ({ role: str(c.role), name: typeof c.name === "string" && c.name ? c.name : null }))
    : [];
  const category = CATEGORIES.includes(v.category as WorkCategory) ? (v.category as WorkCategory) : "brand";
  return {
    slug: v.slug || "preview",
    number: "01",
    name: v.name || "Project name",
    category,
    discipline: str(b.discipline),
    year: str(b.year),
    client: typeof b.client === "string" && b.client ? b.client : null,
    palette,
    image,
    about: str(b.about),
    services: str(b.services),
    brief: str(b.brief),
    idea: str(b.idea),
    keys: strings(b.keys),
    deliverables: strings(b.deliverables),
    credits,
    copyStatus: b.copyStatus === "approved" ? "approved" : "placeholder",
    layout: Array.isArray(b.layout) ? (b.layout as { id: string; show: boolean }[]) : undefined,
  };
}
