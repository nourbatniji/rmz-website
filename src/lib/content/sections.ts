import "server-only";
import type { z } from "zod";
import { devHomepageContent as dev } from "@/content/dev/homepage";
import { devWorkContent as devWork } from "@/content/dev/work";
import { devClosingContent, devContactContent } from "@/content/dev/closing";
import type { CollaborationsContent } from "@/content/collab-types";
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
  collaborations: s.collaborationsSchema,
  contact: s.contactSchema,
  footer: s.footerSchema,
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
    case "collaborations":
      return defaultCollaborations();
    case "contact":
      return devContactContent;
    case "footer":
      return devClosingContent.footer;
    case "workIntro": {
      const { label, headingLead, headingEmphasis, intro, categories, emptyTitle, emptyBody, contact } = devWork;
      return { label, headingLead, headingEmphasis, intro, categories, emptyTitle, emptyBody, contact };
    }
  }
}

/** The approved prototype as the default: the twelve built-in placeholder marks, the red RMZ square with its lettering. */
export function defaultCollaborations(): CollaborationsContent {
  const c = devClosingContent.collective;
  return {
    visible: true,
    label: c.label,
    headingLead: c.headingLead,
    headingEmphasis: c.headingEmphasis,
    magnet: { label: "RMZ — gather the collaborations", artwork: null, background: "#D52518", artworkColor: "#F3E8CC", tint: false, artworkScale: 100 },
    partners: c.partners.map((p) => ({ id: p.mark, name: p.name, alt: p.name, logo: null, mark: p.mark, href: null, visible: true, scale: 100 })),
  };
}

export const ALL_SECTION_KEYS = SECTION_KEYS;
