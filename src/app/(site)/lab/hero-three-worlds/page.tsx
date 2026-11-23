import type { Metadata } from "next";
import { Suspense } from "react";
import { getHomepageContent } from "@/lib/content/homepage";
import { HeroThreeWorlds } from "@/components/home/hero-worlds/HeroThreeWorlds";

/** Preview-only prototype of hero concept 04 "Three Worlds" (not linked, not indexed). The homepage hero is unchanged. */
export const metadata: Metadata = { title: "RMZ — HERO / THREE WORLDS (prototype)", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  const { hero } = await getHomepageContent();
  return (
    <main id="top">
      <HeroThreeWorlds hero={hero} />
      {/* preview only: room to scroll so the image frames can be driven */}
      <section id="work" className="flex h-[160svh] items-start bg-ink px-(--gutter) pt-24">
        <p className="t-meta text-[11px] text-cream/60">Prototype — the rest of the homepage follows here.</p>
      </section>
    </main>
  );
}
