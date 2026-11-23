"use client";

import { useState } from "react";
import { elementsOf, PAGE_BLOCKS, resolveLayout, type BlockId, type LayoutItem, type PageElement } from "@/lib/work-layout";
import type { Obj } from "./form/spec";
import { makePartApi, type PartApi } from "./part-api";
import { arrayMove, SortableItem, SortableList } from "./SortableList";

const INFO = Object.fromEntries(PAGE_BLOCKS.map((b) => [b.id, b])) as Record<BlockId, (typeof PAGE_BLOCKS)[number]>;

function Fixed({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-fg/20 px-3 py-2 text-xs text-fg/55">{children}</p>;
}

/** One picture or paragraph on the page: keep it or delete it. Pictures are uploaded and replaced under Page images. */
function Parts({ parts, api }: { parts: PageElement[]; api: PartApi }) {
  return (
    <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 border-t border-fg/10 pt-2">
      {parts.map((e) => {
        const deleted = api.hidden.has(e.id);
        const image = api.imageOf(e.id);
        return (
          <li key={e.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-md bg-fg/[0.03] p-2">
            <div className="flex items-center gap-2">
              <div className={`min-w-0 flex-1 ${deleted ? "opacity-55" : ""}`}>
                <p className={`text-sm font-medium ${deleted ? "line-through" : ""}`}>{e.label}</p>
                <p className="text-xs text-fg/55">{e.kind === "image" ? (image ? "Your image · change it under Page images" : "Empty · add one under Page images") : e.kind === "text" ? "Text" : e.kind === "video" ? "Video · upload it under Page content" : "Block"}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!deleted}
                aria-label={`${e.label}: ${deleted ? "deleted" : "kept"}`}
                onClick={() => api.setHidden(e.id, !deleted)}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${deleted ? "border-fg/25 text-fg/60 hover:bg-fg/5" : "border-ok/40 bg-ok/10 text-ok"}`}
              >
                <span aria-hidden className={`h-2 w-2 rounded-full ${deleted ? "bg-fg/30" : "bg-ok"}`} />
                {deleted ? "Deleted" : "Kept"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Choose what appears on a project's page and in what order, and keep, delete or change single pictures and paragraphs. Deleted parts keep their content. */
export function PageLayoutEditor({ body, category, onBody }: { body: Obj; category: string; onBody: (next: Obj) => void }) {
  const items = resolveLayout(body.layout);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const setLayout = (next: LayoutItem[]) => onBody({ ...body, layout: next });
  const toggle = (i: number) => setLayout(items.map((it, j) => (j === i ? { ...it, show: !it.show } : it)));
  const shown = items.filter((i) => i.show).length;

  const api = makePartApi(body, onBody);
  const hidden = api.hidden;

  const topParts = elementsOf("top", category);
  const keptOf = (parts: PageElement[]) => parts.filter((e) => !hidden.has(e.id)).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <div className="rounded-lg border border-fg/15 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-xs text-fg/55">Always at the top: back link and project name.</p>
          <button type="button" className="text-xs font-semibold text-accent" aria-expanded={!!open.top} onClick={() => setOpen({ ...open, top: !open.top })}>
            Summary paragraph · {keptOf(topParts) ? "kept" : "deleted"} {open.top ? "▴" : "▾"}
          </button>
        </div>
        {open.top && <Parts parts={topParts} api={api} />}
      </div>

      <SortableList ids={items.map((i) => i.id)} onReorder={(f, t) => setLayout(arrayMove(items, f, t))}>
        {items.map((it, i) => {
          const parts = elementsOf(it.id, category);
          const isOpen = !!open[it.id];
          return (
            <SortableItem key={it.id} id={it.id} label={INFO[it.id].label}>
              {({ setNodeRef, style, handle }) => (
                <div ref={setNodeRef as React.Ref<HTMLDivElement>} style={style} className={`min-w-0 rounded-lg border bg-white px-2 py-2 ${it.show ? "border-fg/15" : "border-fg/10 bg-fg/[0.03]"}`}>
                  <div className="flex items-center gap-2">
                    {handle}
                    <div className={`min-w-0 flex-1 ${it.show ? "" : "opacity-55"}`}>
                      <p className="text-sm font-semibold">{INFO[it.id].label}</p>
                      <p className="truncate text-xs text-fg/55" title={INFO[it.id].about}>
                        {INFO[it.id].about}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={it.show}
                      aria-label={`${INFO[it.id].label}: ${it.show ? "shown" : "hidden"}`}
                      onClick={() => toggle(i)}
                      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${it.show ? "border-ok/40 bg-ok/10 text-ok" : "border-fg/25 text-fg/60 hover:bg-fg/5"}`}
                    >
                      <span aria-hidden className={`h-2 w-2 rounded-full ${it.show ? "bg-ok" : "bg-fg/30"}`} />
                      {it.show ? "Shown" : "Hidden"}
                    </button>
                  </div>
                  {parts.length > 0 && it.show && (
                    <>
                      <button type="button" className="mt-2 text-xs font-semibold text-accent" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [it.id]: !isOpen })}>
                        Edit parts · {keptOf(parts)} of {parts.length} kept {isOpen ? "▴" : "▾"}
                      </button>
                      {isOpen && <Parts parts={parts} api={api} />}
                    </>
                  )}
                </div>
              )}
            </SortableItem>
          );
        })}
      </SortableList>
      <Fixed>Always at the bottom: previous / next project and the contact button.</Fixed>
      <p className="text-xs text-fg/55">
        {shown} of {items.length} blocks shown. Hidden blocks and deleted parts are left off the website but keep what you wrote, so you can bring them back. Pictures are uploaded and replaced under “Page images”.
      </p>
    </div>
  );
}
