# About section — scroll-linked scrubber

`src/components/home/about/AboutScrubber.tsx` (+ `about.css`, `liquid-image.ts`) replaced the pinned flip-card "Featured work" section on the homepage.

* **Layout:** the "scrubber" from the Homepage Journey V2 prototype, used to tell the studio's story in three steps (image, title, short text).
  Desktop (≥ 1024 px, motion allowed): a sticky stage inside a track of extra scroll; page scroll position drives one continuous value, each step cross-fades and slides,
  the step list jumps to any step, nothing captures the wheel, and the stage scrolls away after the last step. Mobile / reduced motion / no JS: a plain vertical list.
* **Image effect:** a subtle liquid effect on the current image — desktop, fine pointer, scroll at rest only.
* **Content:** reuses the existing `featured` section data so the dashboard editor keeps working (name = title, category = kicker, description = text, image).
  The dev defaults in `src/content/dev/homepage.ts` use the three delivered photographs in `public/media/featured/`; the copy is provisional until the studio approves it.
  Saved dashboard content overrides these defaults ("reset section to default" applies the new ones).
* The dashboard calls this section "About" (`src/lib/admin/section-meta.ts`).
