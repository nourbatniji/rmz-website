"use client";

import { useState } from "react";
import { naturalSort, uploadFile } from "@/lib/admin/upload-client";
import { btnCls, FieldShell } from "./FormFields";
import type { Obj } from "./spec";

/**
 * Edits a hero image sequence. Drop numbered frames; they are uploaded and ordered by file name (frame-2 before frame-10).
 * Stored as an explicit frame list. An existing numbered-URL pattern is shown read-only until replaced.
 */
export function SequenceField({ label, help, error, value, onChange }: { label: string; help?: string; error?: string; value: Obj | null; onChange: (v: Obj | null) => void }) {
  const [done, setDone] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const frames = Array.isArray(value?.frames) ? (value.frames as string[]) : null;
  const pattern = typeof value?.pattern === "string" ? value : null;
  const busy = done !== null;

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = naturalSort(Array.from(list));
    setLocalError(null);
    setTotal(files.length);
    setDone(0);
    const urls: string[] = new Array(files.length);
    let next = 0;
    let finished = 0;
    try {
      // 4 uploads at a time; results keep their sorted position.
      await Promise.all(
        Array.from({ length: Math.min(4, files.length) }, async () => {
          while (next < files.length) {
            const i = next++;
            urls[i] = (await uploadFile(files[i])).url;
            setDone(++finished);
          }
        }),
      );
      onChange({ frames: urls });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setDone(null);
    }
  }

  return (
    <FieldShell label={label} help={help} error={error ?? localError ?? undefined}>
      <div className="grid gap-3 rounded-lg border border-fg/15 bg-fg/[0.03] p-3">
        {frames && (
          <>
            <p className="text-sm text-fg/80">{frames.length} frames</p>
            <ul className="flex gap-1.5 overflow-hidden" aria-label="First frames">
              {frames.slice(0, 8).map((f, i) => (
                <li key={f + i} className="h-14 w-20 shrink-0 overflow-hidden rounded border border-fg/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f} alt="" className="h-full w-full object-cover" loading="lazy" />
                </li>
              ))}
            </ul>
          </>
        )}
        {pattern && <p className="text-sm text-fg/80">Numbered files: <code className="text-fg">{String(pattern.pattern)}</code> · {String(pattern.frameCount)} frames. Upload frames to replace.</p>}
        {!value && <p className="text-sm text-fg/60">No sequence yet. The poster is shown on its own.</p>}
        <div className="flex flex-wrap gap-2">
          <label className={`${btnCls} cursor-pointer`}>
            {busy ? `Uploading ${done} of ${total}…` : value ? "Replace frames" : "Upload frames"}
            <input type="file" multiple className="sr-only" accept="image/webp,image/jpeg,image/png,image/avif" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
          </label>
          {value && (
            <button type="button" className={btnCls} disabled={busy} onClick={() => onChange(null)}>
              Remove sequence
            </button>
          )}
        </div>
        <p className="text-xs text-fg/50">Select all frames at once. Name them in order (frame-01, frame-02…). WebP, about 1440 px wide.</p>
      </div>
    </FieldShell>
  );
}
