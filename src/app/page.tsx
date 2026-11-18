import { HeroWall } from "@/components/home/hero/HeroWall";
import { getHomepageContent } from "@/lib/content/homepage";

export default async function Home() {
  const { hero } = await getHomepageContent();
  return (
    <main id="top">
      <HeroWall hero={hero} />
    </main>
  );
}
