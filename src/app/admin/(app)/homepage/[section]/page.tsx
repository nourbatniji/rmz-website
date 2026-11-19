import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/session";

/** Old address kept so bookmarks keep working. */
export default async function OldSectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireAdmin();
  const { section } = await params;
  redirect(`/admin/website/${encodeURIComponent(section)}`);
}
