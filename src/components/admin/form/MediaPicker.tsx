"use client";

import { useEffect, useRef, useState } from "react";
import { listMedia } from "@/lib/admin/media-actions";
import type { MediaRecord } from "@/lib/admin/media-types";
import { uploadFile } from "@/lib/admin/upload-client";
import { btnCls } from "./FormFields";

/** Modal that lists the media library and lets the editor pick or upload a file. */
export function MediaPicker({ kind, onPick, onClose }: { kind: "image" | "video"; onPick: (m: MediaRecord) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    let alive = true;
    listMedia(kind)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setError("Couldn't load the library."));
    return () => {
      alive = false;
    };
  }, [kind]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      onPick(await uploadFile(file, setProgress));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setProgress(null);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(920px,92vw)] rounded-xl border border-fg/20 bg-white p-0 text-fg backdrop:bg-black/70">
      <div className="flex items-center gap-3 border-b border-fg/10 px-5 py-3">
        <h2 className="text-base font-semibold">Media library</h2>
        <label className={`${btnCls} ml-auto cursor-pointer`}>
          {progress === null ? "Upload new" : `Uploading ${progress}%`}
          <input type="file" className="sr-only" accept={kind === "video" ? "video/mp4,video/webm" : "image/*"} onChange={(e) => onFile(e.target.files?.[0])} disabled={progress !== null} />
        </label>
        <button type="button" className={btnCls} onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      {error && <p role="alert" className="px-5 pt-3 text-sm text-bad">{error}</p>}
      <div className="max-h-[70vh] overflow-auto p-5">
        {items === null && !error && <p className="text-sm text-fg/60">Loading…</p>}
        {items?.length === 0 && <p className="text-sm text-fg/60">Nothing here yet. Upload a file to start your library.</p>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items?.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick(m)} className="group block w-full overflow-hidden rounded-lg border border-fg/15 text-left hover:border-accent">
                <span className="block aspect-[4/3] bg-fg/5">
                  {m.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <video src={m.url} className="h-full w-full object-cover" preload="metadata" muted />
                  )}
                </span>
                <span className="block truncate px-2 py-1.5 text-xs text-fg/70">{m.pathname.replace(/^media\//, "")}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
