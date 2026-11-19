"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importDemoProjects } from "@/lib/admin/project-actions";
import { secondaryBtn } from "./ui";

/** First-run helper: copies the built-in demo projects into the database so they can be edited. */
export function ProjectRowActions() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={secondaryBtn}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await importDemoProjects();
            if (!r.ok) setError(r.error ?? "Import failed.");
            else router.refresh();
          })
        }
      >
        {pending ? "Importing…" : "Import the demo projects to edit them"}
      </button>
      {error && <span className="text-sm text-bad">{error}</span>}
    </div>
  );
}
