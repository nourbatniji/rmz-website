import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { getMediaUsage } from "@/lib/admin/media-actions";
import type { MediaRecord } from "@/lib/admin/media-types";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/session";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  await requireAdmin();
  const [rows, usage] = await Promise.all([db.media.findMany({ orderBy: { createdAt: "desc" }, take: 500 }), getMediaUsage()]);
  const items: MediaRecord[] = rows.map((r) => ({ ...r, kind: r.kind === "video" ? "video" : "image", createdAt: r.createdAt.toISOString() }));
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight">Media</h1>
      <p className="mb-5 mt-1 text-sm text-fg/60">Every image and video you have uploaded. To use one, pick it from the library inside any section or project.</p>
      <MediaLibrary initial={items} usage={usage} tokenReady={!!process.env.BLOB_READ_WRITE_TOKEN} />
    </div>
  );
}
