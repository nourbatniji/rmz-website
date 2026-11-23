"use client";

import { secondaryBtn } from "./ui";

/** The Undo / Redo buttons for an editor bar. The keyboard shortcuts come from useHistory. */
export function UndoRedo({ canUndo, canRedo, onUndo, onRedo, disabled }: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Undo and redo">
      <button type="button" className={secondaryBtn} onClick={onUndo} disabled={disabled || !canUndo} title="Undo (Ctrl+Z, or ⌘Z on Mac)" aria-label="Undo">
        ↶ Undo
      </button>
      <button type="button" className={secondaryBtn} onClick={onRedo} disabled={disabled || !canRedo} title="Redo (Ctrl+Shift+Z, Ctrl+Y, or ⇧⌘Z on Mac)" aria-label="Redo">
        ↷ Redo
      </button>
    </div>
  );
}
