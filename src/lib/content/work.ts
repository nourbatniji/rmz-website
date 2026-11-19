import "server-only";
import { cache } from "react";
import { devWorkContent } from "@/content/dev/work";
import { toWorkProject } from "@/content/schemas";
import type { WorkContent, WorkProject } from "@/content/work-types";
import { defaultSection, sectionSchemas } from "./sections";
import { readProjects, readSections } from "./store";

type Intro = Omit<WorkContent, "projects">;

/**
 * The ONLY way UI code reads Work content (archive + project pages).
 * Intro copy comes from the `workIntro` section, projects from the Project table (published only, or all when `draft`).
 * An empty Project table falls back to the built-in demo projects. Server-only.
 */
const load = cache(async (draft: boolean): Promise<WorkContent> => {
  const sections = await readSections(draft);
  const parsed = sectionSchemas.workIntro.safeParse(sections.workIntro);
  const intro = (parsed.success ? parsed.data : defaultSection("workIntro")) as Intro;

  const rows = await readProjects(draft);
  if (rows === null) return { ...intro, projects: devWorkContent.projects };

  const projects: WorkProject[] = [];
  for (const row of rows) {
    const p = toWorkProject(row, String(projects.length + 1).padStart(2, "0"));
    if (p) projects.push(p);
  }
  return { ...intro, projects };
});

export function getWorkContent(opts?: { draft?: boolean }): Promise<WorkContent> {
  return load(!!opts?.draft);
}

export const getWorkProject = cache(
  async (slug: string): Promise<{ project: WorkProject; prev: WorkProject; next: WorkProject; contact: WorkContent["contact"] } | null> => {
    const { projects, contact } = await getWorkContent();
    const i = projects.findIndex((p) => p.slug === slug);
    if (i < 0) return null;
    return { project: projects[i], prev: projects[(i + projects.length - 1) % projects.length], next: projects[(i + 1) % projects.length], contact };
  },
);
