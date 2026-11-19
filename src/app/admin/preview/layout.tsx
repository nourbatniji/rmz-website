import { Suspense } from "react";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { requireAdmin } from "@/lib/admin/session";
import { getHomepageContent } from "@/lib/content/homepage";

/** Admin-only preview of the public site with DRAFT content. Shown inside the editor's iframe. */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PreviewShell>{children}</PreviewShell>
    </Suspense>
  );
}

async function PreviewShell({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { site } = await getHomepageContent({ draft: true });
  return (
    <>
      <SiteHeader brand={site.brand} nav={site.nav} />
      {children}
    </>
  );
}
