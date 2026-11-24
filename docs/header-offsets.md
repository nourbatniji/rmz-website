# Fixed header and section offsets

Measured header height (the bar, excluding its gradient): **84px** below 768px, **92px** from 768px up.
Exposed as `--header-h` in `src/app/globals.css`.

- `html { scroll-padding-top: calc(var(--header-h) + 16px) }` — navigation anchors (`#services`, `#minds`, `#work`, `#contact`, `#statement`) and keyboard-focus scrolling stop 16px below the header. Programmatic/scroll-linked animation (hero progress, section triggers) is **not** offset.
- No section geometry changed.
- `SiteHeader` is now the approved "Balanced centre" header (see `docs/site-header.md`): 72 px (60 px on phones), always the transparent over-image surface with a short soft scrim — it no longer turns solid. **`--header-h` is deliberately left at 92/84 px**: pinned sections and anchors keep their geometry, so their stages sit ~20 px below the 72 px bar (changing the token would move every pinned section). `docs/review/milestone-3/tests/header-anchors-focus.mjs` compares `--header-h` with the measured bar and therefore reports the intentional difference.
- `--header-h` is a constant; if the header height changes (logo, padding) update it in `globals.css`. `docs/review/milestone-3/tests/header-anchors-focus.mjs` fails if it drifts from the measured height.
