import "server-only";
import type { CollectiveContent, ContactContent, FooterContent } from "@/content/closing-types";
import { devClosingContent } from "@/content/dev/closing";
import { defaultSection, sectionSchemas } from "./sections";
import { readSections } from "./store";

/**
 * The ONLY way UI code reads the Contact form + Footer content: the published section from Postgres (the draft in the admin preview),
 * falling back to the built-in content when a section is missing or invalid, so the page always renders.
 */
export async function getCollectiveContent(): Promise<CollectiveContent> {
  return devClosingContent.collective;
}
export async function getFooterContent(opts?: { draft?: boolean }): Promise<FooterContent> {
  const rows = await readSections(!!opts?.draft);
  const parsed = sectionSchemas.footer.safeParse(rows.footer);
  return (parsed.success ? parsed.data : defaultSection("footer")) as FooterContent;
}
export async function getContactContent(opts?: { draft?: boolean }): Promise<ContactContent> {
  const rows = await readSections(!!opts?.draft);
  const parsed = sectionSchemas.contact.safeParse(rows.contact);
  return (parsed.success ? parsed.data : defaultSection("contact")) as ContactContent;
}
