/**
 * Homepage anchor map — the ONE list of real DOM ids that links may target. Dashboard section keys are NOT ids (e.g. the "minds" content key is the #team section).
 *
 *   #top        page top (<main>)                 #showreel   showreel video (corridor)
 *   #statement  rotating statement                #about      About steps
 *   #services   services lens                     #team       team (Minds)
 *   #work       work archive                      #partners   collaborations
 *   #contact    contact form                      #footer     closing footer
 *
 * Old ids kept alive for bookmarks and saved dashboard links. They are NOT DOM ids (no duplicates): AnchorAliases rewrites the hash to the new id and scrolls.
 * `#work` (once the showreel) and `#contact` (once the page end) kept their names and now mean the work archive and the contact form.
 */
export const ANCHOR_ALIASES: Readonly<Record<string, string>> = {
  selected: "about",
  "work-archive": "work",
  minds: "team",
  collaborations: "partners",
  "contact-form": "contact",
};

/** The target id of a same-page link ("#x" or "/#x"), with old ids mapped to their current ones; null for anything else. */
export function anchorIdOf(href: string): string | null {
  const m = /^\/?#([^/?]+)$/.exec(href);
  if (!m) return null;
  return ANCHOR_ALIASES[m[1]] ?? m[1];
}
