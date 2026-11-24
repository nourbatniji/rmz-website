"use client";

import { PAGE_BLOCKS, resolveLayout, type BlockId, type LayoutItem } from "@/lib/work-layout";
import { iconBtnCls } from "./form/FormFields";
import { arrayMove, SortableItem, SortableList } from "./SortableList";

const INFO = Object.fromEntries(PAGE_BLOCKS.map((b) => [b.id, b])) as Record<BlockId, (typeof PAGE_BLOCKS)[number]>;

function Fixed({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-fg/20 px-3 py-2 text-xs text-fg/55">{children}</p>;
}

/** Choose what appears on a project's page and in what order: drag, or use the arrows. Hidden blocks keep their content. */
export function PageLayoutEditor({ value, onChange }: { value: unknown; onChange: (next: LayoutItem[]) => void }) {
  const items = resolveLayout(value);
  const set = (next: LayoutItem[]) => onChange(next);
  const move = (i: number, d: -1 | 1) => set(arrayMove(items, i, i + d));
  const toggle = (i: number) => set(items.map((it, j) => (j === i ? { ...it, show: !it.show } : it)));
  const shown = items.filter((i) => i.show).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <Fixed>Always at the top: back link, project name and summary.</Fixed>
      <SortableList ids={items.map((i) => i.id)} onReorder={(f, t) => set(arrayMove(items, f, t))}>
        {items.map((it, i) => (
          <SortableItem key={it.id} id={it.id} label={INFO[it.id].label}>
            {({ setNodeRef, style, handle }) => (
              <div ref={setNodeRef as React.Ref<HTMLDivElement>} style={style} className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-2 ${it.show ? "border-fg/15" : "border-fg/10 bg-fg/[0.03]"}`}>
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
                <button type="button" className={iconBtnCls} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className={iconBtnCls} aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
              </div>
            )}
          </SortableItem>
        ))}
      </SortableList>
      <Fixed>Always at the bottom: previous / next project and the contact button.</Fixed>
      <p className="text-xs text-fg/55">
        {shown} of {items.length} blocks shown. Hidden blocks are left off the website but keep what you wrote.
      </p>
    </div>
  );
}
