import { DevSectionPlaceholder } from "@/components/home/DevSectionPlaceholder";
import { ShowreelCorridor } from "@/components/home/corridor/ShowreelCorridor";
import { HeroWall } from "@/components/home/hero/HeroWall";
import { ServicesLens } from "@/components/home/lens/ServicesLens";
import { Minds } from "@/components/home/minds/Minds";
import { StatementRotator } from "@/components/home/statement/StatementRotator";
import { getHomepageContent } from "@/lib/content/homepage";

/**
 * Homepage in the approved canvas order:
 * hero → showreel corridor → statement → featured work → services lens → Minds → collaborations → footer.
 * Sections not built yet are compact dev markers (DevSectionPlaceholder).
 */
export default async function Home() {
  const { hero, corridor, statement, services, lens, minds } = await getHomepageContent();
  return (
    <main id="top">
      <HeroWall hero={hero} />
      <ShowreelCorridor content={corridor} />
      <StatementRotator statement={statement} />
      <DevSectionPlaceholder label="Featured work (canvas “About”)" />
      <ServicesLens content={lens} services={services} />
      <Minds content={minds} />
      <DevSectionPlaceholder label="Collaborations" />
      <DevSectionPlaceholder id="contact" label="Footer" />
    </main>
  );
}
