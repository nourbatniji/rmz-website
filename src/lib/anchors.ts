/**
 * Homepage anchor map — the ONE list of real DOM ids that links may target. Dashboard section keys are NOT ids (e.g. the "featured" content key is the #about section).
 *
 *   #top        page top (<main>)                 #showreel   showreel video (corridor)
 *   #statement  rotating statement                #about      About steps
 *   #services   services lens                     #minds      team (Minds)
 *   #work       work archive                      #collaborations  partner logos
 *   #contact    contact form                      #footer     closing footer
 *
 * Alternative / old ids kept alive for bookmarks and saved dashboard links (#team, #partners, #selected, #work-archive, #contact-form). They are NOT DOM ids (no duplicates): AnchorAliases rewrites the hash to the new id and scrolls.
 * `#work` (once the showreel) and `#contact` (once the page end) kept their names and now mean the work archive and the contact form.
 */
export const ANCHOR_ALIASES: Readonly<Record<string, string>> = {
  selected: "about",
  "work-archive": "work",
  team: "minds",
  partners: "collaborations",
  "contact-form": "contact",
};

/** The target id of a same-page link ("#x" or "/#x"), with old ids mapped to their current ones; null for anything else. */
export function anchorIdOf(href: string): string | null {
  const m = /^\/?#([^/?]+)$/.exec(href);
  if (!m) return null;
  return ANCHOR_ALIASES[m[1]] ?? m[1];
}
