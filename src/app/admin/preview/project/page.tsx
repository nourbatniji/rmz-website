import { Suspense } from "react";
import { ProjectLivePreview } from "@/components/admin/ProjectLivePreview";
import { requireAdmin } from "@/lib/admin/session";

/** Admin-only frame that shows a project page from the editor's CURRENT (even unsaved) form values, sent over postMessage. */
export default function ProjectPreviewPage() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  await requireAdmin();
  return <ProjectLivePreview />;
}
