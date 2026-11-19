"use server";

import { del } from "@vercel/blob";
import { updateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { CONTENT_TAG } from "@/lib/content/store";
import { db } from "@/lib/db";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES, type MediaRecord } from "./media-types";
import { swapMediaRefs } from "./media-swap";
import { isSectionKey, SECTION_META } from "./section-meta";
import { requireAdminAction } from "./session";

type Row = { id: string; url: string; pathname: string; kind: string; mime: string; bytes: number; width: number | null; height: number | null; alt: string | null; createdAt: Date };
const toRecord = (r: Row): MediaRecord => ({ ...r, kind: r.kind === "video" ? "video" : "image", createdAt: r.createdAt.toISOString() });

/** Files only ever live on our own Vercel Blob store, so anything else is refused. */
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;
const isBlobUrl = (u: string) => {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && BLOB_HOST.test(x.hostname);
  } catch {
    return false;
  }
};

const registerSchema = z
  .object({
    url: z.string().max(600).refine(isBlobUrl, "Not an uploaded file address"),
    pathname: z.string().min(1).max(300),
    mime: z.string().min(1).max(100),
    bytes: z.number().int().nonnegative(),
    kind: z.enum(["image", "video"]),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
  })
  .refine((d) => (d.kind === "video" ? VIDEO_TYPES.includes(d.mime) && d.bytes <= MAX_VIDEO_BYTES : IMAGE_TYPES.includes(d.mime) && d.bytes <= MAX_IMAGE_BYTES), "File type or size not allowed");

const idSchema = z.string().min(1).max(64);
type Json = Prisma.InputJsonValue;

/** Record an uploaded file in the library (called by the browser right after the direct upload finishes). */
export async function registerMedia(input: z.input<typeof registerSchema>): Promise<MediaRecord> {
  await requireAdminAction();
  const data = registerSchema.parse(input);
  const row = await db.media.upsert({ where: { url: data.url }, update: {}, create: data });
  return toRecord(row);
}

export async function listMedia(kind?: "image" | "video"): Promise<MediaRecord[]> {
  await requireAdminAction();
  const rows = await db.media.findMany({ where: kind ? { kind } : {}, orderBy: { createdAt: "desc" }, take: 300 });
  return rows.map(toRecord);
}

export async function updateMediaAlt(id: string, alt: string): Promise<void> {
  await requireAdminAction();
  if (!idSchema.safeParse(id).success) return;
  await db.media.updateMany({ where: { id }, data: { alt: String(alt ?? "").trim().slice(0, 300) || null } });
}

export type MediaUse = { label: string; href: string };

/** Where each URL is used, in words an editor understands. Deleting a file that is in use would leave broken images. */
async function usageIndex(): Promise<(url: string) => MediaUse[]> {
  const [sections, projects] = await Promise.all([
    db.siteSection.findMany({ select: { key: true, draft: true, published: true } }),
    db.project.findMany({ select: { id: true, name: true, body: true } }),
  ]);
  const secText = sections.map((s) => ({ key: s.key, text: JSON.stringify([s.draft, s.published]) }));
  const projText = projects.map((p) => ({ id: p.id, name: p.name, text: JSON.stringify(p.body) }));
  return (url) => [
    ...secText.filter((s) => s.text.includes(url)).map((s) => ({ label: isSectionKey(s.key) ? `Website: ${SECTION_META[s.key].label}` : `Website: ${s.key}`, href: `/admin/website/${s.key}` })),
    ...projText.filter((p) => p.text.includes(url)).map((p) => ({ label: `Project: ${p.name}`, href: `/admin/work/${p.id}` })),
  ];
}

/** For the media page: a map of media id → the places that use it. */
export async function getMediaUsage(): Promise<Record<string, MediaUse[]>> {
  await requireAdminAction();
  const [rows, usageOf] = await Promise.all([db.media.findMany({ select: { id: true, url: true }, take: 500, orderBy: { createdAt: "desc" } }), usageIndex()]);
  return Object.fromEntries(rows.map((r) => [r.id, usageOf(r.url)]).filter(([, u]) => (u as MediaUse[]).length > 0));
}

export async function deleteMedia(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminAction();
  if (!idSchema.safeParse(id).success) return { ok: true };
  const row = await db.media.findUnique({ where: { id } });
  if (!row) return { ok: true };
  const used = (await usageIndex())(row.url);
  if (used.length) return { ok: false, error: `This file is still used in ${used.map((u) => u.label).join(", ")}. Choose a different file there first, then delete it.` };
  // Remove it from the library first, then from storage. If storage fails the library is still clean (the file just lingers unseen).
  await db.media.delete({ where: { id } }).catch(() => undefined);
  try {
    await del(row.url);
  } catch {
    /* the file stays in storage; nothing in the dashboard points at it any more */
  }
  return { ok: true };
}

/**
 * Swap one library file for another everywhere it is used (website sections, draft and published, and project bodies), then remove the old file.
 * Both files must be the same kind. Image width/height next to a swapped image are updated to the new file's. All-or-nothing: if any row was edited by
 * someone else while this ran, nothing changes.
 */
export async function replaceMedia(oldId: string, newId: string): Promise<{ ok: true; replaced: number } | { ok: false; error: string }> {
  const who = await requireAdminAction().catch(() => null);
  if (!who) return { ok: false, error: "Your session expired. Sign in again." };
  if (!idSchema.safeParse(oldId).success || !idSchema.safeParse(newId).success || oldId === newId) return { ok: false, error: "Choose a different file." };
  const [oldM, newM] = await Promise.all([db.media.findUnique({ where: { id: oldId } }), db.media.findUnique({ where: { id: newId } })]);
  if (!oldM || !newM) return { ok: false, error: "One of the files is no longer in the library. Reload the page." };
  if (oldM.kind !== newM.kind) return { ok: false, error: `The new file must be ${oldM.kind === "video" ? "a video" : "an image"} too.` };

  const swap = (value: unknown) => swapMediaRefs(value, oldM.url, newM);

  const [sections, projects] = await Promise.all([
    db.siteSection.findMany({ select: { key: true, draft: true, published: true, updatedAt: true } }),
    db.project.findMany({ select: { id: true, body: true, updatedAt: true } }),
  ]);
  let replaced = 0;
  try {
    await db.$transaction(async (tx) => {
      for (const sec of sections) {
        const d = swap(sec.draft);
        const p = sec.published == null ? { value: null, hits: 0 } : swap(sec.published);
        if (!d.hits && !p.hits) continue;
        const data: Prisma.SiteSectionUpdateManyMutationInput = { draft: d.value as Json, updatedBy: who.email };
        if (sec.published != null) data.published = p.value as Json;
        const r = await tx.siteSection.updateMany({ where: { key: sec.key, updatedAt: sec.updatedAt }, data });
        if (r.count === 0) throw new Error("conflict");
        replaced++;
      }
      for (const pr of projects) {
        const b = swap(pr.body);
        if (!b.hits) continue;
        const r = await tx.project.updateMany({ where: { id: pr.id, updatedAt: pr.updatedAt }, data: { body: b.value as Json, updatedBy: who.email } });
        if (r.count === 0) throw new Error("conflict");
        replaced++;
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "conflict") return { ok: false, error: "Someone edited one of those places while the file was being swapped, so nothing was changed. Try again." };
    throw e;
  }
  updateTag(CONTENT_TAG);
  // Nothing refers to the old file now: remove it from the library, then from storage.
  await db.media.delete({ where: { id: oldId } }).catch(() => undefined);
  try {
    await del(oldM.url);
  } catch {
    /* it lingers in storage unseen */
  }
  return { ok: true, replaced };
}
