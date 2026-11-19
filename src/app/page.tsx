import { DevSectionPlaceholder } from "@/components/home/DevSectionPlaceholder";
import { ShowreelCorridor } from "@/components/home/corridor/ShowreelCorridor";
import { HeroWall } from "@/components/home/hero/HeroWall";
import { ServiceFins } from "@/components/home/services/ServiceFins";
import { StatementRotator } from "@/components/home/statement/StatementRotator";
import { getHomepageContent } from "@/lib/content/homepage";

/**
 * Homepage in the approved canvas order:
 * hero → showreel corridor → statement → featured work → services dial → service fins → collaborations → footer.
 * Sections not built yet are compact dev markers (DevSectionPlaceholder).
 */
export default async function Home() {
  const { hero, corridor, statement, services, serviceFins } = await getHomepageContent();
  return (
    <main id="top">
      <HeroWall hero={hero} />
      <ShowreelCorridor content={corridor} services={services} />
      <StatementRotator statement={statement} />
      <DevSectionPlaceholder label="Featured work (canvas “About”)" />
      <DevSectionPlaceholder label="Services dial" />
      <ServiceFins content={serviceFins} services={services} />
      <DevSectionPlaceholder label="Collaborations" />
      <DevSectionPlaceholder id="contact" label="Footer" />
    </main>
  );
}
