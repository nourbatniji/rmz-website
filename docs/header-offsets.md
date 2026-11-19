# Fixed header and section offsets

Measured header height (the bar, excluding its gradient): **84px** below 768px, **92px** from 768px up.
Exposed as `--header-h` in `src/app/globals.css`.

- `html { scroll-padding-top: calc(var(--header-h) + 16px) }` — navigation anchors (`#capabilities`, `#work`, `#contact`, `#statement`) and keyboard-focus scrolling stop 16px below the header. Programmatic/scroll-linked animation (hero progress, section triggers) is **not** offset.
- No section geometry changed.
- `SiteHeader`: over the hero it keeps the approved transparent gradient; once the hero has scrolled past, it gets a solid ink bar with a hairline so section text never shows through it. Isolated to the header; HeroWall untouched.
- `--header-h` is a constant; if the header height changes (logo, padding) update it in `globals.css`. `docs/review/milestone-3/tests/header-anchors-focus.mjs` fails if it drifts from the measured height.
