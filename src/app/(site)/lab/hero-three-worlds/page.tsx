import type { Metadata } from "next";
import { Suspense } from "react";
import { getHomepageContent } from "@/lib/content/homepage";
import { HeroThreeWorlds } from "@/components/home/hero/HeroThreeWorlds";

/** Lab route for the Three Worlds hero (not linked, not indexed): the SAME component as the homepage, with the review controls (Replay / stages) and ?ghost switched on. */
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
      <HeroThreeWorlds hero={hero} ghostBanner={ghostBanner} preview sessionKey="rmz-hero-three-worlds-opening" />
      {/* preview only: room to scroll so the image frames can be driven */}
      <section id="work" className="flex h-[160svh] items-start bg-ink px-(--gutter) pt-24">
        <p className="t-meta text-[11px] text-cream/60">Prototype — the rest of the homepage follows here.</p>
      </section>
    </main>
  );
}
