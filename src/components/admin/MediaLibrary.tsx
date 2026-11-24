"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteMedia, replaceMedia, updateMediaAlt, type MediaUse } from "@/lib/admin/media-actions";
import { fmtDate } from "@/lib/admin/format";
import type { MediaRecord } from "@/lib/admin/media-types";
import { uploadFile } from "@/lib/admin/upload-client";
import { inputCls } from "./form/FormFields";
import { card, ConfirmDialog, primaryBtn, secondaryBtn } from "./ui";

type Job = { key: number; name: string; pct: number; error?: string; done?: boolean };
type Filter = "all" | "image" | "video";
type Sort = "newest" | "oldest" | "name" | "size";
type View = "grid" | "list";
const ACCEPT = "image/*,video/mp4,video/webm";
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b < 1024 * 1024 ? 2 : 1)} MB`;
const nameOf = (m: MediaRecord) => m.pathname.replace(/^media\//, "");
const typeOf = (m: MediaRecord) => m.mime.replace(/^(image|video)\//, "").toUpperCase().replace("SVG+XML", "SVG");

function Thumb({ m, className = "" }: { m: MediaRecord; className?: string }) {
  return m.kind === "image" ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.url} alt={m.alt ?? ""} className={`object-cover ${className}`} loading="lazy" />
  ) : (
    <video src={m.url} className={`object-cover ${className}`} preload="metadata" muted />
  );
}

export function MediaLibrary({ initial, usage: initialUsage, tokenReady }: { initial: MediaRecord[]; usage: Record<string, MediaUse[]>; tokenReady: boolean }) {
  const [items, setItems] = useState(initial);
  const [usage, setUsage] = useState(initialUsage);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<View>("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [over, setOver] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const seq = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((m) => (filter === "all" || m.kind === filter) && (!unusedOnly || !(usage[m.id] ?? []).length) && (!q || m.pathname.toLowerCase().includes(q) || (m.alt ?? "").toLowerCase().includes(q)));
    const by: Record<Sort, (a: MediaRecord, b: MediaRecord) => number> = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      name: (a, b) => nameOf(a).localeCompare(nameOf(b)),
      size: (a, b) => b.bytes - a.bytes,
    };
    return [...list].sort(by[sort]);
  }, [items, query, filter, unusedOnly, sort, usage]);
  const counts = { all: items.length, image: items.filter((m) => m.kind === "image").length, video: items.filter((m) => m.kind === "video").length };
  const unusedCount = items.filter((m) => !(usage[m.id] ?? []).length).length;
  const detail = items.find((m) => m.id === detailId) ?? null;

  async function onFiles(list: FileList | File[] | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    setError(null);
    setNotice(null);
    const batch = files.map((f) => ({ f, job: { key: ++seq.current, name: f.name, pct: 0 } as Job }));
    setJobs((j) => [...batch.map((b) => b.job), ...j]);
    const patch = (key: number, p: Partial<Job>) => setJobs((j) => j.map((x) => (x.key === key ? { ...x, ...p } : x)));
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(2, batch.length) }, async () => {
        while (next < batch.length) {
          const { f, job } = batch[next++];
          try {
            const m = await uploadFile(f, (pct) => patch(job.key, { pct }));
            setItems((prev) => [m, ...prev.filter((x) => x.id !== m.id)]);
            patch(job.key, { pct: 100, done: true });
          } catch (e) {
            patch(job.key, { error: e instanceof Error ? e.message : "Upload failed." });
          }
        }
      }),
    );
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function runDelete(ids: string[]) {
    setDeleteIds(null);
    start(async () => {
      let removed = 0;
      let kept = 0;
      for (const id of ids) {
        const r = await deleteMedia(id);
        if (r.ok) {
          removed++;
          setItems((prev) => prev.filter((x) => x.id !== id));
        } else {
          kept++;
          setError(r.error);
        }
      }
      setSelected(new Set());
      setDetailId(null);
      setNotice(removed ? `${removed} file${removed === 1 ? "" : "s"} deleted.${kept ? ` ${kept} kept because they are in use.` : ""}` : null);
    });
  }

  const delIds = deleteIds ?? [];
  const deletable = delIds.filter((id) => !(usage[id] ?? []).length);
  const blocked = delIds.length - deletable.length;

  const usedBadge = (m: MediaRecord) => {
    const n = (usage[m.id] ?? []).length;
    return <span className={n ? "font-medium text-ok" : "text-fg/45"}>{n ? `Used in ${n} place${n === 1 ? "" : "s"}` : "Not used"}</span>;
  };

  return (
    <div className="grid gap-4">
      {!tokenReady && (
        <p className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          Uploads aren&apos;t switched on yet (the storage key is missing). Ask whoever manages hosting to add it. Files you already host can still be used by pasting their address into an image field.
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void onFiles(e.dataTransfer.files);
        }}
        className={`flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 ${over ? "border-accent bg-accent/5" : "border-fg/20 bg-white"}`}
      >
        <p className="text-sm">
          <span className="font-semibold">Drag images and videos here</span> <span className="text-fg/55">· images up to 10 MB, videos (MP4 or WebM) up to 100 MB</span>
        </p>
        <button type="button" className={`${primaryBtn} ml-auto`} onClick={() => input.current?.click()}>
          Upload files
        </button>
        <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Choose files to upload" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {jobs.length > 0 && (
        <ul aria-label="Uploads" className={`${card} divide-y divide-fg/8`}>
          {jobs.slice(0, 6).map((j) => (
            <li key={j.key} className="grid gap-1 px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{j.name}</span>
                <span className={`text-xs ${j.error ? "text-bad" : j.done ? "text-ok" : "text-fg/55"}`}>{j.error ? "Failed" : j.done ? "Uploaded" : `${j.pct}%`}</span>
              </div>
              {j.error ? <p className="text-xs text-bad">{j.error}</p> : <div className="h-1.5 overflow-hidden rounded-full bg-fg/10"><div className={`h-full ${j.done ? "bg-ok" : "bg-accent"} transition-[width]`} style={{ width: `${j.pct}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or description" aria-label="Search the library" className={`${inputCls} max-w-60`} />
        <div role="group" aria-label="Type" className="flex gap-1">
          {(["all", "image", "video"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1.5 text-sm ${filter === f ? "border-accent bg-accent/10 font-semibold text-accent" : "border-fg/20 bg-white hover:border-fg/50"}`}>
              {f === "all" ? "All" : f === "image" ? "Images" : "Videos"} <span className="text-fg/45">{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-fg/75">
          <input type="checkbox" checked={unusedOnly} onChange={(e) => setUnusedOnly(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Unused only <span className="text-fg/45">{unusedCount}</span>
        </label>
        <label className="ml-auto flex items-center gap-2 text-sm text-fg/65">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${inputCls} w-auto`}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
            <option value="size">Largest</option>
          </select>
        </label>
        <div role="group" aria-label="View" className="flex overflow-hidden rounded-lg border border-fg/20">
          {(["grid", "list"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm ${view === v ? "bg-fg/10 font-semibold" : "bg-white hover:bg-fg/5"}`}>
              {v === "grid" ? "Grid" : "List"}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-accent/8 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <button type="button" className={secondaryBtn} onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
          <button type="button" className={`${secondaryBtn} !text-bad`} disabled={pending} onClick={() => setDeleteIds([...selected])}>
            Delete…
          </button>
        </div>
      )}

      <div aria-live="polite" className="min-h-4 text-sm">
        {error && <p role="alert" className="text-bad">{error}</p>}
        {!error && notice && <p className="text-ok">{notice}</p>}
      </div>

      {items.length === 0 && <p className={`${card} p-5 text-sm text-fg/65`}>Nothing here yet. Drop some files above to start your library.</p>}
      {items.length > 0 && visible.length === 0 && <p className="text-sm text-fg/60">No files match. Clear the search or filters.</p>}

      {view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {visible.map((m) => (
            <li key={m.id} className={`${card} overflow-hidden ${selected.has(m.id) ? "ring-2 ring-accent" : ""}`}>
              <div className="relative">
                <button type="button" onClick={() => setDetailId(m.id)} aria-label={`Open details for ${nameOf(m)}`} className="block aspect-[4/3] w-full bg-fg/6">
                  <Thumb m={m} className="h-full w-full" />
                </button>
                <label className="absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-white/90 shadow">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} aria-label={`Select ${nameOf(m)}`} className="h-4 w-4 accent-[var(--color-accent)]" />
                </label>
                <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white">{typeOf(m)}</span>
              </div>
              <div className="grid gap-0.5 p-2.5 text-xs">
                <p className="truncate text-[13px] font-semibold" title={m.pathname}>{nameOf(m)}</p>
                <p className="text-fg/55">
                  {m.width && m.height ? `${m.width}×${m.height} · ` : ""}
                  {mb(m.bytes)}
                </p>
                {usedBadge(m)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="hidden grid-cols-[1.5rem_3.5rem_minmax(0,1.5fr)_5rem_6rem_5rem_minmax(0,1fr)_6rem_auto] items-center gap-3 border-b border-fg/8 bg-fg/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-fg/50 lg:grid">
            <span />
            <span />
            <span>File</span>
            <span>Type</span>
            <span>Size</span>
            <span>Dimensions</span>
            <span>Used in</span>
            <span>Added</span>
            <span />
          </div>
          <ul className="divide-y divide-fg/8">
            {visible.map((m) => (
              <li key={m.id} className={`grid grid-cols-[1.5rem_3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-sm lg:grid-cols-[1.5rem_3.5rem_minmax(0,1.5fr)_5rem_6rem_5rem_minmax(0,1fr)_6rem_auto] ${selected.has(m.id) ? "bg-accent/5" : ""}`}>
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} aria-label={`Select ${nameOf(m)}`} className="h-4 w-4 accent-[var(--color-accent)]" />
                <button type="button" onClick={() => setDetailId(m.id)} aria-label={`Open details for ${nameOf(m)}`} className="h-10 w-14 overflow-hidden rounded bg-fg/8">
                  <Thumb m={m} className="h-full w-full" />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-medium" title={m.pathname}>{nameOf(m)}</p>
                  <p className="truncate text-xs text-fg/50 lg:hidden">
                    {typeOf(m)} · {mb(m.bytes)}
                  </p>
                </div>
                <span className="hidden text-xs text-fg/65 lg:block">{typeOf(m)}</span>
                <span className="hidden text-xs text-fg/65 lg:block">{mb(m.bytes)}</span>
                <span className="hidden text-xs text-fg/65 lg:block">{m.width && m.height ? `${m.width}×${m.height}` : "—"}</span>
                <span className="hidden truncate text-xs lg:block">{usedBadge(m)}</span>
                <span className="hidden text-xs text-fg/55 lg:block">{fmtDate(m.createdAt)}</span>
                <button type="button" className={`${secondaryBtn} !px-3 !py-1.5`} onClick={() => setDetailId(m.id)}>
                  Details
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DetailPanel
        key={detail?.id ?? "none"}
        item={detail}
        uses={detail ? (usage[detail.id] ?? []) : []}
        busy={pending}
        onClose={() => setDetailId(null)}
        onDelete={(id) => setDeleteIds([id])}
        onAlt={(id, alt) => {
          setItems((prev) => prev.map((x) => (x.id === id ? { ...x, alt: alt.trim() || null } : x)));
          start(() => updateMediaAlt(id, alt));
        }}
        onReplaced={(oldId, fresh, replaced) => {
          setItems((prev) => [fresh, ...prev.filter((x) => x.id !== oldId && x.id !== fresh.id)]);
          setUsage((u) => {
            const { [oldId]: moved, ...rest } = u;
            return moved ? { ...rest, [fresh.id]: moved } : rest;
          });
          setDetailId(fresh.id);
          setNotice(`Replaced in ${replaced} place${replaced === 1 ? "" : "s"}. The old file was removed.`);
        }}
      />

      <ConfirmDialog
        open={deleteIds !== null}
        title={deletable.length === 0 ? "These files are in use" : `Delete ${deletable.length} file${deletable.length === 1 ? "" : "s"}?`}
        body={
          deletable.length === 0 ? (
            "Every file you picked is still used on the website or in a project, so nothing can be deleted. Open a file to see where it is used, or use Replace to swap it."
          ) : (
            <>
              {deletable.length === 1 ? "This file" : "These files"} will be removed from the library and from storage. This can&apos;t be undone.
              {blocked > 0 && ` ${blocked} other file${blocked === 1 ? " is" : "s are"} still in use and will be kept.`}
            </>
          )
        }
        confirmLabel={deletable.length === 0 ? "OK" : "Delete"}
        danger={deletable.length > 0}
        onConfirm={() => (deletable.length === 0 ? setDeleteIds(null) : runDelete(deletable))}
        onCancel={() => setDeleteIds(null)}
      />
    </div>
  );
}

function DetailPanel({
  item,
  uses,
  busy,
  onClose,
  onDelete,
  onAlt,
  onReplaced,
}: {
  item: MediaRecord | null;
  uses: MediaUse[];
  busy: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAlt: (id: string, alt: string) => void;
  onReplaced: (oldId: string, fresh: MediaRecord, replaced: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [alt, setAlt] = useState(item?.alt ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);

  if (!item) return <dialog ref={ref} />;
  const m = item;

  function pick(f: File | undefined) {
    setErr(null);
    if (!f) return;
    if (!f.type.startsWith(`${m.kind}/`)) return setErr(`Choose ${m.kind === "video" ? "a video (MP4 or WebM)" : "an image"} to replace this one.`);
    setFile(f);
  }

  async function doReplace() {
    if (!file) return;
    const f = file;
    setFile(null);
    setErr(null);
    setProgress(0);
    try {
      const fresh = await uploadFile(f, setProgress);
      const r = await replaceMedia(m.id, fresh.id);
      if (r.ok) onReplaced(m.id, fresh, r.replaced);
      else setErr(r.error);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} className="m-0 ml-auto h-dvh max-h-none w-[min(520px,100vw)] border-l border-fg/15 bg-white p-0 text-fg shadow-2xl backdrop:bg-black/40">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-fg/10 px-5 py-3">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold" title={m.pathname}>{nameOf(m)}</h2>
          <button type="button" className={secondaryBtn} onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
          <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-lg bg-fg/6">
            {m.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.alt ?? ""} className="max-h-72 w-full object-contain" />
            ) : (
              <video src={m.url} className="max-h-72 w-full" controls preload="metadata" />
            )}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-fg/55">Type</dt>
            <dd>{typeOf(m)} {m.kind}</dd>
            <dt className="text-fg/55">Size</dt>
            <dd>{mb(m.bytes)}</dd>
            {m.width && m.height && (
              <>
                <dt className="text-fg/55">Dimensions</dt>
                <dd>{m.width} × {m.height} px</dd>
              </>
            )}
            <dt className="text-fg/55">Added</dt>
            <dd>{fmtDate(m.createdAt)}</dd>
          </dl>

          <label className="grid gap-1.5 text-[13px] font-semibold">
            Description for screen readers
            <input className={inputCls} value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== (m.alt ?? "") && onAlt(m.id, alt)} placeholder="Describe what the picture shows" />
          </label>

          <div>
            <h3 className="text-[13px] font-semibold">Where it is used</h3>
            {uses.length === 0 ? (
              <p className="mt-1 text-sm text-fg/55">Nowhere yet. It&apos;s safe to delete.</p>
            ) : (
              <ul className="mt-1 grid gap-1 text-sm">
                {uses.map((u) => (
                  <li key={u.href + u.label}>
                    <Link href={u.href} className="text-accent underline underline-offset-2">
                      {u.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-2 rounded-lg border border-fg/10 p-3">
            <h3 className="text-[13px] font-semibold">Replace this file</h3>
            <p className="text-xs text-fg/60">Upload a new version and every place that uses this file switches to it. The old file is removed. {uses.length === 0 && "It isn't used anywhere yet, so just upload the new file and delete this one."}</p>
            <label className={`${secondaryBtn} cursor-pointer justify-self-start ${uses.length === 0 || progress !== null ? "pointer-events-none opacity-40" : ""}`}>
              {progress === null ? "Choose a replacement…" : `Uploading ${progress}%`}
              <input type="file" className="sr-only" accept={m.kind === "video" ? "video/mp4,video/webm" : "image/*"} disabled={uses.length === 0 || progress !== null} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-fg/10 px-5 py-3">
          <button type="button" className={secondaryBtn} onClick={() => { void navigator.clipboard?.writeText(m.url); setCopied(true); }}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <button type="button" className={`${secondaryBtn} ml-auto !text-bad`} disabled={busy} onClick={() => onDelete(m.id)}>
            Delete…
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={file !== null}
        title="Replace this file everywhere?"
        body={
          <>
            Used in {uses.length} place{uses.length === 1 ? "" : "s"}. Anything already <strong>published</strong> changes on the live website straight away. The old file is deleted afterwards and can&apos;t be brought back.
          </>
        }
        confirmLabel="Replace everywhere"
        onConfirm={() => void doReplace()}
        onCancel={() => setFile(null)}
      />
    </dialog>
  );
}
