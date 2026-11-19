# Home — Video section (ShowreelCorridor) — approved baseline

**Status: three-wall design APPROVED (baseline).** Still pending approval: the final showreel footage, the poster still, and all copy (see "Pending").

Component: `src/components/home/corridor/ShowreelCorridor.tsx` + `corridor.css`. Content (typed, CMS-ready): `homepage.corridor` → `CorridorContent` in `src/content/types.ts`; values in `src/content/dev/homepage.ts`. One scene serves every breakpoint.

## Experience
The camera walks down a corridor whose **front wall and both side walls are the same showreel video**. Scroll (native) walks forward; the front video grows until it arrives as a borderless, edge-to-edge 2.4:1 video between a headline (above) and a paragraph (below), which are revealed only at arrival; a short hold; then the whole composition scrolls away into StatementRotator. Fully reversible.

Timeline in scroll px — desktop / mobile (≤ 760 px):
1. **Approach** 1600 / 2500 — camera walk (smoothed 0.1 / 0.2).
2. **Stationary reveal** 450 / 400 — camera and video frozen; headline rises + fades, paragraph follows with a stagger (scroll-linked, eased; never re-triggers).
3. **Hold** 450 / 450.
4. **Release** — pin ends; headline, video and paragraph scroll away together.
No wheel/touch listeners, no scroll lock, no click-to-continue. Reverse is the exact mirror (hold → reveal hides the text → corridor).

## Geometry (verified from the implementation)
Scene = 1440 × 1000 stage, CSS perspective 1000 px, origin 50 % 48 %, scaled to fit under the fixed header.
| Wall | Plane (scene units) | Placement | Ratio |
|---|---|---|---|
| Front | 1680 × 700 | z = −1500, x −120…1560, y 110…810 | **2.4 : 1** |
| Left | 1680 × 700 (length × height) | x = −120, z from −1500 to +180, rotateY(90°) about its near edge | **2.4 : 1** |
| Right | 1680 × 700 | x = +1560, z from −1500 to +180, rotateY(−90°) about its near edge | **2.4 : 1** |
(The earlier side walls were 1500 long = 2.14:1; they were extended to 1680 so all three planes are 2.4:1 and a single shared master fills each exactly.) Walls are real 3D planes (no trapezoid crops); junctions meet exactly at the front-wall edges.
- **Not mirrored**: left wall shows the video's left edge nearest the viewer (outer screen edge) and its right edge at the far end; the right wall shows the video's right edge nearest the viewer. Each wall repeats the *complete* video (not a panorama). Verified with a left→right gradient clip.
- **Lighting**: front wall untouched (full brightness). Side walls carry a restrained CSS shade overlay (≈ 22 % → 58 % toward the far corner, plus ≈ 26 % at the floor/ceiling lines). No frames, glow or effects. A soft bottom fade exists only during the early approach for legibility of the approach copy and is gone before the front wall grows large.

## Arrival composition (solved before the approach)
`layout()` runs on mount, on resize and when fonts/text size change. From the pin size (viewport minus header) it chooses type sizes/gaps, measures the headline and paragraph, finds the largest 2.4:1 front video that fits between them (never wider than the viewport; mobile = full width), and **derives the camera end translation** `T = 2500 − 1000 / scale` and vertical offset from that rect. The front video therefore grows monotonically and is never resized to make room. Side walls leave by geometry as the camera advances (slivers at the edges on desktop, none on mobile). Mobile uses the same scene at a smaller stage scale (corridor starts with the far wall ≈ 62 % of the screen width), headline above, paragraph below, controls row at the bottom.
> Mobile: the older "Mobile01" artboard (portrait frame + project posters) cannot carry the new direction; this is a first-pass adaptation of the same three-wall scene — **pending mobile design review**.

## Playback
- **One** hidden `<video>` (muted, loop, playsInline) is the only playback source. Each tick the frame is drawn **once** into the front canvas; the side-wall canvases copy that exact bitmap, so all three walls always show the identical frame (`drawImage(video)` per wall could pick up a newer frame between calls — verified and fixed).
- One shared Play/Pause control (only when a video is configured). Muted: no audio source, no sound control.
- Plays only while the section is in view, the tab is visible and the visitor hasn't paused; pauses when out of view/hidden and resumes on return. Independent of scroll — scrolling backward never rewinds it. Buffering/seek keep the last frame on all walls. Reduced motion: starts paused (no autoplay).
- Loads only when the section is within one viewport of the screen.
- Frame loop and observers run only while the section is near the viewport.

## Fallbacks
No video → the poster (if set) on all three walls, otherwise a labelled "SHOWREEL · 2.4:1 VIDEO PLACEHOLDER" panel on all three. No `<video>`, no controls, no duration. Reduced motion: no pin, no camera movement — the completed arrival composition is shown directly.

## Export specification for the content team (confirmed from the geometry)
**One shared video asset. All three walls are exactly 2.4:1, so no separate dimensions are needed.**
| Item | Spec |
|---|---|
| Aspect ratio | **2.4 : 1 exactly** (width = 2.4 × height) |
| Master (archive) | **3840 × 1600** px |
| Web delivery (one file) | **2400 × 1000** px — matches the front-wall canvas (2400 × 1000); larger sources are downscaled in the browser |
| Codec | **H.264 High profile, 8-bit, yuv420p**, SDR BT.709 (do **not** deliver HEVC / 10-bit / HDR — they do not play in most browsers) |
| Frame rate | 24–30 fps (constant) |
| Audio | **None** (video plays muted; strip the audio track) |
| Container | MP4 with `faststart` (moov atom first) |
| Length / loop | ≈ 5–30 s, **seamless loop** (first and last frames must match — the video loops and plays on all walls) |
| Size target | ≈ 4–10 MB (≈ 3–6 Mbps at 2400 × 1000) |
| Optional | WebM VP9 of the same dimensions as a second source (not wired yet) |
| Poster | same 2.4:1 frame, **≥ 2400 × 1000**, WebP or JPEG, ≈ 100–300 KB |
**Composition notes**: at arrival the whole frame is visible on every viewport (no crop at 2.4:1). While walking, the near ends of the side walls are off-screen by perspective (≈ the outer 20 % at the start), so do not rely on the extreme left of the left wall / extreme right of the right wall in the first seconds of the approach. Other ratios are **centre-cropped to 2.4:1, never stretched or letterboxed**.
Reference conversion: `ffmpeg -i master.mov -an -vf scale=2400:1000 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart -g 48 showreel.mp4`

## Current media (supplied by the client — approval pending)
`public/media/showreel/showreel.mp4` (transcoded from the supplied HEVC 10-bit file: H.264 High 8-bit, 2206 × 946, 5.04 s, silent, 1.7 MB) and `poster.webp` (frame at 1.0 s). 2206 × 946 = 2.33:1, so it is centre-cropped ≈ 2.9 % off top and bottom. It is a 5-second clip that does not loop seamlessly (the sphere enters at the left and leaves at the right), so the loop point jumps. Replace with the final 2.4:1 master.
Content fields: `video.src`, `poster`, `accessibleDescription`, `kicker`, `headline`, `intro`, `arrivalHeadline`, `arrivalDescription`.

## Copy — provisional, pending approval
| Field | Current (provisional) | Previous canvas copy |
|---|---|---|
| kicker | "Work — walk the corridor" (canvas) | same |
| headline | "One reel. / Three walls." | "Six rooms. / One long wall." |
| intro | "Scroll to walk the corridor. The showreel plays on every wall and the film fills the front." | "Each project hangs on the wall. Scroll to walk forward; a project turns to face you as you pass." |
| arrivalHeadline | "The work, in motion." | — |
| arrivalDescription | "A selection of recent brand, campaign and digital work from Rebel Mind Zone, together in one reel." | — |
| accessibleDescription | describes the supplied clip (cream sphere gliding past red, amber and cream panels; no sound) | — |
The canvas wording ("Six rooms", "Each project hangs on the wall…") described project cards that were removed, so it was replaced; revert is a one-line content change if preferred.

## Removed from earlier versions
Cream frame, borders, caption strip, "All projects / Open the archive", six project cards and project captions, project-specific categories (and the `projects` / `archive` content fields), the red ribbed back wall, the portrait mobile frame and posters, the corridor caption that followed the nearest project.

## Verification
`docs/review/milestone-7/tests/corridor-tests.mjs` (puppeteer-core, real Chrome): modes `novideo` (missing-media fallback), `clip` (gradient test clip: orientation, brightness, edge-to-edge, loop, sync, tab visibility, no-rewind) and `real` (the shipped footage). Run against a production build; temporary clips are never committed. `screenshots.mjs` / `record-journey.mjs` regenerate the review media.
