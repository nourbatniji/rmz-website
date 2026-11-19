# Content flags — StatementRotator, Services lens, Minds

All copy below comes verbatim from the approved canvas and lives in `src/content/dev/homepage.ts`
(`statement`, `lens`, `minds`), behind the typed contract in `src/content/types.ts`.

## Statement
| Item | Status |
|---|---|
| "RMZ, when expectations are …" + words *broken / rewritten / exceeded / challenged* | Approved canvas copy. Confirm final wording with the client. |
| Label "Statement" | **Removed** from the public page (it was a design label). `StatementContent.label` no longer exists. |

## Service fins — SUPERSEDED (this component is now the Minds section; the lens is the Services section)
| Item | Status |
|---|---|
| Canvas label "Capabilities — fins of one wall" and intro "Eight services hang from the top like architectural fins…" | **Replaced** (they described the design mechanic). Now: label "Capabilities", intro "Brand identities, campaigns and digital experiences, from strategy to production. Select a service to see what it covers." — **PROVISIONAL, pending approval.** Grounded in the hero intro ("brand identities, campaigns and digital experiences") and the service titles; "from strategy to production" is drawn from services 01 and 06. Needs client sign-off. |
| Plate placeholder text "Dev placeholder · NN Title · image 520×380" | Visible only while images are missing; disappears when `image` is set. Not copy. |
| Hero intro "…Scroll to move the picture. Turn the wall to see each face." and headline "One wall. Three faces." | Also read like design notes (approved canvas copy; HeroWall is frozen and was not touched). **Decision pending** — see report. |
| ~~Old services 01–07 / 08 descriptions~~ — **SUPERSEDED** by the approved taxonomy below. (Historical:) | **REPEATED**: the same services/descriptions also appear in the "Services dial" board (canvas board 5). Descriptions are identical except **Creative Direction** (fins: "…We set the direction, then keep it consistent from the first sketch to the last post." vs dial: "…from first sketch to last post."). Decide ONE source of truth; the CMS should likely share one services list between both sections. Nothing was merged in this milestone. |
| "Packaging & Print" | **Removed** as a standalone service. It may later become a deliverable under Design — no copy added yet. |
| Service images (7) | **Missing** — canvas images could not be exported. Labelled placeholders at 520×380 (≈1.37:1) are shown. |
| Footer "What we do" list (5 items) | Third list of services in the canvas (different wording) — also to be reconciled. |

No business claims were added or invented.

## Accessibility notes to review with design
- **Fixed:** the "NN · Service" label is now ink `#0F0F0E` on cream (≈15.7:1). Orange `#F86015` stays as a short decorative bar before the label. Palette unchanged.
- **Fixed:** fixed-header overlap — see `docs/header-offsets.md`.
- Open: the orange `#F86015` numerals/accents elsewhere are decorative only; any new small orange-on-cream text must use ink.

## Approved service taxonomy (client-confirmed)
Branding · Creative Strategy · Content Production · Social Media · Design · Paid Media · Web Experiences — in exactly this order.
Single source: `services` in `src/content/dev/homepage.ts` (`ServiceTaxonomyItem {id, name}`; ids are stable: `branding`, `creative-strategy`, `content-production`, `social-media`, `design`, `paid-media`, `web-experiences`). Fin titles/numbers are derived from it.
- Fin descriptions are **PROVISIONAL** build-team copy (`copyStatus: "provisional"`) for the new names. Old descriptions/images were NOT carried over (the old list does not map 1:1). Pending client approval.
- Initially open fin: Content Production (3rd, matching the canvas's 3rd-open composition) — provisional.
- Per-section copy/media stay separate: do not auto-repeat identical descriptions across sections.
- **Required content for the unbuilt Lens (services) section:** use this taxonomy (names, order, ids). Its descriptions/media are its own and still to be supplied. The earlier "dial vs fins" repeated-copy question is closed for names; descriptions are per section.
- **Footer** (unbuilt): list services from the same taxonomy; the old five-item "What we do" list is superseded.
- Nav: "Capabilities" → `#services` (the lens). "Studio" → `#minds`.
- CMS: edit `services` (name/order) once; each section edits only its own description/media keyed by `serviceId`.


## Video section (ShowreelCorridor) — approved design; media and copy pending — see `docs/video-section.md`
- **Showreel footage — PENDING approval/replacement.** The supplied 5 s clip (2206 × 946, not seamless) is a stand-in; final 2.4:1 master per the export spec.
- **Poster — PENDING** (frame extracted from the supplied clip).
- **Copy — PROVISIONAL, pending approval**: kicker "Work — walk the corridor", headline "One reel. / Three walls.", intro, arrivalHeadline "The work, in motion.", arrivalDescription, accessibleDescription. The old "Six rooms…" / "Each project hangs on the wall…" copy was replaced because the project cards no longer exist.
- Mobile corridor — first-pass adaptation of the same scene, **pending mobile design review**.

## Services lens (ServicesLens) — see `docs/lens-section.md`
- Names/order: the approved 7-service taxonomy (not the canvas' old services).
- **Provisional, pending approval**: all seven descriptions, bullet lists, focal chips (24mm … Tele), ring marks, scene assignment, kicker/heading/intro/hints, initially selected service (Content Production).
- **Missing**: nine scene images (canvas blobs not exportable) → labelled placeholders; "Explore service →" hidden until service pages (`href`) exist.
- **Decisions needed**: colour of the italic "looking." (canvas desktop: #D52518 on #D52518 = invisible; yellow used, as on canvas mobile); cream-on-red small text is 4.3:1 (< 4.5:1); which of the three mobile options to approve (option 1 built).

## Minds (formerly ServiceFins) — see `docs/minds-section.md`
- The eight columns are **minds / team members, not services**. All service labels, descriptions and the service images were removed.
- **ALL CONTENT IS TEMPORARY PLACEHOLDER**: "Mind 01 … Mind 08", role "Role to be confirmed", biography "Placeholder: …", portraits missing (labelled placeholders). `copyStatus: "placeholder"`. No names, roles or biographies were invented.
- **Pending**: approved minds (names, roles, short biographies, portraits 520×380 ≥ 1040×760, order), the caption intro ("The people behind the work. Select a column to open it." — provisional), initially open column (third), Studio nav mapping, mobile review.
