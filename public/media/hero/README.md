# Hero photographic sequence (cloche)

- `cloche/` — **six independently generated keyframes** (aligned by translation only on the face; no warping/scaling).
  Order (closed → highest): 001 = source file 3, 002 = file 6, 003 = file 5, 004 = file 4, 005 = file 2, 006 = file 1.
  Originals live (gitignored) in `assets-src/cloche-originals/`.
- `cloche-interpolated/` — **EXPERIMENTAL** 41-frame motion-interpolated set (ffmpeg `minterpolate`, mci/aobmc/bidir) made
  from the six keyframes. It contains visible ghosting/smearing around the hand, sleeve, lid and tray. NOT production quality.
  Select it with `HERO_CLOCHE_VARIANT=interpolated` at build time (see `src/content/dev/homepage.ts`).
