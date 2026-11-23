import type { Metadata } from "next";
import { Suspense } from "react";
import { getHomepageContent } from "@/lib/content/homepage";
import { HeroThreeWorlds } from "@/components/home/hero-worlds/HeroThreeWorlds";

/** Preview-only prototype of hero concept 04 "Three Worlds" (not linked, not indexed). The homepage hero is unchanged. */
export const metadata: Metadata = { title: "RMZ — HERO / THREE WORLDS (prototype)", robots: { index: false, follow: false } };

export default function Page({ searchParams }: { searchParams: Promise<{ ghost?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({ searchParams }: { searchParams: Promise<{ ghost?: string }> }) {
  const { hero } = await getHomepageContent();
  const { ghost } = await searchParams; // preview-only review aid: ?ghost=1|2 fills the word with another existing banner's image (default: the first banner)
  const ghostBanner = Math.max(0, Math.min(hero.banners.length - 1, Number(ghost) || 0));
  return (
    <main id="top">
      <HeroThreeWorlds hero={hero} ghostBanner={ghostBanner} />
      {/* preview only: room to scroll so the image frames can be driven */}
      <section id="work" className="flex h-[160svh] items-start bg-ink px-(--gutter) pt-24">
        <p className="t-meta text-[11px] text-cream/60">Prototype — the rest of the homepage follows here.</p>
      </section>
    </main>
  );
}
