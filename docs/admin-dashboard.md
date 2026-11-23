# Admin dashboard

Custom CMS at `/admin`. Edits the homepage sections and work projects; the public site reads them from Postgres and falls back to the built-in content (`src/content/dev/*`) for anything missing or invalid.

## First-time setup (order matters)

1. `pnpm install` (new deps: zod, jose, bcryptjs, @vercel/blob)
2. `.env`: add `SESSION_SECRET` (e.g. `openssl rand -base64 48`) and `BLOB_READ_WRITE_TOKEN` (Vercel, Storage, Blob). See `.env.example`.
3. `pnpm db:migrate` applies `20261119160000_admin_cms` and regenerates the Prisma client. It DROPS the old starter tables (Category, Project, ProjectImage); they held no content.
4. `pnpm admin:create you@example.com "a password of 12+ chars" "Your Name"`
5. `pnpm dev`, open `/admin/login`, then Overview → **Import built-in content** (and Projects → **Import the demo projects**) once.

## How it works

- **Sections** (`SiteSection` table): `draft` and `published` JSON per section, validated by `src/content/schemas.ts` (each schema is type-checked against `src/content/types.ts`). Save draft = admin preview only; Publish = live (`updateTag("content")`).
- **Preview**: `/admin/preview` renders the real homepage with draft content (admin session required), shown in an iframe next to each editor.
- **Projects** (`Project` table): `draft` / `published`; display order = table order; the `01…` number is assigned automatically. An empty table = the site shows the built-in demo projects.
- **Media**: files upload from the browser straight to Vercel Blob (`/api/media/upload` only issues tokens to signed-in admins) and are placed straight into the field they were dropped on. Image and video fields accept a dragged file (or the Upload button), and also accept a `/media/…` path or any https URL.
- **Adding a section editor**: add the schema (`schemas.ts`), register it in `src/lib/content/sections.ts` and `src/lib/admin/section-meta.ts`, describe its form in `src/components/admin/form/section-specs.ts`, and read it in `src/lib/content/homepage.ts`.

## Security notes

- **Every admin page, server action and route handler checks the session itself** (`requireAdmin()` at the top of each page, `requireAdminAction()` in each action and route). A layout check alone is not enough: Next.js renders pages separately, and a page without its own check can leak data. When you add an admin page, call `requireAdmin()` first.
- `src/proxy.ts` is a first gate: it verifies the signed session token (not just that a cookie exists) and sends everyone else to the login page. It does not replace the checks above.
- Session: signed JWT (HS256), httpOnly, sameSite=lax, secure in production, 7 days; deleted users lose access immediately. Logging out clears the cookie but does not cancel a copied one (it expires after 7 days).
- Login: no account lockout (so nobody can lock the team out). After 10 wrong passwords from one IP address that address waits a minute. This counter is per server, so it is a speed bump, not a wall: also add a rate-limit rule for `/admin/login` in the Vercel dashboard.
- Saving a section or project is refused if someone else saved it after you opened it ("Someone else changed this…"); reload and redo your edit. Nothing is overwritten silently.
- Unsaved changes: closing the tab, reloading, or clicking a link inside the dashboard asks first. The browser Back button is not guarded.
- Uploads: signed-in admins only, file names limited to `media/<safe characters>`, images up to 10 MB and videos up to 100 MB, only files from our own Vercel Blob store can be added to the library, and a file that is still used in a section or project cannot be deleted.
- Headers: `/admin` cannot be shown inside other sites, is never cached, and the whole site sends `nosniff`, a referrer policy and HSTS.
- Link fields accept only `#`, `/path`, `https://`, `mailto:`, `tel:`.

## Database and hosting notes

- Environment variables the app needs (set them in Vercel for Production and Preview): `DATABASE_URL`, `SESSION_SECRET` (32+ random characters), `BLOB_READ_WRITE_TOKEN` (added automatically when a Blob store is connected). Never commit them.
- Neon: the running site should use the **pooled** connection string (host contains `-pooler`). Run `pnpm db:migrate` with the **direct** connection string. The app keeps at most 5 connections per server and gives up after 8 seconds instead of hanging.
- If the database is unreachable the public site still builds and shows the built-in content; the admin shows an error.
- The Prisma client is generated on install (`postinstall`), so a fresh install or build does not need a database connection.
- The `20261119160000_admin_cms` migration drops the three starter tables `Category`, `Project` and `ProjectImage` (the repo never inserted data into them) and keeps `AdminUser` and `ContactMessage`. Before running it on any database that has not had it yet, check those three are empty: `SELECT (SELECT count(*) FROM "Project") AS projects, (SELECT count(*) FROM "ProjectImage") AS images, (SELECT count(*) FROM "Category") AS categories;` (all three should be 0). Do not edit the migration after it has been applied anywhere.
- `neon-init.sql` is the old starter schema. Do not run it; migrations are the source of truth.

## Fixed by the design (not editable in v1)

Minds = 8 columns, Services lens = the 7 taxonomy services (names editable, ids fixed), hero = 3 banners. Layout and animation stay in code.

## Studio manager interface

- Sidebar: Overview, Website, Projects, Messages (unread badge). Under Website the sections appear as a sub-list with status dots (green published, amber unpublished changes, red needs fixing, grey original content), so any section is one click away. Account menu (view site, sign out) at the bottom; tablet and mobile use a top bar with a menu.
- Overview: a "Needs attention" list (unpublished sections, broken content, unread messages, draft projects, text/media still to supply), the website sections with status and last edit, recent projects, recent messages, and a merged "Recently edited" list.
- Website (`/admin/website`): one dense row per section in homepage order (thumbnail only when the section really has an image, status, what is still to supply, last saved and by whom). Each section opens `/admin/website/<section>`; old `/admin/homepage/...` addresses redirect. Section order is fixed on purpose (the scroll animations depend on it).
- Section editor: form first. Picture-heavy sections show the live preview beside the form; word-list sections (statement, service names) default to a roomy full-width form. Either can be toggled. Previous/next section links at the bottom.
- Every editor shares one action bar: Save Draft, Preview, Publish Changes, a status pill, the last saved time, and a "⋯" menu for Discard and Reset (with confirmation). Saving never publishes. Concurrency protection and the unsaved-changes warning are unchanged.
- Projects: a table with image, name, category, status, last edited (and by whom), search, status and category filters, sort (website order, recently edited, name), and drag-and-drop ordering (only in "Website order" with no filters, always with Move earlier/later in the menu). Order is saved by `reorderProjects`, which rejects a stale or incomplete list. Four-section project editor.
- There is no Media page: every picture and video is uploaded by dragging a file onto its field (or with its Upload button).
- Light theme uses admin-only tokens (`bg-paper`, `text-fg`, `bg-accent`, `text-ok/warn/bad`) at the end of `globals.css`; the public site's tokens and components are untouched.

## Private sign-in address

`/admin` and `/admin/login` answer **404** to anyone without a valid session. The sign-in page lives at `/enter/<ADMIN_ENTRY>`, where `ADMIN_ENTRY` is a long random value in `.env` (set the same value in Vercel for Production and Preview).
In production, with `ADMIN_ENTRY` unset, nobody can reach the sign-in page. In local development an unset value keeps the plain `/admin/login`.
This is an extra layer: the password, the sign-in throttle and the per-page session checks are unchanged. If a session expires, `/admin` shows 404 until you open the private address again (bookmark it).

## Project page layout and live preview

Each project stores an optional `layout` in its `body` (JSON, no migration): an ordered list of `{ id, show }` for the page blocks in `src/lib/work-layout.ts`
(facts, main image, brief, idea, execution pictures, category showcase, image strip, outcome, credits). No `layout` = the original page, unchanged.
Hidden blocks are left off the public page but keep their content; numbered headings (01, 02…) count only the shown blocks.
The top (back link, name, summary) and the bottom (previous/next, contact) are fixed.

The project editor shows a live preview: it sends the form's current values to a same-origin frame (`/admin/preview/project`, admin only) with `postMessage`, so the page updates as you type, saved or not. Nothing is written until you save.

## Keep, delete or change single images and paragraphs

Besides showing, hiding and reordering whole blocks, every project page can now be trimmed part by part.
In the project editor, open **Page layout**, then **Edit parts** on a block (or the **Summary paragraph** line at the top).

- **Kept / Deleted** per part. A deleted picture or paragraph is left off the page completely.
- **Pictures** are handled in their own **Page content** section (above Project details): one card per picture on the page, main image included.
  Each card has **Upload** (or drag a file onto the card), **Clear** (empty it; the site shows its placeholder) and **On the page · Delete** (take it off the page completely; **Restore** brings it back).
- A block whose parts were all deleted disappears with its heading, and the numbered headings (01, 02, …) close the gap.
- Deleted parts keep their content, so **Deleted → Kept** brings them back exactly as they were.
- A picture that has not been added yet is a plain flat frame (no generated colour art, no "Demo" tag). The archive cards show the project's main image once it has one. The Palette still drives the brand swatches in the logo-system block.

Parts per block: top summary; main image; facts (client, services, year, status); brief paragraph; idea (concept image, statement, key points, caption);
execution (3 pictures); category showcase (differs per category); image strip (3 pictures); outcome (heading line, deliverables, footnote); credits.

Stored inside the project's JSON `body` (no database migration): `hidden` is a list of deleted part ids, `images` maps a part id to its replacement picture.
Old projects have neither and render exactly as before. The list of parts lives in `src/lib/work-layout.ts` (`elementsOf`); the page reads it in `ProjectCase.tsx`.

## Undo and redo

Website section editors and the project editor have **↶ Undo / ↷ Redo** buttons in the top bar, plus keyboard shortcuts:

- **Undo:** Ctrl+Z (⌘Z on Mac)
- **Redo:** Ctrl+Shift+Z or Ctrl+Y (⇧⌘Z on Mac)

What counts as one step: a burst of typing in one field (a pause of about 0.8 s, or switching field, starts a new step), and every other change on its own
(a toggle, a reorder, deleting a part, picking or clearing a picture, adding or removing a list item).

- The shortcuts work while typing in a field too: the browser's own undo is replaced so it can't fight the editor. They are off while a dialog (confirm box) is open.
- Undo changes the form only. In website sections the draft auto-saves a moment later, as with any edit; in projects, press Save.
- History is per page visit (up to 100 steps). It is cleared when the server hands back new content: Discard changes, Reset to original, and publishing or unpublishing a project.
- Not covered: the new-project form and the sign-in page.

Code: pure rules in `src/components/admin/history.ts`, the hook in `useHistory.ts`, buttons in `UndoRedo.tsx`.

## Matching pictures to uploaders (Page content)

Every picture on a project page has a number. The same number appears in two places:

- on the card in **Page content** (hover the card for where the picture sits and the best shape, e.g. 21:9 or 9:16), and
- as a red tag on that picture in the live preview.

Hover a card and its picture is outlined in the preview (the preview scrolls to it). Click a picture in the preview and the editor scrolls to its card and rings it for a moment.
Numbers follow page order, so reordering blocks in Page layout renumbers them on both sides. A deleted picture keeps its card (struck through) but has no tag, since it is not on the page.

Code: `imageSlots()` and the `where` / `ratio` text live in `src/lib/work-layout.ts`; the tags and click handling are in `ProjectLivePreview.tsx`
(pictures get `data-slot` only when `ProjectCase` is rendered with `editing`, so the public page is unchanged); the cards are `PageImages.tsx`.


### Preview highlighting
- Project editor: pictures and texts in the live preview have a dashed border; hovering one (or focusing its field on the left) outlines it in yellow and scrolls the preview to it.
- Website sections: focusing a field outlines the matching text or picture in the preview (found by its current saved text or file), and opening a service in Lens selects it.
- Lens pictures: one picture per service (slots a–g, in service order; h and i are unused), filling the whole lens. Each field is named after its service; the preview tags the picture, and hovering a field selects that service. The old multi-picture "scene" layouts were removed.
- Reordering blocks and list items is done with the dots handle (mouse, touch, or Space then the arrow keys); there are no separate up/down buttons.
