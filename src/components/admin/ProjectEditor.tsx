"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteProject, saveProject } from "@/lib/admin/project-actions";
import { EditorBar } from "./EditorBar";
import { FieldShell, Fields, inputCls } from "./form/FormFields";
import { PROJECT_CATEGORIES, PROJECT_FIELDS } from "./form/section-specs";
import { PageLayoutEditor } from "./PageLayoutEditor";
import { toPreviewProject } from "./project-preview";
import { ProjectLivePane } from "./ProjectLivePane";
import { stableStringify, type Errors, type Obj } from "./form/spec";
import { card, ConfirmDialog, menuItem, MoreMenu, primaryBtn, secondaryBtn, type Tone } from "./ui";
import { useUnsavedGuard } from "./useUnsavedGuard";

type Initial = { name: string; slug: string; category: string; status: "draft" | "published"; body: Obj };
type Props = { id: string; initial: Initial; updatedAt: string };

const MEDIA_FIELDS = PROJECT_FIELDS.filter((f) => "name" in f && f.name === "image");
const DETAIL_FIELDS = PROJECT_FIELDS.filter((f) => !("name" in f && f.name === "image"));

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={`${card} min-w-0 p-5`}>
      <h2 className="flex items-center gap-2 text-base font-bold">
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-fg/8 text-xs">{n}</span>
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-fg/55">{hint}</p>}
      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">{children}</div>
    </section>
  );
}

export function ProjectEditor({ id, initial, updatedAt }: Props) {
  const [v, setV] = useState<Initial>(initial);
  const [saved, setSaved] = useState(() => stableStringify(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [flash, setFlash] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => stableStringify(v) !== saved, [v, saved]);
  /** The version of this project we last saw in the database; a clash with another editor is caught on save. */
  const [version, setVersion] = useState(updatedAt);
  const [liveSlug, setLiveSlug] = useState(initial.slug);
  useUnsavedGuard(dirty);
  const preview = useMemo(() => toPreviewProject(v), [v]);

  const edit = (next: Initial) => {
    setV(next);
    setFlash(false);
    if (message?.tone === "error") setMessage(null);
  };

  const save = (status: Initial["status"] = v.status) =>
    start(async () => {
      setMessage(null);
      const next = { ...v, status };
      const sent = stableStringify(next);
      const r = await saveProject(id, next, version);
      if (r.ok) {
        setV(next);
        setErrors({});
        setVersion(r.updatedAt);
        setSaved(sent);
        setLiveSlug(next.slug);
        setFlash(true);
        setMessage({ tone: "ok", text: status === "published" ? "Saved. This project is live on the website." : "Saved as a draft. It isn't shown on the website." });
      } else {
        setErrors(r.fieldErrors ?? {});
        setMessage({ tone: "error", text: r.error });
      }
    });

  const pill: { tone: Tone; text: string } = pending
    ? { tone: "busy", text: "Saving…" }
    : message?.tone === "error"
      ? { tone: "bad", text: "Error" }
      : dirty
        ? { tone: "warn", text: "Unsaved changes" }
        : flash
          ? { tone: "ok", text: "Saved" }
          : v.status === "published"
            ? { tone: "ok", text: "Published" }
            : { tone: "warn", text: "Draft" };

  return (
    <div>
      <EditorBar backHref="/admin/work" backLabel="All projects" title={v.name || "Project"} pill={pill} savedAt={version} message={message}>
        {v.status === "published" ? (
          <>
            <a href={`/work/${liveSlug}`} target="_blank" rel="noreferrer" className={secondaryBtn}>
              View on site ↗
            </a>
            <button type="button" className={primaryBtn} onClick={() => save()} disabled={pending || !dirty}>
              Save Changes
            </button>
          </>
        ) : (
          <>
            <button type="button" className={secondaryBtn} onClick={() => save()} disabled={pending || !dirty}>
              Save Draft
            </button>
            <button type="button" className={primaryBtn} onClick={() => save("published")} disabled={pending}>
              Publish Project
            </button>
          </>
        )}
        <MoreMenu>
          {v.status === "published" && (
            <button type="button" className={menuItem} disabled={pending} onClick={() => save("draft")}>
              Unpublish (hide from website)
            </button>
          )}
          <button type="button" className={`${menuItem} text-bad`} disabled={pending} onClick={() => setConfirmDelete(true)}>
            Delete this project…
          </button>
        </MoreMenu>
      </EditorBar>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5 overflow-x-clip">
        <Section n={1} title="Basic information">
          <FieldShell label="Project name" error={errors._name} htmlFor="p-name">
            <input id="p-name" className={inputCls} value={v.name} onChange={(e) => edit({ ...v, name: e.target.value })} />
          </FieldShell>
          <FieldShell label="Category" error={errors._category} htmlFor="p-cat">
            <select id="p-cat" className={inputCls} value={v.category} onChange={(e) => edit({ ...v, category: e.target.value })}>
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Web address" help={`The project page is /work/${v.slug || "…"}. Changing it breaks links that were already shared.`} error={errors._slug} htmlFor="p-slug">
            <input id="p-slug" className={inputCls} value={v.slug} onChange={(e) => edit({ ...v, slug: e.target.value })} />
          </FieldShell>
        </Section>

        <Section n={2} title="Images and media" hint="The main picture shown on the project card and on its page. To leave the image off the page itself, hide “Main image” in Page layout below.">
          <Fields fields={MEDIA_FIELDS} value={v.body} onChange={(body) => edit({ ...v, body })} path="" errors={errors} />
        </Section>

        <Section n={3} title="Project details" hint="The story: brief, idea, key points and credits.">
          <Fields fields={DETAIL_FIELDS} value={v.body} onChange={(body) => edit({ ...v, body })} path="" errors={errors} />
        </Section>

        <Section n={4} title="Page layout" hint="Choose what appears on this project's page and in what order. Drag the handle, or use the arrows. Hide a block to leave it off completely.">
          <PageLayoutEditor value={v.body.layout} onChange={(layout) => edit({ ...v, body: { ...v.body, layout } })} />
        </Section>

        <Section n={5} title="Visibility and publishing">
          <FieldShell label="Who can see this project?" help="Draft projects never appear on the website. Published projects appear in the work archive and on their own page." error={errors._status} htmlFor="p-status">
            <select id="p-status" className={inputCls} value={v.status} onChange={(e) => edit({ ...v, status: e.target.value as Initial["status"] })}>
              <option value="draft">Draft: hidden from the website</option>
              <option value="published">Published: visible to everyone</option>
            </select>
          </FieldShell>
          <p className="text-xs text-fg/55">Changes to a published project go live as soon as you save. The preview beside the form shows your changes before you save.</p>
        </Section>
      </div>
      <section aria-label="Live preview" className="hidden min-w-0 xl:sticky xl:top-36 xl:z-10 xl:block xl:self-start">
        <ProjectLivePane project={preview} />
      </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${v.name}”?`}
        body="The project and its page are removed from the website. This can't be undone. Its images stay in the media library."
        confirmLabel="Delete project"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          start(() => deleteProject(id));
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
