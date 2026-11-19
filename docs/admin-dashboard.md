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
- **Media**: files upload from the browser straight to Vercel Blob (`/api/media/upload` only issues tokens to signed-in admins) and are listed in the library. Image fields also accept a `/media/…` path or any https URL.
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

- Sidebar: Overview, Website, Projects, Media, Messages (unread badge). Under Website the sections appear as a sub-list with status dots (green published, amber unpublished changes, red needs fixing, grey original content), so any section is one click away. Account menu (view site, sign out) at the bottom; tablet and mobile use a top bar with a menu.
- Overview: a "Needs attention" list (unpublished sections, broken content, unread messages, draft projects, text/media still to supply), the website sections with status and last edit, recent projects, recent messages, and a merged "Recently edited" list.
- Website (`/admin/website`): one dense row per section in homepage order (thumbnail only when the section really has an image, status, what is still to supply, last saved and by whom). Each section opens `/admin/website/<section>`; old `/admin/homepage/...` addresses redirect. Section order is fixed on purpose (the scroll animations depend on it).
- Section editor: form first. Picture-heavy sections show the live preview beside the form; word-list sections (statement, service names) default to a roomy full-width form. Either can be toggled. Previous/next section links at the bottom.
- Every editor shares one action bar: Save Draft, Preview, Publish Changes, a status pill, the last saved time, and a "⋯" menu for Discard and Reset (with confirmation). Saving never publishes. Concurrency protection and the unsaved-changes warning are unchanged.
- Projects: a table with image, name, category, status, last edited (and by whom), search, status and category filters, sort (website order, recently edited, name), and drag-and-drop ordering (only in "Website order" with no filters, always with Move earlier/later in the menu). Order is saved by `reorderProjects`, which rejects a stale or incomplete list. Four-section project editor.
- Media: grid or list view, search, type filter, "unused only", sort, multi-select delete, a details panel (large preview, type, size, dimensions, description, where it is used), and "Replace this file": upload a new version and `replaceMedia` swaps every reference (draft and published sections, project bodies, image sizes) in one all-or-nothing transaction, then deletes the old file. The swap logic is `lib/admin/media-swap.ts`.
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
