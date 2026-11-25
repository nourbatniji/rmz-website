import "server-only";
import { cache } from "react";
import type { CollaborationsContent } from "@/content/collab-types";
import type { FooterContent } from "@/content/closing-types";
import type { HomepageContent, ServiceTaxonomyItem } from "@/content/types";
import { defaultSection, sectionSchemas, type SectionKey } from "./sections";
import { readSections } from "./store";

/**
 * The ONLY way UI code reads homepage content.
 *
 * Reads the published sections from Postgres (draft sections when `draft` is true — admin preview only).
 * A section that is missing or fails validation falls back to the built-in content, so the page always renders.
 * Server-only — never import this from a client component, and never expose a write path here.
 */
const load = cache(async (draft: boolean): Promise<HomepageContent> => {
  const rows = await readSections(draft);
  const get = <T>(key: SectionKey): T => {
    const parsed = sectionSchemas[key].safeParse(rows[key]);
    return (parsed.success ? parsed.data : defaultSection(key)) as T;
  };
  return {
    site: get("site"),
    hero: get("hero"),
    corridor: get("corridor"),
    statement: get("statement"),
    services: get<{ items: ServiceTaxonomyItem[] }>("services").items,
    lens: get("lens"),
    minds: get("minds"),
    featured: get("featured"),
  };
});

/** Collaborations (magnetic logos) for the homepage: published content, or the draft in the admin preview. */
export async function getCollaborationsContent(opts?: { draft?: boolean }): Promise<CollaborationsContent> {
  const rows = await readSections(!!opts?.draft);
  const parsed = sectionSchemas.collaborations.safeParse(rows.collaborations);
  return (parsed.success ? parsed.data : defaultSection("collaborations")) as CollaborationsContent;
}

/** Footer / contact for the homepage: published content, or the draft in the admin preview. Falls back to the built-in footer if nothing valid is saved. */
export async function getFooterSection(opts?: { draft?: boolean }): Promise<FooterContent> {
  const rows = await readSections(!!opts?.draft);
  const parsed = sectionSchemas.footer.safeParse(rows.footer);
  return (parsed.success ? parsed.data : defaultSection("footer")) as FooterContent;
}

export function getHomepageContent(opts?: { draft?: boolean }): Promise<HomepageContent> {
  return load(!!opts?.draft);
}
