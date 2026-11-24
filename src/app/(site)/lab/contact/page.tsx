import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkArchive } from "@/components/work/WorkArchive";
import { getFooterContent } from "@/lib/content/closing";
import { getWorkContent } from "@/lib/content/work";
import { ContactLab } from "@/components/lab-contact/ContactLab";

/**
 * Lab: three restrained Contact-section prototypes (Ink, Cream, Quiet division) under the real site header, after the real work archive (the section that precedes the footer/contact on the homepage).
 * Not linked, not indexed. The production footer / contact section and the homepage are unchanged. The form is a local demo: nothing is sent or stored.
 */
export const metadata: Metadata = { title: "RMZ — CONTACT LAB", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}

async function Lab() {
  const { projects, ...work } = await getWorkContent();
  const footer = await getFooterContent();
  const before = (
    <WorkArchive
      {...work}
      projects={projects.map(({ slug, number, name, category, discipline, year, client, services, palette, image }) => ({ slug, number, name, category, discipline, year, client, services, palette, image }))}
    />
  );
  return (
    <Suspense fallback={null}>
      <ContactLab footer={footer} before={before} />
    </Suspense>
  );
}
