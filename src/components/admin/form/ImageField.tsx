"use client";

import { useId, useState } from "react";
import type { MediaRecord } from "@/lib/admin/media-types";
import { uploadFile } from "@/lib/admin/upload-client";
import { btnCls, FieldShell, inputCls } from "./FormFields";
import type { Obj } from "./spec";
import { useDrop } from "./useDrop";

/** Edits an ImageRef ({src, alt, width?, height?}) or null (= not delivered yet, the site shows a labelled placeholder). */
export function ImageField({ label, help, error, value, onChange, removeLabel = "Remove", emptyText = "Drop an image here", noAlt }: { label: string; help?: string; error?: string; value: Obj | null; onChange: (v: Obj | null) => void; removeLabel?: string; emptyText?: string; noAlt?: boolean }) {
  const id = useId();
  const [busy, setBusy] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const src = typeof value?.src === "string" ? value.src : "";
  const alt = typeof value?.alt === "string" ? value.alt : "";

  const apply = (m: Pick<MediaRecord, "url" | "width" | "height" | "alt">) =>
    onChange({ src: m.url, alt: alt || m.alt || "", ...(m.width ? { width: m.width } : {}), ...(m.height ? { height: m.height } : {}) });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    setBusy(0);
    try {
      apply(await uploadFile(file, setBusy));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  const drop = useDrop("image/", (f) => void onFile(f), setLocalError, busy !== null);

  return (
    <FieldShell label={label} help={help} error={error ?? localError ?? undefined} htmlFor={id}>
      <div {...drop.props} className={`grid gap-3 rounded-lg border p-3 transition-colors sm:grid-cols-[132px_minmax(0,1fr)] ${drop.over ? "border-accent bg-accent/10 ring-2 ring-accent/40" : "border-fg/15 bg-fg/[0.03]"}`}>
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-dashed border-fg/25 bg-white text-center text-xs text-fg/50">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            drop.over ? "Drop to upload" : emptyText
          )}
        </div>
        <div className="grid content-start gap-2">
          <div className="flex flex-wrap gap-2">
            <label className={`${btnCls} cursor-pointer`}>
              {busy === null ? "Upload or drop a file" : `Uploading ${busy}%`}
              <input type="file" className="sr-only" accept="image/*" disabled={busy !== null} onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            {value && (
              <button type="button" className={btnCls} onClick={() => onChange(null)}>
                {removeLabel}
              </button>
            )}
          </div>
          <input id={id} type="text" value={src} placeholder="/media/… or https://…" aria-label={`${label} URL`} onChange={(e) => (e.target.value ? onChange({ ...(value ?? {}), src: e.target.value, alt }) : onChange(null))} className={inputCls} />
          {value && !noAlt && <input type="text" value={alt} placeholder="Alt text: describe the image for screen readers" aria-label={`${label} alt text`} onChange={(e) => onChange({ ...value, alt: e.target.value })} className={inputCls} />}
        </div>
      </div>
    </FieldShell>
  );
}
