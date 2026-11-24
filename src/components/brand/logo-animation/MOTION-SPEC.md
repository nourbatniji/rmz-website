# RMZ logo animation — motion spec

Measured from the motion reference (`rmz_3.mp4`: 1080×1920, 25 fps, 6.04 s) and applied to the supplied logo PDF.
Times in seconds; distances in the PDF's 1080 × 1080 units. Source of truth for the numbers is `logo-timeline.ts`.

| # | Phase | Start | Dur | Motion | Ease |
|---|-------|------:|----:|--------|------|
| 1 | Orange square | 0.142 | 0.539 | scale 0 → 1 about its own centre | bezier(.25,.91,.69,.82) |
| 2 | Yellow / green squares | 0.722 | 0.809 | slide out from behind the orange square, 62.44 each (yellow left, green right) | bezier(.27,.26,.02,.89) |
| 3 | Outline r | 0.895 | 0.778 | hairline silhouette draws from the top-right end going left | power1.in |
| 3 | Outline m | 1.069 | 0.997 | silhouette draws from top-left going down (top edge left to the bar) | power1.in |
| 3 | Outline Z | 1.210 | 1.008 | silhouette draws from top-left going right | bezier(.24,.07,.15,.04) |
| 4 | Fill r | 1.432 | 1.212 | wipe along the r centre-line, perpendicular leading edge | bezier(.27,.16,.01,.92) |
| 4 | Fill m bar | 1.900 | 0.224 | grows down from its top edge | power1.in |
| 4 | Fill m legs | 2.127 | 0.487 | wipe downward | bezier(.14,.26,.27,.70) |
| 4 | Fill Z top bar | 1.984 | 0.692 | wipe right → left | bezier(.27,0,.39,.85) |
| 4 | Fill Z diagonal | 2.078 | 0.883 | wipe top-right → bottom-left (45° leading edge) | bezier(.31,.37,.30,1) |
| 4 | Fill Z bottom bar | 2.103 | 0.861 | wipe left → right | power2.out |
| 5 | Outlines fade | 2.750 | 0.250 | scaffolding leaves so the final frame is exactly the artwork | linear |
| 6 | Lockup re-centre | 2.388 | 1.058 | whole lockup glides from +86.3 to 0 (orange square starts on canvas centre) | bezier(.36,0,0,.97) |
| 7 | ® | 2.412 | 1.483 | glides from (+38, +45) to 0, hidden behind the r until it emerges | bezier(.37,0,.03,.89) |
| 8 | Wordmark | 2.558 | 1.004 | slides from −200 to 0, visible only right of the Z's right edge (x = 725.1) | bezier(.12,.68,.27,1) |
| 9 | Hold | 3.9 | — | still until 6.04 s | — |

## Notes and approximations

- Artwork: every path is the PDF's own (`logo-artwork.ts`, generated, not retyped). The PDF holds three stacked colour variants; the black one is used (it is the one that renders, and matches the reference).
- The reference video spells the wordmark "REBIL". Only its motion was used; lettering comes from the PDF (REBEL).
- Constructed (not in the PDF): hairline outline silhouettes of m and Z (union of the PDF's own bar/leg/diagonal edges), the r outline is the PDF path itself, and the wipe masks (centre-lines / rectangles). They are scaffolding and are gone in the final frame.
- Hairline: 1.2 units, cream at 50 % (the reference shows a ~1 px, ~50 % line).
- The reference's own logo is not pixel-identical to the PDF (different "E" in the wordmark, slightly different r curve), so its motion was measured, not its geometry.
