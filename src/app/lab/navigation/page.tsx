import type { Metadata } from "next";
import { Suspense } from "react";
import { getHomepageContent } from "@/lib/content/homepage";
import { NavLab } from "@/components/lab-nav/NavLab";

/**
 * Lab: four navigation prototypes over the real hero. Deliberately OUTSIDE the (site) route group so the production header is not rendered here.
 * Not linked, not indexed. The production navbar and homepage are unchanged.
 */
export const metadata: Metadata = { title: "RMZ — NAVIGATION LAB", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}

async function Lab() {
  const { site, hero } = await getHomepageContent();
  return (
    <Suspense fallback={null}>
      <NavLab hero={hero} site={site} />
    </Suspense>
  );
}
