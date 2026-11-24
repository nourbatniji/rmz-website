import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkArchive } from "@/components/work/WorkArchive";
import { Footer } from "@/components/home/footer/Footer";
import { getCollectiveContent, getFooterContent } from "@/lib/content/closing";
import { getWorkContent } from "@/lib/content/work";
import { MagneticLab } from "@/components/lab-collab/MagneticLab";

/** Lab: the magnetic-logo Collaborations prototype between the real preceding (work archive) and following (footer) sections. Not linked, not indexed. Production section unchanged. */
export const metadata: Metadata = { title: "RMZ — COLLABORATIONS (MAGNETIC) LAB", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}

async function Lab() {
  const { projects, ...work } = await getWorkContent();
  const [content, footer] = await Promise.all([getCollectiveContent(), getFooterContent()]);
  const before = (
    <WorkArchive
      {...work}
      projects={projects.map(({ slug, number, name, category, discipline, year, client, services, palette, image }) => ({ slug, number, name, category, discipline, year, client, services, palette, image }))}
    />
  );
  return (
    <Suspense fallback={null}>
      <MagneticLab content={content} before={before} after={<Footer content={footer} />} />
    </Suspense>
  );
}
