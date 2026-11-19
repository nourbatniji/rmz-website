"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProject, type CreateState } from "@/lib/admin/project-actions";
import { inputCls } from "./form/FormFields";
import { primaryBtn, secondaryBtn } from "./ui";

/** "+ Add Project" button and the small dialog it opens. */
export function NewProjectDialog({ categories, defaultOpen }: { categories: { value: string; label: string }[]; defaultOpen?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<CreateState, FormData>(createProject, {});
  useEffect(() => {
    if (defaultOpen && ref.current && !ref.current.open) ref.current.showModal();
  }, [defaultOpen]);
  return (
    <>
      <button type="button" className={primaryBtn} onClick={() => ref.current?.showModal()}>
        + Add Project
      </button>
      <dialog ref={ref} className="m-auto w-[min(480px,92vw)] rounded-xl border border-fg/15 bg-white p-0 text-fg shadow-xl backdrop:bg-black/40">
        <form action={action} className="grid gap-4 p-5">
          <h2 className="text-lg font-bold">Add a project</h2>
          <p className="-mt-2 text-sm text-fg/60">It starts as a draft, so nothing appears on the website until you publish it.</p>
          <label className="grid gap-1.5 text-[13px] font-semibold">
            Project name
            <input name="name" required maxLength={120} className={inputCls} placeholder="Arid" />
          </label>
          <label className="grid gap-1.5 text-[13px] font-semibold">
            Category
            <select name="category" className={inputCls} defaultValue="brand">
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <details className="text-sm">
            <summary className="cursor-pointer text-fg/60">Choose the web address yourself (optional)</summary>
            <label className="mt-2 grid gap-1.5 text-[13px] font-semibold">
              Web address
              <input name="slug" className={inputCls} placeholder="arid" />
            </label>
          </details>
          {state.error && (
            <p role="alert" className="text-sm font-medium text-bad">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryBtn}>
              {pending ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
