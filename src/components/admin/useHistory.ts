"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pushEdit, redoEdit, shortcutOf, startHistory, undoEdit, type History } from "./history";

/**
 * Editor state with Undo / Redo. `set` records a step, `reset` replaces the value and forgets the history
 * (use it when the server hands back new content). Ctrl/⌘+Z, Ctrl/⌘+Shift+Z and Ctrl+Y work anywhere on the page,
 * also while typing in a field, except while a dialog (confirm box, media library) is open.
 */
export function useHistory<T>(initial: T, onTravel?: () => void) {
  const [h, setH] = useState<History<T>>(() => startHistory(initial));
  const travel = useRef(onTravel);
  useEffect(() => {
    travel.current = onTravel;
  });

  const set = useCallback((next: T) => {
    const now = Date.now();
    setH((cur) => pushEdit(cur, next, now));
  }, []);
  const reset = useCallback((next: T) => setH(startHistory(next)), []);
  const undo = useCallback(() => {
    setH((cur) => undoEdit(cur));
    travel.current?.();
  }, []);
  const redo = useCallback(() => {
    setH((cur) => redoEdit(cur));
    travel.current?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = shortcutOf(e);
      if (!action || e.defaultPrevented || document.querySelector("dialog[open]")) return;
      e.preventDefault(); // we own undo here: the browser's own undo would fight the editor state
      if (action === "undo") undo();
      else redo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return { value: h.present, set, reset, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
