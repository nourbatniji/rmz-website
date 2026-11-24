"use client";

import { elementsOf, fixedTextsOf, imageSlots, PAGE_BLOCKS, resolveLayout, type BlockId, type PageElement } from "@/lib/work-layout";
import { Fields } from "./form/FormFields";
import { VideoField } from "./form/VideoField";
import { PROJECT_FIELDS } from "./form/section-specs";
import type { Errors, Obj } from "./form/spec";
import { makePartApi, type PartApi } from "./part-api";
import { SlotCard } from "./PageImages";

/** Which project field fills each text part of the page. Text parts without a field (fixed captions) are not editable here. */
const TEXT_FIELD: Record<string, string> = {
  "top.about": "about",
  "meta.client": "client",
  "meta.services": "services",
  "meta.year": "year",
  "meta.status": "copyStatus",
  "brief.text": "brief",
  "idea.text": "idea",
  "idea.keys": "keys",
  "outcome.list": "deliverables",
  "credits.list": "credits",
};
const FIELD = Object.fromEntries(PROJECT_FIELDS.filter((f) => "name" in f).map((f) => [(f as { name: string }).name, f]));
const BLOCK = Object.fromEntries(PAGE_BLOCKS.map((b) => [b.id, b])) as Record<BlockId, (typeof PAGE_BLOCKS)[number]>;

function Switch({ label, deleted, onClick }: { label: string; deleted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!deleted}
      aria-label={`${label}: ${deleted ? "deleted" : "kept"}`}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${deleted ? "border-fg/25 text-fg/60 hover:bg-fg/5" : "border-ok/40 bg-ok/10 text-ok"}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${deleted ? "bg-fg/30" : "bg-ok"}`} />
      {deleted ? "Deleted" : "Kept"}
    </button>
  );
}

function TextPart({ e, body, onBody, api, errors, onActive }: { e: PageElement; body: Obj; onBody: (next: Obj) => void; api: PartApi; errors: Errors; onActive?: (id: string | null) => void }) {
  const field = FIELD[TEXT_FIELD[e.id]];
  if (!field) return null;
  const deleted = api.hidden.has(e.id);
  return (
    <div
      onMouseEnter={() => onActive?.(e.id)}
      onMouseLeave={() => onActive?.(null)}
      onFocusCapture={() => onActive?.(e.id)}
      onBlurCapture={() => onActive?.(null)}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-fg/10 bg-white p-3"
    >
      <div className="flex items-center gap-2">
        <p className={`min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-fg/55 ${deleted ? "line-through" : ""}`}>Text · {e.label}</p>
        <Switch label={e.label} deleted={deleted} onClick={() => api.setHidden(e.id, !deleted)} />
      </div>
      <div className={deleted ? "opacity-50" : ""}>
        <Fields fields={[field]} value={body} onChange={onBody} path="" errors={errors} />
      </div>
    </div>
  );
}

/** Wording on the page that has no field of its own (captions, headings, labels). Empty = the built-in wording, shown as the placeholder. */
function WordingPart({ id, label, def, body, onBody, onActive, deleted, onToggle, long }: { id: string; label: string; def: string; body: Obj; onBody: (next: Obj) => void; onActive?: (id: string | null) => void; deleted?: boolean; onToggle?: () => void; long?: boolean }) {
  const texts = (body.texts && typeof body.texts === "object" ? body.texts : {}) as Record<string, string>;
  const set = (v: string) => {
    const next = { ...texts };
    if (v.trim()) next[id] = v;
    else delete next[id];
    const out = { ...body };
    if (Object.keys(next).length) out.texts = next;
    else delete out.texts;
    onBody(out);
  };
  const cls = "w-full rounded-lg border border-fg/20 bg-white px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:border-accent focus:ring-2 focus:ring-accent/15";
  return (
    <div onMouseEnter={() => onActive?.(id)} onMouseLeave={() => onActive?.(null)} onFocusCapture={() => onActive?.(id)} onBlurCapture={() => onActive?.(null)} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-fg/10 bg-white p-3">
      <div className="flex items-center gap-2">
        <p className={`min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-fg/55 ${deleted ? "line-through" : ""}`}>Text · {label}</p>
        {onToggle && <Switch label={label} deleted={!!deleted} onClick={onToggle} />}
      </div>
      <div className={deleted ? "opacity-50" : ""}>
        {long ? <textarea rows={2} className={cls} value={texts[id] ?? ""} placeholder={def} onChange={(e) => set(e.target.value)} /> : <input type="text" className={cls} value={texts[id] ?? ""} placeholder={def} onChange={(e) => set(e.target.value)} />}
        <p className="mt-1 text-xs text-fg/50">Leave empty to keep the built-in wording.</p>
      </div>
    </div>
  );
}

function VideoPart({ e, body, onBody, api }: { e: PageElement; body: Obj; onBody: (next: Obj) => void; api: PartApi }) {
  const deleted = api.hidden.has(e.id);
  const video = body.video && typeof body.video === "object" ? (body.video as Obj) : null;
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-fg/10 bg-white p-3">
      <div className="flex items-center gap-2">
        <p className={`min-w-0 flex-1 text-sm font-bold ${deleted ? "line-through opacity-55" : ""}`}>Video · {e.label}</p>
        <Switch label={e.label} deleted={deleted} onClick={() => api.setHidden(e.id, !deleted)} />
      </div>
      {!deleted && <VideoField label="Drop the video here" help="MP4 or WebM, up to 100 MB. 16:9 fits best. Until one is added the page shows a labelled placeholder." value={video} onChange={(next) => onBody({ ...body, video: next })} />}
    </div>
  );
}

/**
 * Everything on a project page, top to bottom, in the same order as the live preview (and following the block order set in Page layout).
 * Each block shows its pictures and its texts together, in the order they sit on the page.
 */
export function PageContent({ body, category, onBody, errors, onActive, flashId }: { body: Obj; category: string; onBody: (next: Obj) => void; errors: Errors; onActive?: (id: string | null) => void; flashId?: string | null }) {
  const api = makePartApi(body, onBody);
  const nums = new Map(imageSlots(body.layout, category).map((s) => [s.el.id, s.n]));
  const layout = resolveLayout(body.layout);
  const offPage = layout.filter((b) => !b.show).map((b) => BLOCK[b.id].label);

  const wording = (e: PageElement) => <WordingPart key={e.id} id={e.id} label={e.label} def={e.def ?? ""} body={body} onBody={onBody} onActive={onActive} deleted={api.hidden.has(e.id)} onToggle={() => api.setHidden(e.id, !api.hidden.has(e.id))} long />;
  const fixed = (b: BlockId | "top") => fixedTextsOf(b, category).map((t) => <WordingPart key={t.id} id={t.id} label={t.label} def={t.def} body={body} onBody={onBody} onActive={onActive} />);

  const renderPart = (e: PageElement) =>
    e.kind === "image" ? <SlotCard key={e.id} e={e} n={nums.get(e.id) ?? 0} api={api} onActive={onActive} flashId={flashId} /> : e.kind === "video" ? <VideoPart key={e.id} e={e} body={body} onBody={onBody} api={api} /> : e.kind === "text" && !TEXT_FIELD[e.id] ? (e.def ? wording(e) : null) : e.kind === "text" ? <TextPart key={e.id} e={e} body={body} onBody={onBody} api={api} errors={errors} onActive={onActive} /> : null;

  const block = (title: string, hint: string, children: React.ReactNode, key: string) => (
    <section key={key} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-fg/10 bg-fg/[0.025] p-3">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs text-fg/55">{hint}</p>
      </div>
      {children}
    </section>
  );

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {block(
        "Top of the page",
        "Back link, project name, then the small line and summary.",
        <>
          <Fields fields={[FIELD.discipline]} value={body} onChange={onBody} path="" errors={errors} />
          {fixed("top")}
          {elementsOf("top", category).map(renderPart)}
        </>,
        "top",
      )}
      {layout
        .filter((b) => b.show)
        .map((b) => {
          const parts = elementsOf(b.id, category);
          const texts = fixedTextsOf(b.id, category);
          if (!parts.length && !texts.length) return null;
          const heading = texts.filter((t) => t.id.endsWith(".heading"));
          return block(
            BLOCK[b.id].label,
            BLOCK[b.id].about,
            <>
              {heading.map((t) => <WordingPart key={t.id} id={t.id} label={t.label} def={t.def} body={body} onBody={onBody} onActive={onActive} />)}
              {parts.map(renderPart)}
              {texts.filter((t) => !t.id.endsWith(".heading")).map((t) => <WordingPart key={t.id} id={t.id} label={t.label} def={t.def} body={body} onBody={onBody} onActive={onActive} />)}
            </>,
            b.id,
          );
        })}
      {block("Page colours", "The four colours the page and the brand panel use.", <Fields fields={[FIELD.palette]} value={body} onChange={onBody} path="" errors={errors} />, "palette")}
      {offPage.length > 0 && <p className="rounded-lg border border-dashed border-fg/20 px-3 py-2 text-xs text-fg/55">Not on the page right now: {offPage.join(", ")}. Turn them back on under Page layout.</p>}
    </div>
  );
}
