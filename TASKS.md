# RMZ Website Tasks

## Done
- [x] Decide the stack
- [x] Scaffold Next.js app (TypeScript, Tailwind, ESLint, pnpm)
- [x] Add Prisma schema
- [x] Connect Neon dev branch
- [x] Run first migration
- [x] Add `/admin` placeholder page

## Dashboard (built — see docs/admin-dashboard.md; needs `pnpm install`, env vars, `pnpm db:migrate`, `pnpm admin:create` before first use; DB-backed flows not yet exercised against Neon)
- [x] Login page at `/admin/login`
- [x] Session cookie
- [x] Script to create the first admin (`pnpm admin:create`)
- [x] Protect `/admin` pages and write routes
- [x] Homepage section editors with draft / publish and live preview (hero, showreel, statement, featured, services, lens, minds, work intro, site/nav)
- [x] Projects: create, edit, reorder, publish, delete
- [x] Image upload (Vercel Blob) + media library
- [x] Contact messages inbox (read-only; public form still deferred)
- [ ] Collaborations and Footer editors (add when those sections are built)
- [ ] Users page / change password (use `pnpm admin:create` for now)

## Launch scope — Sunday 22 Nov 2026
In scope: the approved homepage (canvas boards 1–6, 8, 9 in canvas order) + custom admin/CMS for homepage content & media (no Payload / ready-made CMS). Mobile is part of launch (first pass built; needs design review).

### Homepage (internal names by behaviour; see docs/homepage-sections.md for label mismatches)
- [x] Design tokens + typography (Figtree, Playfair Display)
- [x] Site shell + header
- [x] Header overlap fix (scroll-padding + solid bar past hero), design-note copy removed, fin label contrast fixed, hero regression suite updated for the photographic banner (see docs/header-offsets.md, docs/content-flags.md)
- [ ] DECISIONS PENDING: approve provisional Capabilities intro; decide the single source for the repeated services list (dial vs fins vs footer); hero headline/intro copy ("One wall. Three faces.", "Scroll to move the picture…") still reads like design notes
- [x] 1. HeroWall — per-banner image sequences driven by GLOBAL page-scroll progress; 5 s auto banner change (pause control); dev sequences in public/media/dev until real assets arrive
- [ ] Content team: continuous source video or coherent frame sequence for each hero banner (six keyframes are test imagery only)
- HeroWall is the APPROVED BASELINE (docs/hero-baseline.md): no further visual/behavioural changes unless explicitly requested
- [ ] Remove each `DevSectionPlaceholder` (src/components/home) as its real section lands
- [ ] 2. Showreel corridor (3D walk + video)
- [x] 3. Statement rotator (StatementRotator)
- [ ] 4. Featured-work focus (pinned, discrete steps)
- [ ] 5. Services dial (iris)
- [x] 6. Minds (renamed from ServiceFins) — eight columns of minds/team members; all content is temporary placeholders (docs/minds-section.md)
- [ ] 7. Collaborations (canvas board 8)
- [ ] 8. Footer (canvas board 9)
- [ ] Mobile design review + adjustments
- [ ] Real assets/content swapped in

## Deferred (not in launch scope — kept for later)
- [ ] Work archive page (canvas WorkB3)
- [ ] Project detail page
- [ ] Portfolio list page
- [ ] Standalone About page (About lives inside the homepage)
- [ ] Standalone Contact page
- [ ] Contact form (fields + delivery requirements not confirmed)
- [x] Draft/publish workflow (built for sections; projects use draft/published status)
- [ ] Multiple admin roles (unconfirmed)

## Public site
- [ ] GSAP animations where useful (do not rewrite working interactions only to use GSAP)

## Finish
- [ ] Playwright smoke tests (2-3)
- [ ] Enter real content
- [ ] Review and fixes

## Decisions pending
- [x] Auth approach — custom (jose session + bcrypt), see docs/admin-dashboard.md
- [x] Media storage provider — Vercel Blob (swap point: src/lib/admin/upload-client.ts + media-actions.ts)
- [ ] Email provider for the contact form
- [x] Lenis smooth scroll — decided: **no** for now

- [x] Shared 7-service taxonomy (Branding, Creative Strategy, Content Production, Social Media, Design, Paid Media, Web Experiences) applied to the Services lens (the Minds columns no longer list services); Lens + footer must use it (docs/content-flags.md). Fin copy provisional.

- [x] Home — Video section (ShowreelCorridor) built from "HOME - VIDEO SECTION" + "MOBILE · 01 — VIDEO CORRIDOR" (docs/video-section.md). **Pending content:** showreel video + poster, real project cards, project/archive links. Mobile follows the approved Mobile01 artboard.
- [x] Video section arrival composition (16:9 video framed between headline and paragraph; reveal + hold + release; reversible). **Pending:** approve arrival copy.
- [x] Video section redesigned as a three-wall video corridor — **design approved (baseline)**. Pending: final 2.4:1 showreel + poster, copy approval, mobile review (docs/video-section.md).
- [x] Home — Services lens (ServicesLens) built from "HOME - SERVICES SECTION" (docs/lens-section.md). **Pending:** the nine scene images (not exportable from the canvas), approval of provisional copy (descriptions, bullets, focal labels, scene assignment), service page links, mobile choice (canvas offers three options; option 1 implemented — pending visual review), "looking." colour and small-text contrast decisions.
- [x] Minds section (rename of ServiceFins): exactly eight full-bleed columns, flat continuous-red junction with the lens. **Pending:** approved minds content (names, roles, biographies, portraits, order), Studio nav mapping, mobile review.
- [x] Minds: 80px/40px flat red space above the columns (nothing below); one-shot entrances for the Services lens and Minds (docs/entrances.md). **For visual approval.**
- [x] StatementRotator: progress bar removed (counter kept); rotation interval 2000ms start-to-start (docs/statement-section.md).
- [x] Minds desktop entrance reworked: scroll-linked downward reveal (replaces the timed lift/fade); mobile accordion unchanged (docs/entrances.md). **For visual approval.**
- [x] Minds reveal corrected: starts fully hidden (no stubs), trigger at 80 % of the usable viewport, whole column incl. the expanded cream card masked together, mouse clicks no longer lift the mask. **For visual approval.**
- [x] Minds reveal smoothed: one damped shared progress value (≈ 125 ms catch-up, exact settle, loop idles, jumps snap). **For visual approval.**
- [x] Hero banner 1 visual replaced by the 25 delivered frames (WebP, scroll-driven via the existing hero mapping); older cloche keyframes removed. **For visual approval.**
- [x] Featured work / "HOME - ABOUT SECTION" built: pinned, scroll-linked card flip (desktop wall + approved mobile card); static fallback for reduced motion / no JS; all copy and images provisional. **For visual approval.** Open: mobile adaptation, scroll distance, case pages, real content (docs/featured-work-section.md).

- [x] Work section built from canvas "B3 · Spatial Collection" (archive on the homepage after Minds) and "A · Project page" (`/work/[slug]`), desktop + mobile (docs/work-section.md). **For visual approval.** Pending: real projects/images/credits, header nav target, return-focus.

- [x] Collaborations ("The Collective") + Footer sections built from the canvas (desktop + mobile; footer mobile is an adaptation) — For visual approval. See docs/closing-sections.md.
