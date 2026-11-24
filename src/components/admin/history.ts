/**
 * Undo/redo for the dashboard editors. Pure functions (no React) so the rules are easy to test.
 * A "step" is one thing the editor did: a toggle, a reorder, a picture change, or a burst of typing in ONE field.
 */
export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Field being typed in right now (null after anything that isn't plain typing). Typing in the same field keeps merging into one step. */
  key: string | null;
  at: number;
};

/** How long a pause ends a burst of typing. Short enough that undo feels granular, long enough that one word is one step. */
export const TYPING_PAUSE_MS = 800;
export const HISTORY_LIMIT = 100;

export const startHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [], key: null, at: 0 });

function leaves(a: unknown, b: unknown, path: string, out: { path: string; a: unknown; b: unknown }[]) {
  if (out.length > 1 || Object.is(a, b)) return;
  const both = (v: unknown) => v !== null && typeof v === "object";
  if (both(a) && both(b) && Array.isArray(a) === Array.isArray(b)) {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    if (ka.length !== kb.length) return void out.push({ path, a, b }, { path, a, b });
    for (const k of new Set([...ka, ...kb])) leaves((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}/${k}`, out);
    return;
  }
  out.push({ path, a, b });
}

/** The field path when `next` differs from `prev` by typing in exactly one text field; otherwise null. */
export function typingKey(prev: unknown, next: unknown): string | null {
  const out: { path: string; a: unknown; b: unknown }[] = [];
  leaves(prev, next, "", out);
  return out.length === 1 && typeof out[0].a === "string" && typeof out[0].b === "string" ? out[0].path : null;
}

export function pushEdit<T>(h: History<T>, next: T, now: number): History<T> {
  if (Object.is(next, h.present)) return h;
  const key = typingKey(h.present, next);
  const merge = key !== null && key === h.key && now - h.at < TYPING_PAUSE_MS;
  return { past: merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], key, at: now };
}

export function undoEdit<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], key: null, at: 0 };
}

export function redoEdit<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), key: null, at: 0 };
}

/** Ctrl/⌘+Z = undo; Ctrl/⌘+Shift+Z or Ctrl+Y = redo. Anything else (or an IME in progress) = null. */
export function shortcutOf(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; isComposing?: boolean }): "undo" | "redo" | null {
  if (e.isComposing || e.altKey || !(e.ctrlKey || e.metaKey)) return null;
  const k = e.key.toLowerCase();
  if (k === "z") return e.shiftKey ? "redo" : "undo";
  if (k === "y" && e.ctrlKey && !e.metaKey && !e.shiftKey) return "redo";
  return null;
}
