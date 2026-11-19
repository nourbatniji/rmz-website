# RMZ homepage — asset checklist for the content team

Status of the canvas export: **the approved canvas's assets could not be exported** (its asset store is empty
and direct links return 403), so nothing below exists in the repo yet. Until delivered, the site shows clearly
labelled *Dev placeholder media* with the correct proportions. Real files replace them with no code change
(references live in `src/content/dev/homepage.ts`, later the CMS).

Send **originals** (full quality); we generate the web derivatives. Delivery name pattern is flexible — tell us the pattern.

## Needed for the first milestone (Hero)

| # | Asset | Placement | Qty | Aspect / size | Format |
|---|---|---|---|---|---|
| 1 | Official RMZ logo | Header (all pages) | 1 (+ one-colour variant if any) | any; shown at 32–40 px high | **SVG** (else PNG ≥ 400 px wide, transparent) |
| 2 | Hero image sequence — banner 01 "Identity" | Hero wall, scrubbed by scroll (reversible) | 72 frames (≥ 48 minimum; the more, the smoother) | **16:10**, ≥ **2880 × 1800** px | Numbered PNG/JPG/TIFF in order, e.g. `0001…0072`, no gaps |
| 3 | Hero still — banner 02 "Campaign" | Hero wall face 2 | 1 | 16:10, ≥ 2880 × 1800 | JPG/PNG |
| 4 | Hero still — banner 03 "Digital" | Hero wall face 3 | 1 | 16:10, ≥ 2880 × 1800 | JPG/PNG |

Keep important content away from the outer ~8 % (the wall is cropped to cover on different screens, including portrait phones — subject should sit in the **central 60 %**).

Web derivatives we will produce: WebP frames at ~1600 px wide (mobile ~960 px). Target ≈ 60–120 KB/frame. Sizes to be measured and reported once originals arrive.

### Hero imagery — important note for the content team
The current hero banner 1 uses **six independently generated keyframes** as a *test* sequence. Six separate stills cannot
produce smooth scroll-driven motion, and synthetic interpolation between them distorts the face, hands and objects.
For final imagery please provide **either**:
- a **continuous source video** of the action (one take, locked-off camera, 4K or ≥ 2880 px wide, 16:10 or 16:9, 24–60 fps,
  subject in the central 60 %), from which we extract the frames; **or**
- a **coherent frame sequence** (consecutive frames of the same take, same framing/lighting/pose continuity, ≥ 48 frames).
Every banner (3 on the wall) needs its own sequence of this kind. Frame counts may differ per banner.

## Needed for later milestones

| Section | Asset | Qty | Aspect / size | Format |
|---|---|---|---|---|
| Showreel corridor | Showreel video (muted, loopable) | 1 | 16:9, 1920×1080 | MP4 (H.264) **and** WebM; ≤ 15 MB; + poster JPG |
| Showreel corridor | Project poster images for the 6 side-wall cards | 6 | 16:9, ≥ 1600×900 | JPG/WebP |
| Selected work (pinned) | Project cover images | 6 | per design (portrait-leaning) — confirm | JPG/WebP ≥ 1600 px long side |
| Selected work | Titles, category, short description per project | 6 | — | text |
| Services dial | Image per service | 7 | confirm (square-ish) | JPG/WebP ≥ 1200 px |
| Service fins | Image per service | 7 | **520×380 (≈ 1.37:1, landscape)** shown in the open plate; keep subject centred (cropped with a per-image focal point) | JPG/WebP ≥ 1040×760 |
| Service fins | Approved service descriptions (replace provisional) | 7 | — | text |
| Collaborations | Partner logos | confirm count (canvas shows placeholders) | transparent, one-colour/cream-on-dark | **SVG** |
| Statement | Final rotating words | — | — | text |
| Footer | Contact email, address/city, final social URLs | — | — | text (canvas uses management@rmz.solutions, Cairo, generic social links) |

## Fonts

The canvas uses **Figtree** and **Playfair Display (italic 700)** — both free Google Fonts, already self-hosted via `next/font`.
No substitutes in use. If RMZ has licensed brand fonts, send the files (WOFF2 preferred) and licence.
