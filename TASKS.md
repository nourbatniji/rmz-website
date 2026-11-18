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
- [x] 1. HeroWall — per-banner image sequences driven by GLOBAL page-scroll progress; 5 s auto banner change (pause control); dev sequences in public/media/dev until real assets arrive
- [ ] Hero photo sequence: replace the six keyframes with a continuous source video / more coherent frames; decide hero pinning vs. scroll distance (lid exits the viewport while opening at 900px-tall screens)
- [ ] Remove `DevScrollSpacer` (src/components/home) as real sections land
- [ ] 2. Showreel corridor (3D walk + video)
- [ ] 3. Statement rotator
- [ ] 4. Featured-work focus (pinned, discrete steps)
- [ ] 5. Services dial (iris)
- [ ] 6. Service fins
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
