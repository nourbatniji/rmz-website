"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { CONTENT_TAG } from "@/lib/content/store";
import { defaultSection, isSectionKey, sectionSchemas, SECTION_KEYS, type SectionKey } from "@/lib/content/sections";
import { requireAdminAction } from "./session";

type Json = Prisma.InputJsonValue;
export type FieldErrors = Record<string, string>;
export type SectionResult =
  | { ok: true; data?: unknown; savedAt: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

const CONFLICT = "Someone else changed this section while you were editing. Reload the page to see their version, then redo your changes.";

function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!(path in out)) out[path] = issue.message;
  }
  return out;
}

async function authed(): Promise<{ email: string } | { error: string }> {
  try {
    return await requireAdminAction();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sign in again." };
  }
}

function validate(key: string, data: unknown): { key: SectionKey; data: unknown } | { error: SectionResult & { ok: false } } {
  if (!isSectionKey(key)) return { error: { ok: false, error: "Unknown section." } };
  const parsed = sectionSchemas[key].safeParse(data);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    const n = Object.keys(errors).length;
    return { error: { ok: false, error: `${n} field${n === 1 ? " needs" : "s need"} attention. They are marked in the form.`, fieldErrors: errors } };
  }
  return { key, data: parsed.data };
}

const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

/**
 * Write a section only if nobody else changed it since the editor loaded it (`expected` = the updatedAt the editor knew,
 * or null when the section had no row yet). Two people editing the same section no longer overwrite each other silently.
 */
async function writeChecked(
  key: SectionKey,
  expected: string | null,
  create: Prisma.SiteSectionUncheckedCreateInput,
  update: Prisma.SiteSectionUpdateManyMutationInput,
): Promise<{ updatedAt: Date } | "conflict"> {
  if (expected === null) {
    try {
      return await db.siteSection.create({ data: create });
    } catch (e) {
      if (isUniqueViolation(e)) return "conflict";
      throw e;
    }
  }
  const when = new Date(expected);
  if (Number.isNaN(when.getTime())) return "conflict";
  const res = await db.siteSection.updateMany({ where: { key, updatedAt: when }, data: update });
  if (res.count === 0) return "conflict";
  return (await db.siteSection.findUnique({ where: { key }, select: { updatedAt: true } })) ?? "conflict";
}

/** Save the editor's content as the draft. Visitors keep seeing the published version. */
export async function saveSectionDraft(key: string, data: unknown, expectedUpdatedAt: string | null): Promise<SectionResult> {
  const who = await authed();
  if ("error" in who) return { ok: false, error: who.error };
  const v = validate(key, data);
  if ("error" in v) return v.error;
  const row = await writeChecked(v.key, expectedUpdatedAt, { key: v.key, draft: v.data as Json, updatedBy: who.email }, { draft: v.data as Json, updatedBy: who.email });
  if (row === "conflict") return { ok: false, error: CONFLICT };
  updateTag(CONTENT_TAG); // the admin preview reads drafts through the same tagged cache
  return { ok: true, savedAt: row.updatedAt.toISOString() };
}

/** Save the editor's content and make it live. */
export async function publishSection(key: string, data: unknown, expectedUpdatedAt: string | null): Promise<SectionResult> {
  const who = await authed();
  if ("error" in who) return { ok: false, error: who.error };
  const v = validate(key, data);
  if ("error" in v) return v.error;
  const now = new Date();
  const row = await writeChecked(
    v.key,
    expectedUpdatedAt,
    { key: v.key, draft: v.data as Json, published: v.data as Json, publishedAt: now, updatedBy: who.email },
    { draft: v.data as Json, published: v.data as Json, publishedAt: now, updatedBy: who.email },
  );
  if (row === "conflict") return { ok: false, error: CONFLICT };
  updateTag(CONTENT_TAG);
  return { ok: true, savedAt: row.updatedAt.toISOString() };
}

/** Throw away unpublished changes: the draft goes back to what is live (or the built-in content if never published). */
export async function discardDraft(key: string): Promise<SectionResult> {
  const who = await authed();
  if ("error" in who) return { ok: false, error: who.error };
  if (!isSectionKey(key)) return { ok: false, error: "Unknown section." };
  const row = await db.siteSection.findUnique({ where: { key } });
  const data = (row?.published ?? defaultSection(key)) as Json;
  const saved = await db.siteSection.upsert({
    where: { key },
    create: { key, draft: data, updatedBy: who.email },
    update: { draft: data, updatedBy: who.email },
  });
  updateTag(CONTENT_TAG);
  return { ok: true, data, savedAt: saved.updatedAt.toISOString() };
}

/** Put the built-in content (the original dev copy) into the draft. Publishing is still a separate step. */
export async function resetSectionToDefault(key: string): Promise<SectionResult> {
  const who = await authed();
  if ("error" in who) return { ok: false, error: who.error };
  if (!isSectionKey(key)) return { ok: false, error: "Unknown section." };
  const data = defaultSection(key) as Json;
  const saved = await db.siteSection.upsert({
    where: { key },
    create: { key, draft: data, updatedBy: who.email },
    update: { draft: data, updatedBy: who.email },
  });
  updateTag(CONTENT_TAG);
  return { ok: true, data, savedAt: saved.updatedAt.toISOString() };
}

/** First-run helper: copy the built-in content into every section that has no row yet, as published. Safe to click twice. */
export async function importBuiltInContent(): Promise<{ ok: boolean; created: number; error?: string }> {
  const who = await authed();
  if ("error" in who) return { ok: false, created: 0, error: who.error };
  const now = new Date();
  const rows = SECTION_KEYS.map((key) => {
    const data = defaultSection(key) as Json;
    return { key, draft: data, published: data, publishedAt: now, updatedBy: who.email };
  });
  const res = await db.siteSection.createMany({ data: rows, skipDuplicates: true });
  if (res.count) updateTag(CONTENT_TAG);
  return { ok: true, created: res.count };
}
