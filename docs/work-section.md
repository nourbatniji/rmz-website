# Work section (archive + project pages)

**Routes:** archive = homepage section `#work-archive`, placed after Minds (`/work` redirects there) · `/work/[slug]` (project, opened from the archive) · **Components:** `src/components/work/` (`WorkArchive.tsx`, `ProjectCase.tsx`, `art.ts`, `work.css`) · **Content:** `src/content/work-types.ts`, `src/content/dev/work.ts`, read only through `src/lib/content/work.ts`.

## Source of truth
- Archive: canvas **B3 · The Spatial Collection** (WorkB3, centred caption, no index, no footer), desktop 1440 + mobile 390.
- Project page: canvas **A · Project page, Alpha (brand case study)** (WorkA editorial layout), desktop 1440 + mobile 390.

## What is built
- **Archive:** perspective stage (1700px; mobile 900px), focal project centred, neighbours recede (−240px Z / ±32° per step; mobile −120px / ±26°) with reflection and floor line; centred caption (number · discipline · year, 96px name, client line, "Open project →", `i / n`); Scroll-driven, same model as the featured-work focus (1440×900 / mobile 390×672 artboard scaled uniformly into a sticky stage of viewport − header height; track = stage + (n−1) × max(360px, 50svh)): the whole section (label, headline, intro, chips, stage) is pinned and native page scroll moves the stage continuously (damped, no scroll capture); the pin releases after the last project (no loop) and the next section follows; filters rebuild the scroll length; controls (arrows, counter, Open project) act on the same position. Unpinned under reduced motion / no JS. On mobile the intro paragraph is hidden and chips scroll horizontally so the pinned frame fits. Previous/Next buttons, ← → keys on the stage and swipe > 50px scroll to that project. Header row with intro paragraph and category filter chips (counts); no index. Opening the focal project walks it forward (620px Z, .55s), fades the rest, then routes after 520ms (immediately under reduced motion). Links are real `href`s, so it works without JS.
- **Project page:** head + meta row, 21:9 hero, 01 Brief, 02 Idea, 03 Execution (+ per-category module: brand logo + swatches, campaign film + reels, digital browser/phone, content film), 04 Outcome, 05 Credits, previous/back/CTA row and a "Next project" card. Scroll reveals use CSS view timelines (off under reduced motion). Mobile stacks the 12-column grid.
- Breakpoint 1024px (repo convention). Header, footer, home sections and `types.ts` are untouched.

## Content status (all demo)
Ten demo projects (Alpha–Kappa), copy per category and gradient placeholder art are the canvas's demo content, labelled "Demo · image pending". Client names, credits, images, films and results are **pending**; nothing here is real company information.

## Pending / decisions
1. Real project data, images, films, client names, credits.
2. Header nav "Work" still points to `#work` (the showreel corridor); decide whether it should target `#work-archive`. On project pages the header links are homepage anchors.
3. On `/work` pages the fixed header keeps its transparent gradient (its solid-bar switch keys off the homepage hero).
4. Return-from-project restores the first project, not the one just opened.

## Update — one scroll = one project
Inside the pinned range a wheel gesture (≥ 40 px, one per 200 ms-silence gesture) or a vertical swipe (≥ 50 px) moves exactly one project: the page glides to the next project's scroll position (≈ 0.8 s) and stops. Scrolling up at the first project / down at the last passes through natively (no trap). A scroll that ends between projects (scrollbar, keys, momentum) settles on the nearest one after 160 ms. Cards use the About section's per-step cubic in-out ease with 240 ms damping; 3 cards visible. Reduced motion: unpinned, no capture. Not browser-tested.

## Update — scroll only over the cards (also the pinned Selected work wall)
On desktop with a mouse / trackpad, cards take the scroll only while the pointer is on them (union of the visible cards + controls, +24 px). A wheel gesture elsewhere inside the pinned range glides (0.8 s) to the next section (or back to the previous one when scrolling up); first/last item edges pass natively. Shared hook: `src/lib/use-pinned-skip.ts`, used by `WorkArchive` and `FeaturedWorkFocus`. Touch / < 1024 px / reduced motion unchanged.

## Scroll model (current)
The active project is its own state (`pos`), not derived from page scroll, and the section reserves no scroll distance. With the pointer over the
cards (and ≥60 % of the stage on screen) one wheel gesture steps one project (`src/lib/use-wheel-steps.ts`); elsewhere, and at the first / last
project, the wheel is never intercepted and the page scrolls normally. Touch uses the arrows / horizontal swipe and ordinary vertical scrolling.
The earlier pinned-track description above is superseded by this.
