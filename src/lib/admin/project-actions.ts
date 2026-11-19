"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { devWorkContent } from "@/content/dev/work";
import { projectBodySchema, projectCategorySchema, projectSlugSchema, type ProjectBody } from "@/content/schemas";
import { CONTENT_TAG } from "@/lib/content/store";
import { db } from "@/lib/db";
import { requireAdminAction } from "./session";

type Json = Prisma.InputJsonValue;
export type ProjectResult = { ok: true; updatedAt: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };
export type CreateState = { error?: string };

const idSchema = z.string().min(1).max(64);
const statusSchema = z.enum(["draft", "published"]);
const CONFLICT = "Someone else changed or deleted this project while you were editing. Reload the page, then redo your changes.";

const CATEGORY_LABEL: Record<string, string> = { brand: "Brand identity", camp: "Campaign", dig: "Digital experience", cont: "Content and production" };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

function blankBody(category: string): ProjectBody {
  return {
    discipline: CATEGORY_LABEL[category] ?? "Project",
    year: String(new Date().getFullYear()),
    client: null,
    palette: ["#0F0F0E", "#2A2A28", "#FFCA26", "#F3E8CC"],
    image: null,
    about: "",
    services: "",
    brief: "",
    idea: "",
    keys: [],
    deliverables: [],
    credits: [],
    copyStatus: "placeholder",
  };
}

async function authed(): Promise<{ email: string } | { error: string }> {
  try {
    return await requireAdminAction();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sign in again." };
  }
}

export async function createProject(_prev: CreateState, form: FormData): Promise<CreateState> {
  const who = await authed();
  if ("error" in who) return who;
  const name = String(form.get("name") ?? "").trim();
  const category = projectCategorySchema.safeParse(form.get("category"));
  const slug = projectSlugSchema.safeParse(String(form.get("slug") ?? "").trim() || slugify(name));
  if (!name) return { error: "Enter a project name." };
  if (name.length > 120) return { error: "Keep the name under 120 characters." };
  if (!category.success) return { error: "Choose a category." };
  if (!slug.success) return { error: slug.error.issues[0]?.message ?? "Check the slug." };
  if (await db.project.findUnique({ where: { slug: slug.data } })) return { error: "That slug is already used by another project." };
  const last = await db.project.aggregate({ _max: { order: true } });
  let row;
  try {
    row = await db.project.create({
      data: { name, slug: slug.data, category: category.data, order: (last._max.order ?? 0) + 1, body: blankBody(category.data) as Json, updatedBy: who.email },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "That slug is already used by another project." };
    throw e;
  }
  updateTag(CONTENT_TAG);
  redirect(`/admin/work/${row.id}`);
}

/** `expectedUpdatedAt` = the version the editor loaded; if someone else saved since, nothing is overwritten. */
export async function saveProject(
  id: string,
  input: { name: string; slug: string; category: string; status: "draft" | "published"; body: unknown },
  expectedUpdatedAt: string,
): Promise<ProjectResult> {
  const who = await authed();
  if ("error" in who) return { ok: false, error: who.error };
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Unknown project." };
  const fieldErrors: Record<string, string> = {};
  const name = String(input?.name ?? "").trim();
  if (!name) fieldErrors._name = "Name is required";
  else if (name.length > 120) fieldErrors._name = "Keep it under 120 characters";
  const slug = projectSlugSchema.safeParse(input?.slug);
  if (!slug.success) fieldErrors._slug = slug.error.issues[0]?.message ?? "Check the slug";
  const category = projectCategorySchema.safeParse(input?.category);
  if (!category.success) fieldErrors._category = "Choose a category";
  const status = statusSchema.safeParse(input?.status);
  if (!status.success) fieldErrors._status = "Choose Draft or Published";
  const body = projectBodySchema.safeParse(input?.body);
  if (!body.success) for (const i of body.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
  if (Object.keys(fieldErrors).length || !slug.success || !category.success || !status.success || !body.success) {
    const n = Object.keys(fieldErrors).length;
    return { ok: false, error: `${n} field${n === 1 ? " needs" : "s need"} attention. They are marked in the form.`, fieldErrors };
  }
  const clash = await db.project.findFirst({ where: { slug: slug.data, NOT: { id } }, select: { id: true } });
  if (clash) return { ok: false, error: "That slug is already used by another project.", fieldErrors: { _slug: "Already in use" } };
  const when = new Date(expectedUpdatedAt);
  if (Number.isNaN(when.getTime())) return { ok: false, error: CONFLICT };
  try {
    const res = await db.project.updateMany({
      where: { id, updatedAt: when },
      data: { name, slug: slug.data, category: category.data, status: status.data, body: body.data as Json, updatedBy: who.email },
    });
    if (res.count === 0) return { ok: false, error: CONFLICT };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "That slug is already used by another project.", fieldErrors: { _slug: "Already in use" } };
    throw e;
  }
  updateTag(CONTENT_TAG);
  const row = await db.project.findUnique({ where: { id }, select: { updatedAt: true } });
  return row ? { ok: true, updatedAt: row.updatedAt.toISOString() } : { ok: false, error: CONFLICT };
}

export async function deleteProject(id: string): Promise<void> {
  await requireAdminAction();
  if (idSchema.safeParse(id).success) await db.project.delete({ where: { id } }).catch(() => undefined);
  updateTag(CONTENT_TAG);
  redirect("/admin/work");
}

export async function setProjectStatus(id: string, status: "draft" | "published"): Promise<void> {
  const who = await requireAdminAction();
  const s = statusSchema.safeParse(status);
  if (!idSchema.safeParse(id).success || !s.success) return;
  await db.project.updateMany({ where: { id }, data: { status: s.data, updatedBy: who.email } });
  updateTag(CONTENT_TAG);
}

/** Swap a project with its neighbour in display order. */
export async function moveProject(id: string, direction: -1 | 1): Promise<void> {
  await requireAdminAction();
  if (!idSchema.safeParse(id).success || (direction !== -1 && direction !== 1)) return;
  const rows = await db.project.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = rows.findIndex((r) => r.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const ids = rows.map((r) => r.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await db.$transaction(ids.map((rid, idx) => db.project.update({ where: { id: rid }, data: { order: idx + 1 } })));
  updateTag(CONTENT_TAG);
}

/** Save a new display order. `orderedIds` must be exactly the current set of project ids (nothing added or missing), so a stale page can't drop or resurrect projects. */
export async function reorderProjects(orderedIds: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const who = await authed();
  if ("error" in who) return { ok: false, error: who.error };
  const parsed = z.array(idSchema).max(500).safeParse(orderedIds);
  if (!parsed.success || new Set(parsed.data).size !== parsed.data.length) return { ok: false, error: "That order isn't valid. Reload the page and try again." };
  const current = await db.project.findMany({ select: { id: true } });
  if (current.length !== parsed.data.length || !current.every((r) => parsed.data.includes(r.id))) {
    return { ok: false, error: "The project list changed while you were editing. Reload the page and try again." };
  }
  await db.$transaction(parsed.data.map((id, i) => db.project.update({ where: { id }, data: { order: i + 1 } })));
  updateTag(CONTENT_TAG);
  return { ok: true };
}

/** First-run helper: copy the built-in demo projects into the table (published, so the site looks the same) to edit them. */
export async function importDemoProjects(): Promise<{ ok: boolean; created: number; error?: string }> {
  const who = await authed();
  if ("error" in who) return { ok: false, created: 0, error: who.error };
  if ((await db.project.count()) > 0) return { ok: false, created: 0, error: "The table already has projects." };
  const data = devWorkContent.projects.map((p, i) => {
    const { slug, name, category, number: _n, ...rest } = p;
    void _n;
    const body = projectBodySchema.parse(rest);
    return { slug, name, category, status: "published" as const, order: i + 1, body: body as Json, updatedBy: who.email };
  });
  const res = await db.project.createMany({ data, skipDuplicates: true });
  updateTag(CONTENT_TAG);
  return { ok: true, created: res.count };
}
