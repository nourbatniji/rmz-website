# RMZ Website Tasks

## Done
- [x] Decide the stack
- [x] Scaffold Next.js app (TypeScript, Tailwind, ESLint, pnpm)
- [x] Add Prisma schema
- [x] Connect Neon dev branch
- [x] Run first migration
- [x] Add `/admin` placeholder page

## Dashboard
- [ ] Login page at `/admin/login`
- [ ] Session cookie
- [ ] Script to create the first admin
- [ ] Protect `/admin` pages and write routes
- [ ] Categories: create, edit, delete
- [ ] Projects: create, edit, delete
- [ ] Image upload
- [ ] Contact messages inbox

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
- [ ] Draft/publish workflow, multiple admin roles (unconfirmed)

## Public site
- [ ] GSAP animations where useful (do not rewrite working interactions only to use GSAP)

## Finish
- [ ] Playwright smoke tests (2-3)
- [ ] Enter real content
- [ ] Review and fixes

## Decisions pending
- [ ] Auth approach
- [ ] Media storage provider
- [ ] Email provider for the contact form
- [x] Lenis smooth scroll — decided: **no** for now

- [x] Shared 7-service taxonomy (Branding, Creative Strategy, Content Production, Social Media, Design, Paid Media, Web Experiences) applied to the Services lens (the Minds columns no longer list services); Lens + footer must use it (docs/content-flags.md). Fin copy provisional.

- [x] Home — Video section (ShowreelCorridor) built from "HOME - VIDEO SECTION" + "MOBILE · 01 — VIDEO CORRIDOR" (docs/video-section.md). **Pending content:** showreel video + poster, real project cards, project/archive links. Mobile follows the approved Mobile01 artboard.
- [x] Video section arrival composition (16:9 video framed between headline and paragraph; reveal + hold + release; reversible). **Pending:** approve arrival copy.
- [x] Video section redesigned as a three-wall video corridor — **design approved (baseline)**. Pending: final 2.4:1 showreel + poster, copy approval, mobile review (docs/video-section.md).
- [x] Home — Services lens (ServicesLens) built from "HOME - SERVICES SECTION" (docs/lens-section.md). **Pending:** the nine scene images (not exportable from the canvas), approval of provisional copy (descriptions, bullets, focal labels, scene assignment), service page links, mobile choice (canvas offers three options; option 1 implemented — pending visual review), "looking." colour and small-text contrast decisions.
- [x] Minds section (rename of ServiceFins): exactly eight full-bleed columns, flat continuous-red junction with the lens. **Pending:** approved minds content (names, roles, biographies, portraits, order), Studio nav mapping, mobile review.
