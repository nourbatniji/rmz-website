import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

/** Cache tag for everything the public site reads from the database. Publishing calls updateTag(CONTENT_TAG). */
export const CONTENT_TAG = "content";

/**
 * Raw section JSON from the database: the published copy for visitors, the draft copy for the admin preview.
 * Cached and tagged; any failure (no DATABASE_URL, database down) yields {} so the site falls back to the built-in content.
 */
export async function readSections(draft: boolean): Promise<Record<string, unknown>> {
  "use cache";
  cacheTag(CONTENT_TAG);
  try {
    const rows = await db.siteSection.findMany({ select: { key: true, draft: true, published: true } });
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      const v = draft ? r.draft : r.published;
      if (v !== null && v !== undefined) out[r.key] = v;
    }
    return out;
  } catch {
    cacheLife("seconds");
    return {};
  }
}

export type ProjectRow = { slug: string; name: string; category: string; body: unknown };

/** Project rows in display order, or null when the table is empty / unreachable (then the built-in demo projects are used). */
export async function readProjects(draft: boolean): Promise<ProjectRow[] | null> {
  "use cache";
  cacheTag(CONTENT_TAG);
  try {
    const total = await db.project.count();
    if (total === 0) return null;
    const rows = await db.project.findMany({
      where: draft ? {} : { status: "published" },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { slug: true, name: true, category: true, body: true },
    });
    return rows;
  } catch {
    cacheLife("seconds");
    return null;
  }
}
