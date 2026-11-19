"use client";

import { useId, useState } from "react";
import type { MediaRecord } from "@/lib/admin/media-types";
import { uploadFile } from "@/lib/admin/upload-client";
import { btnCls, FieldShell, inputCls } from "./FormFields";
import { MediaPicker } from "./MediaPicker";
import type { Obj } from "./spec";

/** Edits an ImageRef ({src, alt, width?, height?}) or null (= not delivered yet, the site shows a labelled placeholder). */
export function ImageField({ label, help, error, value, onChange }: { label: string; help?: string; error?: string; value: Obj | null; onChange: (v: Obj | null) => void }) {
  const id = useId();
  const [picker, setPicker] = useState(false);
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

  return (
    <FieldShell label={label} help={help} error={error ?? localError ?? undefined} htmlFor={id}>
      <div className="grid gap-3 rounded-lg border border-fg/15 bg-fg/[0.03] p-3 sm:grid-cols-[132px_minmax(0,1fr)]">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-dashed border-fg/25 bg-white text-center text-xs text-fg/50">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            "No image yet. The site shows a labelled placeholder."
          )}
        </div>
        <div className="grid content-start gap-2">
          <div className="flex flex-wrap gap-2">
            <label className={`${btnCls} cursor-pointer`}>
              {busy === null ? "Upload" : `Uploading ${busy}%`}
              <input type="file" className="sr-only" accept="image/*" disabled={busy !== null} onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button type="button" className={btnCls} onClick={() => setPicker(true)}>
              Library
            </button>
            {value && (
              <button type="button" className={btnCls} onClick={() => onChange(null)}>
                Remove
              </button>
            )}
          </div>
          <input id={id} type="text" value={src} placeholder="/media/… or https://…" aria-label={`${label} URL`} onChange={(e) => (e.target.value ? onChange({ ...(value ?? {}), src: e.target.value, alt }) : onChange(null))} className={inputCls} />
          {value && <input type="text" value={alt} placeholder="Alt text: describe the image for screen readers" aria-label={`${label} alt text`} onChange={(e) => onChange({ ...value, alt: e.target.value })} className={inputCls} />}
        </div>
      </div>
      {picker && (
        <MediaPicker
          kind="image"
          onClose={() => setPicker(false)}
          onPick={(m) => {
            apply(m);
            setPicker(false);
          }}
        />
      )}
    </FieldShell>
  );
}
