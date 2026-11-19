import "server-only";
import { SECTION_KEYS, defaultSection, sectionSchemas, type SectionKey } from "@/lib/content/sections";
import { db } from "@/lib/db";
import { stableStringify } from "@/components/admin/form/spec";

export type SectionState = {
  key: SectionKey;
  /** No row in the database: the site is using the built-in content. */
  fromDefault: boolean;
  /** Row exists but the saved JSON no longer matches the schema (site falls back to built-in content). */
  invalid: boolean;
  published: boolean;
  draftChanges: boolean;
  updatedAt: Date | null;
  updatedBy: string | null;
  publishedAt: Date | null;
  /** Counts used by the readiness overview. */
  placeholders: number;
  provisional: number;
  missingMedia: number;
};

/** Walk a content value and count what still needs real content. */
export function analyze(value: unknown): { placeholders: number; provisional: number; missingMedia: number } {
  const out = { placeholders: 0, provisional: 0, missingMedia: 0 };
  const walk = (v: unknown, key?: string) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x));
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.copyStatus === "placeholder") out.placeholders++;
      if (o.copyStatus === "provisional") out.provisional++;
      for (const [k, x] of Object.entries(o)) {
        if (k === "images" && x && typeof x === "object") {
          for (const slot of "abcdefghi") if (!(x as Record<string, unknown>)[slot]) out.missingMedia++;
        } else walk(x, k);
      }
      return;
    }
    if (v === null && key && ["image", "poster", "logo", "video", "sequence"].includes(key)) out.missingMedia++;
  };
  walk(value);
  return out;
}

export async function getSectionStates(): Promise<SectionState[]> {
  const rows = await db.siteSection.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return SECTION_KEYS.map((key) => {
    const row = byKey.get(key);
    const content = row ? row.published ?? row.draft : defaultSection(key);
    const invalid = !!row && !sectionSchemas[key].safeParse(row.draft).success;
    return {
      key,
      fromDefault: !row,
      invalid,
      published: !!row?.published,
      draftChanges: !!row && (!row.published || stableStringify(row.draft) !== stableStringify(row.published)),
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
      publishedAt: row?.publishedAt ?? null,
      ...analyze(content),
    };
  });
}
