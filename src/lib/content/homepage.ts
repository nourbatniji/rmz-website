import "server-only";
import { cache } from "react";
import { devHomepageContent } from "@/content/dev/homepage";
import type { HomepageContent } from "@/content/types";

/**
 * The ONLY way UI code reads homepage content.
 *
 * Milestone 1: returns development content.
 * Later: read from Prisma (src/lib/db.ts) and map rows onto `HomepageContent`.
 * Server-only — never import this from a client component, and never expose a write path here.
 */
export const getHomepageContent = cache(async (): Promise<HomepageContent> => {
  return devHomepageContent;
});
