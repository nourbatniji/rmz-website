# Site header — "Balanced centre"

`src/components/shell/SiteHeader.tsx` (+ `site-header.css`, `header-parts.tsx`). Same API as before (`<SiteHeader brand nav />`, fed by the site content), used by the public layout and the admin preview.

* Desktop: one 72 px row — logo left, the main links (all destinations except Contact) centred on the page independently of the logo (equal flexible side columns), Contact (with a small arrow) at the far right. 14 px / 500, sentence case.
* The section under the header is marked with a short red underline (homepage only). Hover/focus draws a 1 px underline; nothing moves.
* Surface: always the over-image look — transparent, with a short soft scrim and a discreet text shadow. It never switches to a solid bar (approved production default).
* Motion: always reduced for the navigation (instant state changes), regardless of the device setting; the hero opening and other sections keep their own motion.
* Phones (< 768 px, 60 px row): logo, a Contact text link and a Menu control. The menu drops from the header as a compact sheet; Escape closes it, focus moves in and is trapped, the page is `inert`, scrolling is contained and the scroll position is untouched, focus returns to Menu (unless a link was followed).
* Off the homepage the hash links point back to it (`/#services`…, "Work" → `/#work-archive`), as before.
* `/lab/navigation` keeps the three slim prototypes for reference (it shares `header-parts.tsx`'s overlay behaviour).
