import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/home/footer/Footer";
import { ProjectCase } from "@/components/work/ProjectCase";
import { getFooterContent } from "@/lib/content/closing";
import { getWorkContent, getWorkProject } from "@/lib/content/work";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const { projects } = await getWorkContent();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await getWorkProject(slug);
  if (!found) return {};
  return { title: `${found.project.name} — Work — Rebel Mind Zone`, description: found.project.about };
}

export default async function WorkProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const found = await getWorkProject(slug);
  if (!found) notFound();
  const { projects } = await getWorkContent();
  const seed = projects.findIndex((p) => p.slug === slug);
  const footer = await getFooterContent();
  return (
    <>
      <ProjectCase project={found.project} prev={found.prev} next={found.next} contact={found.contact} seed={seed} />
      <Footer content={footer} />
    </>
  );
}
