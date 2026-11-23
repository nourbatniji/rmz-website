import type { Metadata } from "next";
import { Suspense } from "react";
import { getHomepageContent } from "@/lib/content/homepage";
import type { OrbitVariant } from "@/components/lens-orbit/OrbitServices";
import { PreviewShell } from "./PreviewShell";

/** Preview-only exploration (not linked from the site, not indexed). The homepage Services section is unchanged. */
export const metadata: Metadata = { title: "RMZ — EXISTING LENS / ORBITAL SERVICES", robots: { index: false, follow: false } };

export default function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const { lens, services } = await getHomepageContent();
  const initial: OrbitVariant = v === "B" || v === "M" ? v : "A";
  return <PreviewShell content={lens} services={services} initial={initial} />;
}
