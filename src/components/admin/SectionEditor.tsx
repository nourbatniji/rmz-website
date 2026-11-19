"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { discardDraft, publishSection, resetSectionToDefault, saveSectionDraft, type SectionResult } from "@/lib/admin/section-actions";
import { PAGE_ORDER, SECTION_META, type SectionKey } from "@/lib/admin/section-meta";
import { EditorBar } from "./EditorBar";
import { Fields } from "./form/FormFields";
import { SECTION_FIELDS } from "./form/section-specs";
import { stableStringify, type Errors, type Obj } from "./form/spec";
import { PreviewFrame } from "./PreviewFrame";
import { card, ConfirmDialog, menuItem, MoreMenu, primaryBtn, secondaryBtn, type Tone } from "./ui";
import { useUnsavedGuard } from "./useUnsavedGuard";

/** Every section shows the live preview beside the form on wide screens (it can be hidden). Edits are auto-saved to the DRAFT shortly after you stop typing so the preview follows them; nothing goes live until Publish. */
const AUTOSAVE_MS = 1200;
const ORDER: SectionKey[] = ["site", ...PAGE_ORDER];

export type SectionStatus = { publishedSnapshot: string | null; updatedAt: string | null; updatedBy: string | null; publishedAt: string | null; fromDefault: boolean };

export function SectionEditor({ sectionKey, initial, status }: { sectionKey: SectionKey; initial: Obj; status: SectionStatus }) {
  const meta = SECTION_META[sectionKey];
  const [data, setData] = useState<Obj>(initial);
  const [savedSnap, setSavedSnap] = useState(() => stableStringify(initial));
  const [pubSnap, setPubSnap] = useState<string | null>(status.publishedSnapshot);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [flash, setFlash] = useState<"saved" | "published" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<null | "discard" | "reset">(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const idx = ORDER.indexOf(sectionKey);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
  /** The version of this section we last saw in the database. Sent with every save so a clash with another editor is caught. */
  const [version, setVersion] = useState<string | null>(status.updatedAt);

  const snap = useMemo(() => stableStringify(data), [data]);
  const dirty = snap !== savedSnap;
  const isLive = pubSnap !== null && savedSnap === pubSnap;

  const pill: { tone: Tone; text: string } = pending
    ? { tone: "busy", text: "Saving…" }
    : message?.tone === "error"
      ? { tone: "bad", text: "Error" }
      : dirty
        ? { tone: "warn", text: "Unsaved changes" }
        : flash === "saved"
          ? { tone: "ok", text: "Saved" }
          : isLive
            ? { tone: "ok", text: "Published" }
            : { tone: "warn", text: "Unpublished changes" };

  useUnsavedGuard(dirty);

  /** Auto-save the draft after a pause so the preview shows the change. Invalid content is not saved: the preview keeps the last valid draft and says so. */
  useEffect(() => {
    if (!dirty || pending) return;
    const sent = snap;
    const sentData = data;
    const t = setTimeout(() => {
      start(async () => {
        const r = await saveSectionDraft(sectionKey, sentData, version);
        if (r.ok) {
          setErrors({});
          setVersion(r.savedAt);
          setSavedSnap(sent);
          setFlash("saved");
          setPreviewNote(null);
          setReloadKey((k) => k + 1);
        } else if (r.fieldErrors) {
          setPreviewNote("Some fields need fixing, so the preview shows your last valid draft.");
        } else {
          setErrors({});
          setMessage({ tone: "error", text: r.error });
        }
      });
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [snap, dirty, pending, version, data, sectionKey]);

  const edit = (next: Obj) => {
    setData(next);
    setFlash(null);
    if (message?.tone === "error") setMessage(null);
  };

  function finish(r: SectionResult, after?: () => void): boolean {
    if (r.ok) {
      setErrors({});
      setVersion(r.savedAt);
      after?.();
      setReloadKey((k) => k + 1);
      return true;
    }
    setErrors(r.fieldErrors ?? {});
    setMessage({ tone: "error", text: r.error });
    return false;
  }

  async function persist(kind: "save" | "publish"): Promise<boolean> {
    setMessage(null);
    setPreviewNote(null);
    const sent = snap;
    if (kind === "save") {
      return finish(await saveSectionDraft(sectionKey, data, version), () => {
        setSavedSnap(sent);
        setFlash("saved");
        setMessage({ tone: "ok", text: "Draft saved. The live website hasn't changed." });
      });
    }
    return finish(await publishSection(sectionKey, data, version), () => {
      setSavedSnap(sent);
      setPubSnap(sent);
      setFlash("published");
      setMessage({ tone: "ok", text: "Published. The live website is updated." });
    });
  }

  const save = () => start(async () => void (await persist("save")));
  const publish = () => start(async () => void (await persist("publish")));

  /** Open the preview tab right away (browsers block tabs opened after a delay), then point it at the page once the draft is saved. */
  function preview() {
    const url = `/admin/preview#${meta.anchor}`;
    const tab = window.open("about:blank", "_blank");
    const go = () => (tab ? (tab.location.href = url) : window.open(url, "_blank"));
    if (!dirty) return void go();
    start(async () => {
      if (await persist("save")) go();
      else tab?.close();
    });
  }

  const replaceWith = (r: SectionResult, text: string) =>
    finish(r, () => {
      if (r.ok && r.data) {
        setData(r.data as Obj);
        setSavedSnap(stableStringify(r.data));
      }
      setFlash(null);
      setMessage({ tone: "ok", text });
    });

  const runConfirmed = () => {
    const which = confirm;
    setConfirm(null);
    start(async () => {
      setMessage(null);
      if (which === "discard") replaceWith(await discardDraft(sectionKey), "Your unpublished changes were discarded.");
      if (which === "reset") replaceWith(await resetSectionToDefault(sectionKey), "Reset to the original content. Publish when you want it live.");
    });
  };

  const errorList = Object.entries(errors);

  return (
    <div>
      <EditorBar backHref="/admin/website" backLabel="Website" title={meta.label} about={meta.about} pill={pill} savedAt={version} message={message}>
        <button type="button" className={secondaryBtn} onClick={save} disabled={pending || !dirty}>
          Save Draft
        </button>
        <button type="button" className={secondaryBtn} onClick={preview} disabled={pending}>
          Preview ↗
        </button>
        <button type="button" className={primaryBtn} onClick={publish} disabled={pending || (!dirty && isLive)}>
          Publish Changes
        </button>
        <MoreMenu>
          <button type="button" className={menuItem} disabled={pending || pubSnap === null || (!dirty && isLive)} onClick={() => setConfirm("discard")}>
            Discard unpublished changes…
          </button>
          <button type="button" className={menuItem} disabled={pending} onClick={() => setConfirm("reset")}>
            Reset to original content…
          </button>
        </MoreMenu>
      </EditorBar>

      {status.fromDefault && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          This section hasn&apos;t been saved yet, so you&apos;re editing the original content. Publish to start managing it from here.
        </p>
      )}

      <div className={`grid gap-5 ${showPreview ? "xl:grid-cols-[minmax(0,1fr)_minmax(440px,540px)]" : ""}`}>
        <section aria-label={`Edit ${meta.label}`} className={`${card} min-w-0 overflow-x-clip p-5 ${showPreview ? "" : "mx-auto w-full max-w-4xl"}`}>
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-fg/8 pb-3">
            <h2 className="text-base font-semibold">Edit {meta.label.toLowerCase()}</h2>
            <button type="button" onClick={() => setShowPreview((v) => !v)} aria-pressed={showPreview} className="ml-auto hidden rounded-md border border-fg/20 px-2.5 py-1 text-xs font-medium hover:bg-fg/5 xl:block">
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          </div>
          <p className="-mt-2 mb-4 text-xs text-fg/55 xl:hidden">The preview opens in a new tab with the Preview button.</p>
          {errorList.length > 0 && (
            <div role="alert" className="mb-4 rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm text-bad">
              <p className="font-semibold">Please check {errorList.length} field{errorList.length === 1 ? "" : "s"} marked below.</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {errorList.slice(0, 4).map(([path, msg]) => (
                  <li key={path}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
          <Fields fields={SECTION_FIELDS[sectionKey]} value={data} onChange={edit} path="" errors={errors} />
          <nav aria-label="Other sections" className="mt-6 flex items-center gap-3 border-t border-fg/8 pt-3 text-sm">
            {prev ? (
              <Link href={`/admin/website/${prev}`} className="text-fg/65 hover:text-accent">
                ← {SECTION_META[prev].label}
              </Link>
            ) : (
              <span />
            )}
            {status.updatedBy && <span className="mx-auto hidden text-xs text-fg/45 sm:block">Last saved by {status.updatedBy}</span>}
            {next ? (
              <Link href={`/admin/website/${next}`} className="ml-auto text-fg/65 hover:text-accent">
                {SECTION_META[next].label} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>

        {showPreview && (
          <section aria-label="Live preview" className="hidden min-w-0 xl:sticky xl:top-36 xl:block xl:self-start">
            <PreviewFrame section={sectionKey} reloadKey={reloadKey} note={previewNote} />
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "discard"}
        title="Discard unpublished changes?"
        body="Your draft goes back to what is live on the website right now. This can't be undone."
        confirmLabel="Discard changes"
        danger
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        title="Reset to the original content?"
        body="Your draft is replaced with the content this section started with. Nothing goes live until you publish."
        confirmLabel="Reset draft"
        danger
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
