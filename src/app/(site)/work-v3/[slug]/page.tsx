import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterUnfold } from "@/components/home/footer/FooterUnfold";
import { ProjectPageV3 } from "@/components/work-v3/ProjectPageV3";
import { getFooterContent } from "@/lib/content/closing";
import { getProject, projects } from "@/content/work-v3/projects";

/**
 * Project Details V3 prototype — /work-v3/[slug]. Separate from /work/[slug] (the existing page) and the earlier prototypes.
 * Content is the small typed data in src/content/work-v3; the site header (via the (site) layout) and the RMZ footer are reused as they are.
 */
type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  return p ? { title: `${p.name} — Work (V3 prototype) — Rebel Mind Zone`, description: p.brief } : {};
}

export default async function WorkV3Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const next = getProject(project.next)!;
  const footer = await getFooterContent();
  return (
    <>
      <ProjectPageV3 project={project} next={next} />
      <FooterUnfold solo content={footer} />
    </>
  );
}
