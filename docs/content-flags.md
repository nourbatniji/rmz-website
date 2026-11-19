# Content flags — StatementRotator and ServiceFins

All copy below comes verbatim from the approved canvas and lives in `src/content/dev/homepage.ts`
(`statement`, `serviceFins`), behind the typed contract in `src/content/types.ts`.

## Statement
| Item | Status |
|---|---|
| "RMZ, when expectations are …" + words *broken / rewritten / exceeded / challenged* | Approved canvas copy. Confirm final wording with the client. |
| Label "Statement" | **Removed** from the public page (it was a design label). `StatementContent.label` no longer exists. |

## Service fins
| Item | Status |
|---|---|
| Canvas label "Capabilities — fins of one wall" and intro "Eight services hang from the top like architectural fins…" | **Replaced** (they described the design mechanic). Now: label "Capabilities", intro "Brand identities, campaigns and digital experiences, from strategy to production. Select a service to see what it covers." — **PROVISIONAL, pending approval.** Grounded in the hero intro ("brand identities, campaigns and digital experiences") and the service titles; "from strategy to production" is drawn from services 01 and 06. Needs client sign-off. |
| Plate placeholder text "Dev placeholder · NN Title · image 520×380" | Visible only while images are missing; disappears when `image` is set. Not copy. |
| Hero intro "…Scroll to move the picture. Turn the wall to see each face." and headline "One wall. Three faces." | Also read like design notes (approved canvas copy; HeroWall is frozen and was not touched). **Decision pending** — see report. |
| Services 01–07 (titles and descriptions) | **REPEATED**: the same services/descriptions also appear in the "Services dial" board (canvas board 5). Descriptions are identical except **Creative Direction** (fins: "…We set the direction, then keep it consistent from the first sketch to the last post." vs dial: "…from first sketch to last post."). Decide ONE source of truth; the CMS should likely share one services list between both sections. Nothing was merged in this milestone. |
| Service 08 "Packaging & Print" | Exists only in the fins (dial has seven). Confirm it is a real service. |
| Service images (8) | **Missing** — canvas images could not be exported. Labelled placeholders at 520×380 (≈1.37:1) are shown. |
| Footer "What we do" list (5 items) | Third list of services in the canvas (different wording) — also to be reconciled. |

No business claims were added or invented.

## Accessibility notes to review with design
- **Fixed:** the "NN · Service" label is now ink `#0F0F0E` on cream (≈15.7:1). Orange `#F86015` stays as a short decorative bar before the label. Palette unchanged.
- **Fixed:** fixed-header overlap — see `docs/header-offsets.md`.
- Open: the orange `#F86015` numerals/accents elsewhere are decorative only; any new small orange-on-cream text must use ink.
