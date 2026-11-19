import Link from "next/link";
import { NewProjectDialog } from "@/components/admin/NewProjectForm";
import { ProjectList, type ProjectRow } from "@/components/admin/ProjectList";
import { ProjectRowActions } from "@/components/admin/ProjectRowActions";
import { PROJECT_CATEGORIES } from "@/components/admin/form/section-specs";
import { card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ new?: string; status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await db.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, slug: true, category: true, status: true, body: true, updatedAt: true, updatedBy: true },
  });
  const label = (c: string) => PROJECT_CATEGORIES.find((x) => x.value === c)?.label ?? c;
  const list: ProjectRow[] = rows.map((r) => {
    const img = (r.body as { image?: { src?: unknown } | null } | null)?.image?.src;
    return { id: r.id, name: r.name, slug: r.slug, category: r.category, categoryLabel: label(r.category), status: r.status as "draft" | "published", cover: typeof img === "string" ? img : null, updatedAt: r.updatedAt.toISOString(), updatedBy: r.updatedBy };
  });
  const published = list.filter((p) => p.status === "published").length;
  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-0.5 text-sm text-fg/60">
            {list.length} project{list.length === 1 ? "" : "s"}, {published} published. Published projects appear in the work archive and get their own page. Choosing which projects are <em>featured</em> on the homepage is done in{" "}
            <Link href="/admin/website/featured" className="text-accent underline underline-offset-2">
              Website › Featured projects
            </Link>
            .
          </p>
        </div>
        <div className="ml-auto">
          <NewProjectDialog categories={PROJECT_CATEGORIES} defaultOpen={sp.new === "1"} />
        </div>
      </header>
      {list.length === 0 ? (
        <section className={`${card} p-5`}>
          <p className="text-sm text-fg/80">No projects yet, so the website is showing its built-in demo projects. Add your first project, or copy the demo ones here to edit them.</p>
          <ProjectRowActions />
        </section>
      ) : (
        <ProjectList initial={list} categories={PROJECT_CATEGORIES} initialStatus={sp.status === "draft" || sp.status === "published" ? sp.status : "all"} />
      )}
    </div>
  );
}
