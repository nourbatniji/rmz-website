"use client";

import type { PageElement } from "@/lib/work-layout";
import { ImageField } from "./form/ImageField";
import type { PartApi } from "./part-api";

/**
 * One picture on the project page. Carries the same number and name as the red tag on that picture in the live preview.
 * Hover it to outline the picture in the preview; click the picture in the preview to jump here.
 */
export function SlotCard({ e, n, api, onActive, flashId }: { e: PageElement; n: number; api: PartApi; onActive?: (id: string | null) => void; flashId?: string | null }) {
  const deleted = api.hidden.has(e.id);
  const image = api.imageOf(e.id);
  return (
    <div
      id={`slot-${e.id}`}
      onMouseEnter={() => onActive?.(e.id)}
      onMouseLeave={() => onActive?.(null)}
      onFocusCapture={() => onActive?.(e.id)}
      onBlurCapture={() => onActive?.(null)}
      title={[e.where, e.ratio && `Best shape ${e.ratio}`].filter(Boolean).join(" · ") || undefined}
      className={`min-w-0 scroll-mt-44 rounded-xl border p-3 transition-shadow ${deleted ? "border-fg/10 bg-fg/[0.03]" : "border-fg/15 bg-white"} ${flashId === e.id ? "ring-4 ring-accent/60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${deleted ? "bg-fg/30" : "bg-accent"}`}>
          {n}
        </span>
        <p className={`min-w-0 flex-1 text-sm font-bold ${deleted ? "line-through opacity-55" : ""}`}>{e.label}</p>
        <button
          type="button"
          role="switch"
          aria-checked={!deleted}
          aria-label={`${e.label}: ${deleted ? "deleted from the page" : "on the page"}`}
          onClick={() => api.setHidden(e.id, !deleted)}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${deleted ? "border-fg/25 text-fg/70 hover:bg-fg/5" : "border-ok/40 bg-ok/10 text-ok"}`}
        >
          <span aria-hidden className={`h-2 w-2 rounded-full ${deleted ? "bg-fg/30" : "bg-ok"}`} />
          {deleted ? "Deleted · Restore" : "On the page · Delete"}
        </button>
      </div>
      {!deleted && (
        <div className="mt-3">
          <ImageField label={`Upload for picture ${n}`} value={image} onChange={(next) => api.setImage(e.id, next)} removeLabel="Clear" emptyText="Drop an image here" />
        </div>
      )}
    </div>
  );
}
