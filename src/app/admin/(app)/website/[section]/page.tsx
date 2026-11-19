import { notFound } from "next/navigation";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { stableStringify, type Obj } from "@/components/admin/form/spec";
import { defaultSection, isSectionKey } from "@/lib/content/sections";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/session";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireAdmin();
  const { section } = await params;
  if (!isSectionKey(section)) notFound();
  const row = await db.siteSection.findUnique({ where: { key: section } });
  const initial = (row ? row.draft : defaultSection(section)) as Obj;
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
