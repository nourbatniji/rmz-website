import Link from "next/link";
import { ImportBuiltInButton } from "@/components/admin/ImportBuiltInButton";
import { SectionThumb } from "@/components/admin/SectionThumb";
import { needsList, sectionPill } from "@/components/admin/SectionStatus";
import { card, secondaryBtn, StatusPill } from "@/components/admin/ui";
import { fmtAgo } from "@/lib/admin/format";
import { PAGE_ORDER, SECTION_META, type SectionKey } from "@/lib/admin/section-meta";
import { getSectionStates } from "@/lib/admin/section-status";
import { requireAdmin } from "@/lib/admin/session";
import { defaultSection } from "@/lib/content/sections";
import { db } from "@/lib/db";

export const metadata = { title: "Website" };

export default async function WebsitePage() {
  await requireAdmin();
  const [states, rows] = await Promise.all([getSectionStates(), db.siteSection.findMany({ select: { key: true, draft: true } })]);
  const byKey = new Map(states.map((s) => [s.key, s]));
  const draftOf = new Map(rows.map((r) => [r.key, r.draft]));
  const order: SectionKey[] = ["site", ...PAGE_ORDER];
  const missing = states.filter((s) => s.fromDefault).length;
  const pending = states.filter((s) => !s.fromDefault && s.draftChanges && !s.invalid).length;

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Website</h1>
          <p className="mt-0.5 text-sm text-fg/60">
            The homepage from top to bottom, in the order visitors scroll through it. {pending > 0 ? `${pending} section${pending === 1 ? " has" : "s have"} unpublished changes.` : "Everything saved is published."}
          </p>
        </div>
        <a href="/admin/preview" target="_blank" rel="noreferrer" className={`${secondaryBtn} ml-auto`}>
          Preview the whole homepage (draft) ↗
        </a>
      </header>

      {missing > 0 && (
        <section className="rounded-xl border border-warn/30 bg-warn/10 p-4">
          <p className="text-sm text-warn">
            {missing} of {states.length} sections haven&apos;t been saved yet, so the website shows its original content for them. Import it once, then edit and publish from here.
          </p>
          <div className="mt-3">
            <ImportBuiltInButton />
          </div>
        </section>
      )}

      <section className={`${card} overflow-hidden`}>
        <div className="hidden grid-cols-[2rem_4rem_minmax(0,1.4fr)_9.5rem_minmax(0,1fr)_7rem_4.5rem] items-center gap-3 border-b border-fg/8 bg-fg/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-fg/50 lg:grid">
          <span>#</span>
          <span />
          <span>Section</span>
          <span>Status</span>
          <span>Still to supply</span>
          <span>Last saved</span>
          <span />
        </div>
        <ol className="divide-y divide-fg/8">
          {order.map((key, i) => {
            const s = byKey.get(key)!;
            const meta = SECTION_META[key];
            const pill = sectionPill(s);
            const needs = needsList(s);
            return (
              <li key={key} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 lg:grid-cols-[2rem_4rem_minmax(0,1.4fr)_9.5rem_minmax(0,1fr)_7rem_4.5rem]">
                <span className="hidden text-sm tabular-nums text-fg/45 lg:block">{key === "site" ? "—" : i}</span>
                <SectionThumb content={draftOf.get(key) ?? defaultSection(key)} />
                <div className="min-w-0">
                  <Link href={`/admin/website/${key}`} className="block truncate text-sm font-semibold hover:text-accent">
                    {meta.label}
                  </Link>
                  <p className="truncate text-xs text-fg/55">{meta.about}</p>
                </div>
                <span className="justify-self-start max-lg:col-start-2 max-lg:row-start-2 lg:justify-self-auto">
                  <StatusPill tone={pill.tone}>{pill.text}</StatusPill>
                </span>
                <span className="col-span-3 truncate text-xs text-fg/55 lg:col-span-1">{needs.length ? needs.join(" · ") : "Nothing outstanding"}</span>
                <span className="hidden text-xs text-fg/50 lg:block">
                  {fmtAgo(s.updatedAt)}
                  {s.updatedBy && <span className="block truncate text-fg/40">{s.updatedBy.split("@")[0]}</span>}
                </span>
                <Link href={`/admin/website/${key}`} className={`${secondaryBtn} !px-3 !py-1.5 justify-self-end max-lg:col-start-3 max-lg:row-start-1`}>
                  Edit
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-xs text-fg/55">
        The order of these sections is fixed on purpose: the homepage&apos;s scroll animations are built around this exact sequence. Lists inside a section (featured projects, team, header links) can be reordered when you edit it.
      </p>
    </div>
  );
}
