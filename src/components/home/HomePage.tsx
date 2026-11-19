import { Collective } from "@/components/home/collective/Collective";
import { SiteHeader } from "@/components/shell/SiteHeader";
import type { SectionKey } from "@/lib/admin/section-meta";
import { Footer } from "@/components/home/footer/Footer";
import { FeaturedWorkFocus } from "@/components/home/featured/FeaturedWorkFocus";
import { ShowreelCorridor } from "@/components/home/corridor/ShowreelCorridor";
import { HeroWall } from "@/components/home/hero/HeroWall";
import { ServicesLens } from "@/components/home/lens/ServicesLens";
import { Minds } from "@/components/home/minds/Minds";
import { StatementRotator } from "@/components/home/statement/StatementRotator";
import { WorkArchive } from "@/components/work/WorkArchive";
import { getCollectiveContent, getFooterContent } from "@/lib/content/closing";
import { getHomepageContent } from "@/lib/content/homepage";
import { getWorkContent } from "@/lib/content/work";

/**
 * Homepage in the approved canvas order:
 * hero → showreel corridor → statement → featured work (canvas "About": pinned flipping cards) → services lens → Minds → work archive (links to /work/[slug]) → collaborations → footer.
 * Sections not built yet are compact dev markers (DevSectionPlaceholder, currently none).
 *
 * `draft` = admin preview: reads the unpublished draft content instead of the published content.
 * `only` = admin preview of ONE section on its own (the editor shows just the section being edited). Never used by the public site.
 */
export async function HomePage({ draft = false, only }: { draft?: boolean; only?: SectionKey }) {
  const { site, hero, corridor, statement, services, lens, minds, featured } = await getHomepageContent({ draft });
  const { projects, ...work } = await getWorkContent({ draft });
  const [collective, footer] = await Promise.all([getCollectiveContent(), getFooterContent()]);
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
      hero: <HeroWall hero={hero} />,
      corridor: <>{header}<ShowreelCorridor content={corridor} /></>,
      statement: <StatementRotator statement={statement} />,
      featured: <>{header}<FeaturedWorkFocus content={featured} /></>,
      services: <ServicesLens content={lens} services={services} />,
      lens: <ServicesLens content={lens} services={services} />,
      minds: <Minds content={minds} />,
      workIntro: <>{header}{archive}</>,
    }[only];
    return <main id="top">{one}</main>;
  }
  return (
    <main id="top">
      <HeroWall hero={hero} />
      <ShowreelCorridor content={corridor} />
      <StatementRotator statement={statement} />
      <FeaturedWorkFocus content={featured} />
      <ServicesLens content={lens} services={services} />
      <Minds content={minds} />
      {archive}
      <Collective content={collective} />
      <Footer content={footer} />
    </main>
  );
}
