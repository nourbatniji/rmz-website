import { Suspense } from "react";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { getHomepageContent } from "@/lib/content/homepage";

/**
 * Public site shell: fixed header over every public page.
 * The content read sits inside <Suspense> so that if the database is unavailable the site (and the build) still works:
 * the content then falls back to the built-in copy instead of the whole page failing. With a healthy database nothing changes.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SiteShell>{children}</SiteShell>
    </Suspense>
  );
}

async function SiteShell({ children }: { children: React.ReactNode }) {
  const { site } = await getHomepageContent();
  return (
    <>
      <SiteHeader brand={site.brand} nav={site.nav} />
      {children}
    </>
  );
}
