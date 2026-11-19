import { notFound } from "next/navigation";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import type { Obj } from "@/components/admin/form/spec";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/session";

export const metadata = { title: "Edit project" };

export default async function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const row = await db.project.findUnique({ where: { id } });
  if (!row) notFound();
  return <ProjectEditor key={row.id} id={row.id} updatedAt={row.updatedAt.toISOString()} initial={{ name: row.name, slug: row.slug, category: row.category, status: row.status, body: row.body as Obj }} />;
}
