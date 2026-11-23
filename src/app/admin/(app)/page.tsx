import Link from "next/link";
import { ImportBuiltInButton } from "@/components/admin/ImportBuiltInButton";
import { needsList, sectionPill } from "@/components/admin/SectionStatus";
import { card, primaryBtn, secondaryBtn, StatusPill } from "@/components/admin/ui";
import { fmtAgo } from "@/lib/admin/format";
import { SECTION_META, PAGE_ORDER, type SectionKey } from "@/lib/admin/section-meta";
import { getSectionStates } from "@/lib/admin/section-status";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";

export const metadata = { title: "Overview" };

const coverOf = (body: unknown) => {
  const s = (body as { image?: { src?: unknown } | null } | null)?.image?.src;
  return typeof s === "string" ? s : null;
};

export default async function OverviewPage() {
  await requireAdmin();
  const [states, projectRows, unread, messages] = await Promise.all([
    getSectionStates(),
    db.project.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true, status: true, body: true, updatedAt: true, updatedBy: true } }),
    db.contactMessage.count({ where: { read: false } }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, name: true, message: true, createdAt: true, read: true } }),
  ]);

  const byKey = new Map(states.map((s) => [s.key, s]));
  const order: SectionKey[] = ["site", ...PAGE_ORDER];
  const unpublished = states.filter((s) => !s.fromDefault && !s.invalid && s.draftChanges);
  const broken = states.filter((s) => s.invalid);
  const missingRows = states.filter((s) => s.fromDefault).length;
  const placeholders = states.reduce((n, s) => n + s.placeholders, 0);
  const missingMedia = states.reduce((n, s) => n + s.missingMedia, 0);
  const published = projectRows.filter((p) => p.status === "published").length;
  const drafts = projectRows.length - published;

  type Attention = { tone: "bad" | "warn" | "neutral"; text: string; href: string; cta: string };
  const attention: Attention[] = [
    ...broken.map((s): Attention => ({ tone: "bad", text: `${SECTION_META[s.key].label} needs fixing: its saved content is incomplete, so the site is using the original content.`, href: `/admin/website/${s.key}`, cta: "Fix it" })),
    ...unpublished.map((s): Attention => ({ tone: "warn", text: `${SECTION_META[s.key].label} has changes that aren't live yet${s.updatedBy ? ` (saved by ${s.updatedBy}, ${fmtAgo(s.updatedAt)})` : ""}.`, href: `/admin/website/${s.key}`, cta: "Review and publish" })),
    ...(unread > 0 ? [{ tone: "warn", text: `${unread} unread message${unread === 1 ? "" : "s"} from the contact form.`, href: "/admin/messages", cta: "Read" } as Attention] : []),
    ...(drafts > 0 ? [{ tone: "neutral", text: `${drafts} project${drafts === 1 ? " is a draft" : "s are drafts"} and not shown on the website.`, href: "/admin/work?status=draft", cta: "See drafts" } as Attention] : []),
    ...(placeholders + missingMedia > 0 ? [{ tone: "neutral", text: `${placeholders} placeholder text${placeholders === 1 ? "" : "s"} and ${missingMedia} missing image${missingMedia === 1 ? "" : "s"}/video still to supply before launch.`, href: "/admin/website", cta: "Find them" } as Attention] : []),
  ];

  // One merged "recently edited" list from everything that records who/when.
  const activity = [
    ...states.filter((s) => s.updatedAt).map((s) => ({ at: s.updatedAt as Date, by: s.updatedBy, text: `${SECTION_META[s.key].label} (website)`, href: `/admin/website/${s.key}` })),
    ...projectRows.slice(0, 6).map((p) => ({ at: p.updatedAt, by: p.updatedBy, text: `Project: ${p.name}`, href: `/admin/work/${p.id}` })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 7);

  return (
    <div className="mx-auto grid max-w-7xl gap-5">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-0.5 text-sm text-fg/60">What needs attention, and what was edited recently.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/admin/work?new=1" className={primaryBtn}>
            + Add Project
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className={secondaryBtn}>
            View live site ↗
          </a>
        </div>
      </header>

      {missingRows > 0 && (
        <section className="rounded-xl border border-warn/30 bg-warn/10 p-4">
          <p className="text-sm text-warn">
            {missingRows} of {states.length} website sections haven&apos;t been saved yet, so the site shows its original content for them. Import it once, then edit and publish from here.
          </p>
          <div className="mt-3">
            <ImportBuiltInButton />
          </div>
        </section>
      )}

      <section aria-labelledby="attn" className={`${card} p-4`}>
        <h2 id="attn" className="text-sm font-semibold">
          Needs attention
        </h2>
        {attention.length === 0 ? (
          <p className="mt-2 text-sm text-fg/60">All caught up: everything is published and there are no unread messages.</p>
        ) : (
          <ul className="mt-2 divide-y divide-fg/8">
            {attention.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-2 text-sm">
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${a.tone === "bad" ? "bg-bad" : a.tone === "warn" ? "bg-warn" : "bg-fg/30"}`} />
                <span className="min-w-0 flex-1">{a.text}</span>
                <Link href={a.href} className="shrink-0 font-medium text-accent hover:underline">
                  {a.cta} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section aria-labelledby="sec" className={`${card} overflow-hidden`}>
          <div className="flex items-center gap-3 border-b border-fg/8 px-4 py-3">
            <h2 id="sec" className="text-sm font-semibold">
              Website sections
            </h2>
            <Link href="/admin/website" className="ml-auto text-sm font-medium text-accent hover:underline">
              Open Website →
            </Link>
          </div>
          <ul className="divide-y divide-fg/8">
            {order.map((k) => {
              const s = byKey.get(k)!;
              const pill = sectionPill(s);
              const needs = needsList(s);
              return (
                <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)_auto]">
                  <Link href={`/admin/website/${k}`} className="truncate font-medium hover:text-accent">
                    {SECTION_META[k].label}
                  </Link>
                  <StatusPill tone={pill.tone}>{pill.text}</StatusPill>
                  <span className="col-span-2 truncate text-xs text-fg/55 sm:col-span-1">{needs.length ? needs.join(" · ") : "Nothing outstanding"}</span>
                  <span className="hidden text-xs text-fg/45 sm:block">{fmtAgo(s.updatedAt)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid content-start gap-5">
          <section aria-labelledby="proj" className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-fg/8 px-4 py-3">
              <h2 id="proj" className="text-sm font-semibold">
                Projects
              </h2>
              <span className="text-xs text-fg/55">
                {published} published · {drafts} draft
              </span>
              <Link href="/admin/work" className="ml-auto text-sm font-medium text-accent hover:underline">
                All →
              </Link>
            </div>
            {projectRows.length === 0 ? (
              <p className="p-4 text-sm text-fg/60">No projects yet, so the site shows its built-in demo projects.</p>
            ) : (
              <ul className="divide-y divide-fg/8">
                {projectRows.slice(0, 5).map((p) => {
                  const cover = coverOf(p.body);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="h-9 w-14 shrink-0 overflow-hidden rounded bg-fg/8">
                        {cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <Link href={`/admin/work/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">
                        {p.name}
                      </Link>
                      <StatusPill tone={p.status === "published" ? "ok" : "warn"}>{p.status === "published" ? "Published" : "Draft"}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="msg" className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-fg/8 px-4 py-3">
              <h2 id="msg" className="text-sm font-semibold">
                Messages
              </h2>
              <span className="text-xs text-fg/55">{unread} unread</span>
              <Link href="/admin/messages" className="ml-auto text-sm font-medium text-accent hover:underline">
                Open →
              </Link>
            </div>
            {messages.length === 0 ? (
              <p className="p-4 text-sm text-fg/60">No messages yet. They will appear here once the contact form is live.</p>
            ) : (
              <ul className="divide-y divide-fg/8">
                {messages.map((m) => (
                  <li key={m.id} className="px-4 py-2 text-sm">
                    <p className="flex items-center gap-2 font-medium">
                      {!m.read && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-accent" />}
                      {m.name}
                      <span className="ml-auto text-xs font-normal text-fg/45">{fmtAgo(m.createdAt)}</span>
                    </p>
                    <p className="truncate text-xs text-fg/60">{m.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="act" className={`${card} p-4`}>
            <h2 id="act" className="text-sm font-semibold">
              Recently edited
            </h2>
            {activity.length === 0 ? (
              <p className="mt-2 text-sm text-fg/60">Nothing edited yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-fg/8">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-baseline gap-2 py-1.5 text-sm">
                    <Link href={a.href} className="min-w-0 flex-1 truncate hover:text-accent">
                      {a.text}
                    </Link>
                    <span className="shrink-0 text-xs text-fg/45">
                      {a.by ? `${a.by.split("@")[0]} · ` : ""}
                      {fmtAgo(a.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
