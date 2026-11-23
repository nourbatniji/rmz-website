"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, type CSSProperties, type ReactNode, type Ref } from "react";

export { arrayMove };

/**
 * Drag-and-drop ordering that also works from the keyboard (focus the handle, press Space, use the arrow keys, press Space again)
 * and by touch. `ids` must be unique and in the current display order.
 */
export function SortableList({ ids, onReorder, layout = "list", children }: { ids: string[]; onReorder: (from: number, to: number) => void; layout?: "list" | "grid"; disabled?: boolean; children: ReactNode }) {
  // A fixed id per list: without it dnd-kit numbers its helper elements from a global counter, which differs between the server render and the browser (hydration error).
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) onReorder(from, to);
  };
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export type SortableRender = { setNodeRef: Ref<HTMLElement>; style: CSSProperties; handle: ReactNode; dragging: boolean };

export function SortableItem({ id, label = "item", children }: { id: string; label?: string; children: (r: SortableRender) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition, position: "relative", zIndex: isDragging ? 20 : undefined, opacity: isDragging ? 0.9 : undefined };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`Drag to reorder ${label}. Press Space, then the arrow keys, then Space again.`}
      title="Drag to reorder"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="inline-flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-fg/40 hover:bg-fg/8 hover:text-fg active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <circle cx="4.5" cy="3" r="1.2" />
        <circle cx="9.5" cy="3" r="1.2" />
        <circle cx="4.5" cy="7" r="1.2" />
        <circle cx="9.5" cy="7" r="1.2" />
        <circle cx="4.5" cy="11" r="1.2" />
        <circle cx="9.5" cy="11" r="1.2" />
      </svg>
    </button>
  );
  return <>{children({ setNodeRef: setNodeRef as Ref<HTMLElement>, style, handle, dragging: isDragging })}</>;
}
