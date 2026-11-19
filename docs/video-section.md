# Home — Video section (ShowreelCorridor)

## Exact source
- Desktop: canvas board **"HOME - VIDEO SECTION"** — file `project/WorkX-e01.dc.html` (1440 × 1000, playable).
- Mobile: canvas board **"MOBILE · 01 — VIDEO CORRIDOR"** — file `project/Mobile01-Corridor.dc.html` (390 × 844, playable).
- Not used (other explorations): `WorkB3` / `Mobile05` (spatial collection — deferred Work archive) and `Mobile06a–c` (options for that archive). No versions combined.
- Component: `src/components/home/corridor/ShowreelCorridor.tsx` + `corridor.css`. Content: `homepage.corridor` (typed, `src/content/types.ts → CorridorContent`).

## What the source does
A red ribbed corridor in 3D (perspective 1000 px, origin 50 % 48 %). A cream-framed 16:9 showreel screen with an "All projects / Open the archive" strip hangs on the back wall; six project cards hang on the side walls (3 + 3, alternating Alpha/Gamma/Epsilon and Beta/Delta/Zeta), all showing **the same video**. Scrolling walks the camera forward 1250 px along z (smoothed, 0.1 lerp) until the back screen fills the view; a caption (project number · category · title) fades in from 6 % to 18 % and follows the nearest project. Headline "Six rooms. / One long wall.", intro copy, three colour squares, and a Play/Pause button.
Mobile: portrait corridor, two side posters + centre screen, camera dolly with the screen growing to fill the phone; headline/kicker/"scroll to walk" cue fade out; a full-screen player (time, play, scrubber) appears at the end.

## How it is built here
- **Scroll mapping**: the canvas captured `wheel` (deltaY/1600) and `preventDefault`ed it inside the section. Here a tall *track* (+1600 px desktop, +2500 px mobile = the canvas' `RANGE_USE`) with a *sticky pin* under the fixed header gives the identical mapping with **native scroll** — reverse, touch, keyboard, anchors, and a clean release into Statement work, and there is **no wheel/touch listener at all**. (Conflict flagged below.)
- Pin sits at `top: var(--header-h)`; the stage is scaled uniformly to fit the remaining viewport (desktop: `min(1, w/1440, h/1000)`), overlay type stays real-size so it remains readable on short viewports.
- One hidden `<video>` feeds all canvases (drawn in the same rAF tick → frames identical on every surface). Loads only when the section is within a viewport of the screen; plays only while in view, not user-paused, tab visible. Frame loop and observers run only while the section is near the viewport.
- Reduced motion: no pin, no walk — the final composition is shown; video does not autoplay.
- No video configured: the canvas' own labelled "SHOWREEL · 16:9 VIDEO PLACEHOLDER" drawing (or the poster if set), **no `<video>`, no player controls, no duration, no sound/mute**.
- Direct navigation `#work` lands exactly under the header at the walk start.

## Conflicts / deviations (flagged, not silently resolved)
1. **Wheel capture vs. "no trapping"**: canvas hijacks the wheel inside the section; the brief and the earlier decisions forbid wheel/touch interference. Replaced with native scroll-linked pin (same distances). Feel differs slightly: the page moves while the walk plays.
2. **WorkX's own `<760px` fallback** is a static stacked layout with no walk; the approved **Mobile01** artboard (3D corridor) is used instead, as requested ("use an approved mobile artboard if one exists").
3. **Click-to-open copy**: canvas says "Click any poster to open its case" / "tap a screen to open its case" and shows "Open project →". Project pages and the Work archive are deferred, so the sentence is trimmed, cards are plain (no link affordance, no "Open project →"), and the archive strip is not a link. Each has an `href` in content (`null` now) ready for later.
4. **Prototype-only items removed**: Walk slider, "Missing asset…" and "Provisional: guideline photography…" notes, simulated reel/poster canvases, simulated 00:20 clock, "Room 01 — Identity" labels, mock topbar/menu, "open →" toast.
5. **Old service names**: canvas card categories (Brand Identity, Campaign, Digital Experience, Content & Production, Growth, Creative Direction) are not the approved taxonomy. Cards now take the first six approved services (Branding … Paid Media) as *demo* categories.
6. **Orange / red small text on cream**: canvas used `#F86015` (≈3:1) for the "All projects" label; `#D52518` (4.6:1) is used on cream. Header-clearance adjustment: kicker sits at 28 px below the header instead of canvas 56 px from section top.

## Remaining media / content
- **Showreel footage** (16:9 MP4/WebM H.264, muted-loopable, ≈10–60 s; WebM/VP9 optional) → `corridor.video.src`; **poster still** (16:9, ≥1600 px) → `corridor.poster`; accessible description text → `corridor.accessibleDescription`.
- Six **project names/categories/posters** (mobile side frames use the first two) — currently "Demo project" placeholders; project page URLs (`href`) when those pages exist; Work archive URL for the strip.
- Approve kicker "Work — walk the corridor", headline and intro copy (canvas copy kept, provisional).
