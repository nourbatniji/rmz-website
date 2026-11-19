import "server-only";
import { devClosingContent } from "@/content/dev/closing";
import type { CollectiveContent, FooterContent } from "@/content/closing-types";

/**
 * The ONLY way UI code reads the Collaborations + Footer content. Static for now (built-in demo content);
 * wiring these two sections into the admin / database is a follow-up (see docs/closing-sections.md).
 */
export async function getCollectiveContent(): Promise<CollectiveContent> {
  return devClosingContent.collective;
}
export async function getFooterContent(): Promise<FooterContent> {
  return devClosingContent.footer;
}
