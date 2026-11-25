import { notFound } from "next/navigation";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { stableStringify, type Obj } from "@/components/admin/form/spec";
import { defaultSection, isSectionKey } from "@/lib/content/sections";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/session";

const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** Older saved Top banner content has no description / link / per-banner headlines (the site shows built-in text for those). The editor shows what the site shows, so it can be edited. */
function withHeroDefaults(initial: Obj): Obj {
  const d = defaultSection("hero") as Obj;
  const out: Obj = { ...initial };
  for (const k of ["tagline", "ctaLabel", "ctaHref"] as const) if (blank(out[k])) out[k] = d[k];
  const defBanners = (Array.isArray(d.banners) ? d.banners : []) as Obj[];
  if (Array.isArray(out.banners)) {
    out.banners = (out.banners as Obj[]).map((b) => {
      const def = defBanners.find((x) => x.id === b.id);
      if (!def) return b;
      const nb: Obj = { ...b };
      for (const k of ["phraseLead", "phraseEmphasis"] as const) if (blank(nb[k])) nb[k] = def[k];
      return nb;
    });
  }
  return out;
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireAdmin();
  const { section } = await params;
  if (!isSectionKey(section)) notFound();
  const row = await db.siteSection.findUnique({ where: { key: section } });
  const base = (row ? row.draft : defaultSection(section)) as Obj;
  const initial = section === "hero" ? withHeroDefaults(base) : base;
  return (
    <SectionEditor
      key={section}
      sectionKey={section}
      initial={initial}
      status={{
        publishedSnapshot: row?.published ? stableStringify(row.published) : null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        updatedBy: row?.updatedBy ?? null,
        publishedAt: row?.publishedAt?.toISOString() ?? null,
        fromDefault: !row,
      }}
    />
  );
}
