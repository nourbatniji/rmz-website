"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importBuiltInContent } from "@/lib/admin/section-actions";
import { btnCls } from "./form/FormFields";

export function ImportBuiltInButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={btnCls}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await importBuiltInContent();
            if (!r.ok) setError(r.error ?? "Import failed.");
            else router.refresh();
          })
        }
      >
        {pending ? "Importing…" : "Import built-in content"}
      </button>
      {error && <span className="text-sm text-bad">{error}</span>}
    </div>
  );
}
