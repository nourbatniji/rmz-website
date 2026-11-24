"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteProject, reorderProjects, setProjectStatus } from "@/lib/admin/project-actions";
import { fmtDate } from "@/lib/admin/format";
import { inputCls } from "./form/FormFields";
import { arrayMove, SortableItem, SortableList } from "./SortableList";
import { card, ConfirmDialog, menuItem, MoreMenu, secondaryBtn, StatusPill } from "./ui";

export type ProjectRow = { id: string; name: string; slug: string; category: string; categoryLabel: string; status: "draft" | "published"; cover: string | null; updatedAt: string; updatedBy: string | null };
type StatusFilter = "all" | "published" | "draft";
type Sort = "manual" | "edited" | "name";

const COLS = "lg:grid-cols-[1.75rem_4.5rem_minmax(0,1.6fr)_9rem_7.5rem_7.5rem_auto]";

export function ProjectList({ initial, categories, initialStatus = "all" }: { initial: ProjectRow[]; categories: { value: string; label: string }[]; initialStatus?: StatusFilter }) {
  const router = useRouter();
  const [items, setItems] = useState(initial); // always in site order
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("manual");
  const [note, setNote] = useState<{ tone: "ok" | "error" | "busy"; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<ProjectRow | null>(null);
  const [pending, start] = useTransition();

  const counts = { all: items.length, published: items.filter((p) => p.status === "published").length, draft: items.filter((p) => p.status === "draft").length };
  const filtered = status !== "all" || category !== "all" || query.trim() !== "";
  const canDrag = sort === "manual" && !filtered;
  const position = useMemo(() => new Map(items.map((p, i) => [p.id, i + 1])), [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => (status === "all" || p.status === status) && (category === "all" || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q)));
    if (sort === "edited") return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [items, query, status, category, sort]);

  function applyOrder(next: ProjectRow[]) {
    const before = items;
    setItems(next);
    setNote({ tone: "busy", text: "Saving the new order…" });
    start(async () => {
      const r = await reorderProjects(next.map((p) => p.id));
      if (r.ok) setNote({ tone: "ok", text: "Order saved. The website uses this order." });
      else {
        setItems(before);
        setNote({ tone: "error", text: r.error });
      }
    });
  }

  function toggle(p: ProjectRow) {
    const next = p.status === "published" ? "draft" : "published";
    start(async () => {
      await setProjectStatus(p.id, next);
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
      setNote({ tone: "ok", text: next === "published" ? `“${p.name}” is now live.` : `“${p.name}” is hidden from the website.` });
      router.refresh();
    });
  }

  const renderRow = ({ p, handle, setRef, style, dragging }: { p: ProjectRow; handle: React.ReactNode; setRef?: React.Ref<HTMLLIElement>; style?: React.CSSProperties; dragging?: boolean }) => {
    const i = items.findIndex((x) => x.id === p.id);
    return (
      <li key={p.id} ref={setRef} style={style} className={`grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 bg-white px-3 py-2.5 lg:px-4 ${COLS} ${dragging ? "shadow-xl ring-2 ring-accent/40" : ""}`}>
        <span className="hidden lg:flex lg:items-center">{handle}</span>
        <Link href={`/admin/work/${p.id}`} tabIndex={-1} aria-hidden className="block h-12 w-[4.5rem] overflow-hidden rounded-md bg-fg/8">
          {p.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-[10px] text-fg/40">No image</span>
          )}
        </Link>
        <div className="min-w-0">
          <Link href={`/admin/work/${p.id}`} className="block truncate text-sm font-semibold hover:text-accent">
            {p.name}
          </Link>
          <p className="truncate text-xs text-fg/50">
            {canDrag ? `${String(position.get(p.id)).padStart(2, "0")} · ` : ""}/work/{p.slug}
          </p>
          <p className="truncate text-xs text-fg/55 lg:hidden">
            {p.categoryLabel} · {fmtDate(p.updatedAt)}
          </p>
        </div>
        <span className="hidden truncate text-sm text-fg/75 lg:block">{p.categoryLabel}</span>
        <span className="hidden lg:block">
          <StatusPill tone={p.status === "published" ? "ok" : "warn"}>{p.status === "published" ? "Published" : "Draft"}</StatusPill>
        </span>
        <span className="hidden text-xs text-fg/55 lg:block">
          {fmtDate(p.updatedAt)}
          {p.updatedBy && <span className="block truncate text-fg/40">{p.updatedBy.split("@")[0]}</span>}
        </span>
        <div className="flex items-center gap-2 justify-self-end">
          <span className="lg:hidden">
            <StatusPill tone={p.status === "published" ? "ok" : "warn"}>{p.status === "published" ? "Published" : "Draft"}</StatusPill>
          </span>
          <Link href={`/admin/work/${p.id}`} className={`${secondaryBtn} !px-3 !py-1.5`}>
            Edit
          </Link>
          <MoreMenu label={`More actions for ${p.name}`}>
            <button type="button" className={menuItem} disabled={pending} onClick={() => toggle(p)}>
              {p.status === "published" ? "Unpublish (hide from website)" : "Publish (show on website)"}
            </button>
            {p.status === "published" && (
              <a className={menuItem} href={`/work/${p.slug}`} target="_blank" rel="noreferrer">
                View on website ↗
              </a>
            )}
            <button type="button" className={menuItem} disabled={pending || !canDrag || i === 0} onClick={() => applyOrder(arrayMove(items, i, i - 1))}>
              Move earlier
            </button>
            <button type="button" className={menuItem} disabled={pending || !canDrag || i === items.length - 1} onClick={() => applyOrder(arrayMove(items, i, i + 1))}>
              Move later
            </button>
            <button type="button" className={`${menuItem} text-bad`} onClick={() => setToDelete(p)}>
              Delete…
            </button>
          </MoreMenu>
        </div>
      </li>
    );
  };

  const noHandle = (
    <span title="Switch to “Website order” and clear filters to drag" className="inline-flex h-8 w-6 items-center justify-center text-fg/15">
      ⋮⋮
    </span>
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" className={`${inputCls} max-w-56`} />
        <div role="group" aria-label="Status" className="flex gap-1">
          {(["all", "published", "draft"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={status === f} onClick={() => setStatus(f)} className={`rounded-full border px-3 py-1.5 text-sm ${status === f ? "border-accent bg-accent/10 font-semibold text-accent" : "border-fg/20 bg-white hover:border-fg/50"}`}>
              {f === "all" ? "All" : f === "published" ? "Published" : "Drafts"} <span className="text-fg/45">{counts[f]}</span>
            </button>
          ))}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={`${inputCls} w-auto`}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-sm text-fg/65">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${inputCls} w-auto`}>
            <option value="manual">Website order</option>
            <option value="edited">Recently edited</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-fg/55" aria-live="polite">
        {canDrag ? "Drag the handle (or use “Move earlier/later” in the ⋯ menu) to set the order of the cards on the website." : "Showing a filtered or sorted view. Choose “Website order” with no filters to rearrange."}
        {note && <span className={`ml-2 font-medium ${note.tone === "error" ? "text-bad" : note.tone === "ok" ? "text-ok" : "text-fg/60"}`}>{note.text}</span>}
      </p>

      <div className={card}>
        <div className={`hidden gap-3 rounded-t-xl border-b border-fg/8 bg-fg/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-fg/50 lg:grid ${COLS}`}>
          <span />
          <span />
          <span>Project</span>
          <span>Category</span>
          <span>Status</span>
          <span>Last edited</span>
          <span className="w-32" />
        </div>
        {shown.length === 0 ? (
          <p className="p-5 text-sm text-fg/60">No projects match. Clear the search or filters to see them all.</p>
        ) : canDrag ? (
          <SortableList ids={items.map((p) => p.id)} onReorder={(f, t) => applyOrder(arrayMove(items, f, t))}>
            <ul className="divide-y divide-fg/8">
              {items.map((p) => (
                <SortableItem key={p.id} id={p.id} label={p.name}>
                  {({ setNodeRef, style, handle, dragging }) => renderRow({ p, handle, setRef: setNodeRef as React.Ref<HTMLLIElement>, style, dragging })}
                </SortableItem>
              ))}
            </ul>
          </SortableList>
        ) : (
          <ul className="divide-y divide-fg/8">
            {shown.map((p) => renderRow({ p, handle: noHandle }))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        body="The project and its page are removed from the website. This can't be undone. Its images stay in the media library."
        confirmLabel="Delete project"
        danger
        onConfirm={() => {
          const p = toDelete;
          setToDelete(null);
          if (p) start(() => deleteProject(p.id));
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
