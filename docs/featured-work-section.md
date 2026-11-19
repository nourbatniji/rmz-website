# Featured work focus (canvas board "HOME - ABOUT SECTION")

**Component:** `src/components/home/featured/FeaturedWorkFocus.tsx` (+ `featured-pose.ts`, `featured.css`) · **Anchor:** `#selected` · **Content:** `featured` in `HomepageContent`.

## Source of truth
The approved canvas board titled **HOME - ABOUT SECTION** (`ProjectFocus-e01.dc.html`, exported as `HOME - ABOUT SECTION-html.zip`, byte-identical) and the approved mobile board **MOBILE · 03 — Home / About / Selected work**.
Despite the title, the board is a *selected work* design (no About Us copy exists in the canvas): a pinned wall of six project cards; the centred card shows a project image on its front and turns in place to a description on its back; then the wall moves on to the next card.

## What is built
- **Desktop (≥ 1024px):** the exact wall geometry of the board — perspective 1500px, origin 50% 45%; card widths 430/290/220, image heights 470/340/270, offsets 340/640/960, ±44° Y rotation, −130px Z per step, opacity fade beyond two cards; both faces (front: ribbed image fill + "Project image pending" tag + `01 ARID` / `DEMO` strip; back: category, `01 / 06`, name 64px, description 19px, placeholder footer, "Open case" chip). Chrome: label, progress bar, `01 / 12` counter, readout line, Previous / Next / Open case, two-column project list. Artboard is 1440 × 900, scaled uniformly (max 1.25×) to fit the stage.
- **Mobile (< 1024px):** the board's single 320 × 439 card (perspective 1600px, flip to the left, then the next card slides in from the right with neighbour slivers), title, 3px progress bar, readout line, Previous / Next / Open case. Adaptation (pending approval): the project list is not shown (does not fit the phone viewport); Previous/Next go to the previous/next *project* as in the mobile board; the artboard (390 × 672) scales to the stage, so it also serves 640–1023px widths.
- **Scroll mapping (replaces the board's wheel-captured stepped gesture):** a pinned `position: sticky` stage (top = fixed header height, height = viewport − header) inside a track whose height is reserved in CSS: `stage + 11 × max(360px, 50svh)`. Native scroll position → one continuous step value `s` (0…11): `2j → 2j+1` the centred card turns (angle = 180° × the board's cubic ease); `2j+1 → 2j+2` the wall moves to the next card (the card that leaves un-turns as it leaves, exactly as in the board). The board's formulas are evaluated at continuous `s`; nothing is time-based.
- **Smoothing:** the same pattern as the Minds reveal — `s` is damped toward the scroll target in a rAF loop (τ 55 ms ≈ 90 % in ≈ 125–150 ms), snaps to the exact value within 0.002 step and stops; larger jumps (> 1.4 steps in a frame, anchors, fast flicks, stalled frames) show the position immediately. Stopping holds the angle; reverse retraces the same path.
- **Faces:** each face has `backface-visibility: hidden` and an explicit `visibility` switch from the computed angle (front below 90°, back at/above 90°), so there is no bleed-through, no mirrored text (the back is pre-rotated 180°) and exactly one face at any angle. The back's content is laid out at its final 430px width and only scaled by the card-width ratio (never stretched). No `will-change`, so text re-rasterises sharp at rest.
- **Constraints respected:** no wheel/touch capture, no scroll locking, no click-to-continue (the buttons only scroll the page), no site-wide scroll changes; pinning is used because the board itself is a pinned stage.
- **Accessibility:** the 3D wall is `aria-hidden` and contains nothing focusable; a visually hidden ordered list gives every project (category, image note, description, placeholder note) to screen readers; a polite live region announces the *settled* position; Previous/Next/list are real buttons that stay on screen below the header while pinned. Section heading "Selected work".
- **Reduced motion / no JavaScript:** a readable static list of all six projects (image fill, category, name, description) replaces the stage (CSS `prefers-reduced-motion`, and a `<noscript>` style). No pinning, no flipping, no layout reservation beyond the list.

## Content status (all provisional)
Project names, categories and fill colours are the canvas's **demo** entries; descriptions are the canvas's placeholder sentence; images are `null` (labelled "Project image pending"). "Open case" is shown as in the board but there are no case pages, so the control-row button is disabled and the in-card chip is decorative. Nothing here is real company information. To go live: supply verified case summaries (≈ five lines or less on the back) and images (the centred card's image area is ≈ 412 × 470px, so portrait-leaning art fits; it is cover-cropped) and set `copyStatus: "approved"`.

## Pending approval / decisions
1. Whether the section should keep the canvas's *Selected work* content or whether a real About Us section (copy + faces) will be designed — the canvas has none.
2. Mobile adaptation (list omitted, 390 × 672 artboard scaled, tablet widths use the phone layout).
3. Scroll distance per step (`max(360px, 50svh)` → 11 steps ≈ 5.0 screen heights on desktop).
4. Case pages / "Open case".
5. Real images (front) and verified copy (back).

## Tests
`docs/review/milestone-16/tests/featured-work-tests.mjs` (41 checks: reserved layout, pinning and header clearance, angle = 180° × ease at 7 positions forward and reverse, one visible face / no bleed-through / not mirrored, proportions, hold, smoothing, fast jumps, full sequence, no capture, keyboard, controls, accessibility, resizing, other viewports, mobile flip + slide, reduced motion, JS off, CLS) and `record-featured-work.mjs` (screenshots + recordings).
