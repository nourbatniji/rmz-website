"use client";

import { useId, useState } from "react";
import { uploadFile } from "@/lib/admin/upload-client";
import { btnCls, FieldShell, inputCls } from "./FormFields";
import type { Obj } from "./spec";
import { useDrop } from "./useDrop";

/** Edits a video reference ({src}) or null (= no video yet; the poster/placeholder is shown). */
export function VideoField({ label, help, error, value, onChange }: { label: string; help?: string; error?: string; value: Obj | null; onChange: (v: Obj | null) => void }) {
  const id = useId();
  const [busy, setBusy] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const src = typeof value?.src === "string" ? value.src : "";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    setBusy(0);
    try {
      onChange({ src: (await uploadFile(file, setBusy)).url });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  const drop = useDrop("video/", (f) => void onFile(f), setLocalError, busy !== null);

  return (
    <FieldShell label={label} help={help} error={error ?? localError ?? undefined} htmlFor={id}>
      <div {...drop.props} className={`grid gap-3 rounded-lg border p-3 transition-colors sm:grid-cols-[200px_minmax(0,1fr)] ${drop.over ? "border-accent bg-accent/10 ring-2 ring-accent/40" : "border-fg/15 bg-fg/[0.03]"}`}>
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-fg/25 bg-white text-center text-xs text-fg/50">
          {src ? <video src={src} className="h-full w-full object-cover" controls muted preload="metadata" /> : drop.over ? "Drop to upload" : "Drop a video here"}
        </div>
        <div className="grid content-start gap-2">
          <div className="flex flex-wrap gap-2">
            <label className={`${btnCls} cursor-pointer`}>
              {busy === null ? "Upload or drop MP4 / WebM" : `Uploading ${busy}%`}
              <input type="file" className="sr-only" accept="video/mp4,video/webm" disabled={busy !== null} onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            {value && (
              <button type="button" className={btnCls} onClick={() => onChange(null)}>
                Remove
              </button>
            )}
          </div>
          <input id={id} type="text" value={src} placeholder="/media/… or https://…" aria-label={`${label} URL`} onChange={(e) => (e.target.value ? onChange({ src: e.target.value }) : onChange(null))} className={inputCls} />
        </div>
      </div>
    </FieldShell>
  );
}
