import "server-only";
import type { z } from "zod";
import { devHomepageContent as dev } from "@/content/dev/homepage";
import { devWorkContent as devWork } from "@/content/dev/work";
import * as s from "@/content/schemas";
import { SECTION_KEYS, type SectionKey } from "@/lib/admin/section-meta";

export { SECTION_KEYS, isSectionKey } from "@/lib/admin/section-meta";
export type { SectionKey } from "@/lib/admin/section-meta";

export const sectionSchemas: Record<SectionKey, z.ZodType<unknown>> = {
  site: s.siteSchema,
  hero: s.heroSchema,
  corridor: s.corridorSchema,
  statement: s.statementSchema,
  featured: s.featuredSchema,
  services: s.servicesSchema,
  lens: s.lensSchema,
  minds: s.mindsSchema,
  workIntro: s.workIntroSchema,
};

/** Built-in content (the dev files). Used when the database has nothing valid for a section, and by "Reset to default". */
export function defaultSection(key: SectionKey): unknown {
  switch (key) {
    case "site":
      return dev.site;
    case "hero":
      return dev.hero;
    case "corridor":
      return dev.corridor;
    case "statement":
      return dev.statement;
    case "featured":
      return dev.featured;
    case "services":
      return { items: dev.services };
    case "lens":
      return dev.lens;
    case "minds":
      return dev.minds;
    case "workIntro": {
      const { label, headingLead, headingEmphasis, intro, categories, emptyTitle, emptyBody, contact } = devWork;
      return { label, headingLead, headingEmphasis, intro, categories, emptyTitle, emptyBody, contact };
    }
  }
}

export const ALL_SECTION_KEYS = SECTION_KEYS;
