import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { isSectionKey } from "@/lib/admin/section-meta";
import { requireAdmin } from "@/lib/admin/session";

/** Admin preview of draft content. `?section=hero` shows only that section (used beside the editor); no query shows the whole homepage. */
export default function PreviewPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Draft searchParams={searchParams} />
    </Suspense>
  );
}

async function Draft({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAdmin();
  const { section } = await searchParams;
  return <HomePage draft only={section && isSectionKey(section) ? section : undefined} />;
}
