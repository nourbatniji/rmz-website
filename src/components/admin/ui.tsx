"use client";

import { useEffect, useRef } from "react";

export const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100";
export const secondaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-fg/20 bg-white px-3.5 py-2 text-sm font-medium text-fg hover:border-fg/50 hover:bg-fg/5 disabled:opacity-40 disabled:hover:bg-white";
export const card = "rounded-xl border border-fg/10 bg-white shadow-[0_1px_2px_rgba(31,29,26,0.04)]";

export type Tone = "ok" | "warn" | "bad" | "neutral" | "busy";
const TONE: Record<Tone, string> = {
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  bad: "bg-bad/10 text-bad",
  neutral: "bg-fg/8 text-fg/70",
  busy: "bg-fg/8 text-fg/70",
};

export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[tone]}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-current ${tone === "busy" ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}

/** "Saved 3 min ago" style text. `now` is passed in so the server and the browser agree. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Not saved yet";
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Saved just now";
  if (mins < 60) return `Saved ${mins} min ago`;
  if (mins < 60 * 24) return `Saved ${Math.round(mins / 60)} h ago`;
  return `Saved ${new Date(iso).toLocaleDateString()}`;
}

/** Plain confirmation dialog (replaces browser confirm()). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onCancel} className="m-auto w-[min(440px,92vw)] rounded-xl border border-fg/15 bg-white p-0 text-fg shadow-xl backdrop:bg-black/40">
      <div className="grid gap-3 p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="text-sm text-fg/70">{body}</div>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className={secondaryBtn} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={danger ? "inline-flex items-center rounded-md bg-bad px-4 py-2 text-sm font-semibold text-white hover:brightness-110" : primaryBtn} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Small "⋯" menu built on <details> (keyboard accessible, closes on outside click). */
export function MoreMenu({ label = "More actions", children }: { label?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <details ref={ref} className="relative">
      <summary aria-label={label} className={`${secondaryBtn} list-none !px-2.5 [&::-webkit-details-marker]:hidden`}>
        <span aria-hidden>⋯</span>
      </summary>
      <div role="menu" onClick={() => ref.current && (ref.current.open = false)} className="absolute right-0 z-30 mt-1 grid min-w-52 gap-0.5 rounded-lg border border-fg/12 bg-white p-1 shadow-lg">
        {children}
      </div>
    </details>
  );
}

export const menuItem = "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-fg/6 disabled:opacity-40 disabled:hover:bg-transparent";
