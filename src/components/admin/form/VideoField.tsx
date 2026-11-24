"use client";

import { useId, useState } from "react";
import { uploadFile } from "@/lib/admin/upload-client";
import { btnCls, FieldShell, inputCls } from "./FormFields";
import { MediaPicker } from "./MediaPicker";
import type { Obj } from "./spec";

/** Edits a video reference ({src}) or null (= no video yet; the poster/placeholder is shown). */
export function VideoField({ label, help, error, value, onChange }: { label: string; help?: string; error?: string; value: Obj | null; onChange: (v: Obj | null) => void }) {
  const id = useId();
  const [picker, setPicker] = useState(false);
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

  return (
    <FieldShell label={label} help={help} error={error ?? localError ?? undefined} htmlFor={id}>
      <div className="grid gap-3 rounded-lg border border-fg/15 bg-fg/[0.03] p-3 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-fg/25 bg-white text-center text-xs text-fg/50">
          {src ? <video src={src} className="h-full w-full object-cover" controls muted preload="metadata" /> : "No video yet"}
        </div>
        <div className="grid content-start gap-2">
          <div className="flex flex-wrap gap-2">
            <label className={`${btnCls} cursor-pointer`}>
              {busy === null ? "Upload MP4 or WebM" : `Uploading ${busy}%`}
              <input type="file" className="sr-only" accept="video/mp4,video/webm" disabled={busy !== null} onChange={(e) => onFile(e.target.files?.[0])} />
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
          <input id={id} type="text" value={src} placeholder="/media/… or https://…" aria-label={`${label} URL`} onChange={(e) => (e.target.value ? onChange({ src: e.target.value }) : onChange(null))} className={inputCls} />
        </div>
      </div>
      {picker && (
        <MediaPicker
          kind="video"
          onClose={() => setPicker(false)}
          onPick={(m) => {
            onChange({ src: m.url });
            setPicker(false);
          }}
        />
      )}
    </FieldShell>
  );
}
