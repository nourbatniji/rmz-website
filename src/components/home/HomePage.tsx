import { Collaborations } from "@/components/home/collaborations/Collaborations";
import { SiteHeader } from "@/components/shell/SiteHeader";
import type { SectionKey } from "@/lib/admin/section-meta";
import { ContactReveal } from "@/components/home/contact/ContactReveal";
import { ClosingCover } from "@/components/home/footer/ClosingCover";
import { FooterUnfold } from "@/components/home/footer/FooterUnfold";
import { AboutScrubber } from "@/components/home/about/AboutScrubber";
import { ShowreelCorridor } from "@/components/home/corridor/ShowreelCorridor";
import { HeroThreeWorlds } from "@/components/home/hero/HeroThreeWorlds";
import { ServicesOrbit } from "@/components/home/services-orbit/ServicesOrbit";
import { Minds } from "@/components/home/minds/Minds";
import { StatementRotator } from "@/components/home/statement/StatementRotator";
import { WorkArchive } from "@/components/work/WorkArchive";
import { getFooterContent } from "@/lib/content/closing";
import { getCollaborationsContent, getHomepageContent } from "@/lib/content/homepage";
import { getWorkContent } from "@/lib/content/work";

/**
 * Homepage in the approved canvas order:
 * hero → showreel corridor → statement → About (scroll-linked scrubber, Journey V2 layout) → services (orbital lens) → Minds → work archive (links to /work/[slug]) → collaborations → contact form (C01-D aperture reveal, the footer's curtain) → footer.
 * Sections not built yet are compact dev markers (DevSectionPlaceholder, currently none).
 *
 * `draft` = admin preview: reads the unpublished draft content instead of the published content.
 * `only` = admin preview of ONE section on its own (the editor shows just the section being edited). Never used by the public site.
 */
export async function HomePage({ draft = false, only }: { draft?: boolean; only?: SectionKey }) {
  const { site, hero, corridor, statement, services, lens, minds, featured } = await getHomepageContent({ draft });
  const { projects, ...work } = await getWorkContent({ draft });
  const [collaborations, footer] = await Promise.all([getCollaborationsContent({ draft }), getFooterContent()]);
  const archive = (
    <WorkArchive
      {...work}
      projects={projects.map(({ slug, number, name, category, discipline, year, client, services, palette, image }) => ({ slug, number, name, category, discipline, year, client, services, palette, image }))}
    />
  );
  if (only) {
    // The pinned (scroll-driven) sections leave room for the fixed header, so they get it in the preview as on the real site.
    const header = <SiteHeader brand={site.brand} nav={site.nav} />;
    const one = {
      site: <div className="h-[130px] bg-black"><SiteHeader brand={site.brand} nav={site.nav} /></div>,
      hero: <HeroThreeWorlds hero={hero} />,
      corridor: <>{header}<ShowreelCorridor content={corridor} /></>,
      statement: <StatementRotator statement={statement} />,
      featured: <>{header}<AboutScrubber content={featured} /></>,
      services: <>{header}<ServicesOrbit content={lens} services={services} /></>,
      lens: <>{header}<ServicesOrbit content={lens} services={services} /></>,
      minds: <Minds content={minds} />,
      workIntro: <>{header}{archive}</>,
      collaborations: <Collaborations content={collaborations} />,
    }[only];
    return <main id="top">{one}</main>;
  }
  return (
    <main id="top">
      <HeroThreeWorlds hero={hero} />
      <ShowreelCorridor content={corridor} />
      <StatementRotator statement={statement} />
      <AboutScrubber content={featured} />
      <ServicesOrbit content={lens} services={services} />
      <Minds content={minds} />
      {archive}
      <FooterUnfold cover={<ClosingCover logos={<Collaborations content={collaborations} />} form={<ContactReveal />} />} content={footer} />
    </main>
  );
}
