import type { HeroBanner } from "@/content/types";
import { FrameStore } from "./frame-store";

const SETTLE_MS = 1800; // longer than the prism transition: the outgoing face stays rendered until then

/**
 * Renders the prism faces.
 *
 *  - ONE shared normalised progress (0–1, from the global page scroll) drives every banner;
 *    each banner maps it to its own frame count: frame = round(progress × (count − 1)).
 *  - Each banner is drawn once per update into an offscreen canvas (fixed cover crop), then sliced
 *    across its rib canvases, so every rib of a face always shows the same frame, correctly aligned.
 *  - Only the active face (plus the outgoing one during a prism transition) is redrawn;
 *    nothing is drawn while the hero is offscreen. On return the current frame is drawn immediately.
 */
export class PrismEngine {
  private off = document.createElement("canvas");
  private offCtx = this.off.getContext("2d")!;
  private grid: HTMLCanvasElement[][] = [];
  private stores: (FrameStore | null)[];
  private posters: (HTMLImageElement | null)[];
  private frames: number[];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private progress = 0;
  private active = 0;
  private leaving = -1;
  private leaveTimer = 0;
  private visible = true;
  private raf = 0;
  private dirty = new Set<number>();
  private disposed = false;
  private painted = false;
  private shown: (HTMLImageElement | null)[];
  private font = "sans-serif";

  constructor(
    private banners: HeroBanner[],
    private onFirstPaint: () => void,
  ) {
    this.font = getComputedStyle(document.body).fontFamily || "sans-serif";
    this.frames = banners.map(() => 0);
    this.shown = banners.map(() => null);
    this.posters = banners.map((b, bi) => {
      if (!b.poster) return null;
      const im = new Image();
      im.decoding = "async";
      im.onload = () => this.mark(bi);
      im.src = b.poster.src;
      return im;
    });
    this.stores = banners.map((b, bi) => (b.sequence ? new FrameStore(b.sequence, () => this.mark(bi)) : null));
    // Test-only hook, compiled out unless the build sets NEXT_PUBLIC_HERO_DEBUG=1.
    if (process.env.NEXT_PUBLIC_HERO_DEBUG === "1") {
      (window as unknown as { __rmzHero?: unknown }).__rmzHero = () => ({
        progress: this.progress,
        active: this.active,
        frames: [...this.frames],
        visible: this.visible,
        counts: this.stores.map((s) => s?.count ?? 0),
      });
    }
  }

  setCanvases(grid: HTMLCanvasElement[][]) {
    this.grid = grid;
    this.sizeCanvases();
    this.markStage();
  }

  resize(w: number, h: number, dpr: number) {
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(dpr, 1.5);
    this.off.width = Math.max(1, Math.round(w * this.dpr));
    this.off.height = Math.max(1, Math.round(h * this.dpr));
    this.sizeCanvases();
    this.markStage();
  }

  /** Shared normalised page-scroll progress (0..1). Never changes on banner change. */
  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
    this.syncFrames();
  }

  /** True when frames 0..to of banner `b` are decoded (lets a caller play a short opening segment only when it is ready). */
  hasFrames(b: number, to: number): boolean {
    const st = this.stores[b];
    if (!st) return false;
    for (let i = 0; i <= to; i++) if (!st.get(i)) return false;
    return true;
  }

  /** Which banner faces the viewer. Does not touch progress. */
  setActive(i: number) {
    if (i === this.active) return;
    this.leaving = this.active;
    this.active = i;
    clearTimeout(this.leaveTimer);
    this.leaveTimer = window.setTimeout(() => {
      const gone = this.leaving;
      this.leaving = -1;
      if (gone >= 0 && gone !== this.active) this.stores[gone]?.trim();
    }, SETTLE_MS);
    this.syncFrames();
    // the incoming banner shows the frame for the CURRENT progress (never restarts at frame 1)
    this.stores[i]?.focus(this.frames[i], 0);
    this.markStage();
  }

  /** Hero on/off screen. Offscreen = no loading, no drawing; onscreen = draw the correct frame now. */
  setVisible(v: boolean) {
    if (v === this.visible) return;
    this.visible = v;
    if (v) {
      this.syncFrames();
      this.markStage();
    }
  }

  private stage(): number[] {
    return this.leaving >= 0 && this.leaving !== this.active ? [this.active, this.leaving] : [this.active];
  }

  private markStage() {
    this.stage().forEach((b) => this.mark(b));
  }

  private mark(b: number) {
    if (this.disposed) return;
    this.dirty.add(b);
    if (!this.visible || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private frameFor(b: number): number {
    const n = this.stores[b]?.count ?? 0;
    return n > 1 ? Math.round(this.progress * (n - 1)) : 0;
  }

  private syncFrames() {
    if (!this.visible) return;
    for (const b of this.stage()) {
      const f = this.frameFor(b);
      if (f !== this.frames[b]) {
        const dir = f - this.frames[b];
        this.frames[b] = f;
        this.stores[b]?.focus(f, dir);
        this.mark(b);
      }
    }
  }

  private sizeCanvases() {
    const ribs = this.grid[0]?.length ?? 0;
    if (!ribs || !this.w) return;
    const rw = Math.max(1, Math.round((this.w / ribs) * this.dpr));
    const rh = Math.max(1, Math.round(this.h * this.dpr));
    for (const row of this.grid) {
      for (const c of row) {
        if (c.width !== rw || c.height !== rh) {
          c.width = rw;
          c.height = rh;
        }
      }
    }
  }

  private draw() {
    if (this.disposed || !this.visible || !this.w || !this.grid.length) return;
    const todo = [...this.dirty].filter((b) => this.stage().includes(b));
    this.dirty.clear();
    for (const bi of todo) {
      const row = this.grid[bi];
      if (!row) continue;
      this.compose(bi);
      const n = row.length;
      const sw = this.off.width / n;
      row.forEach((c, i) => {
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(this.off, i * sw, 0, sw, this.off.height, 0, 0, c.width, c.height);
        // subtle per-rib shading so the wall reads as ribbed (as in the approved canvas)
        const sh = ctx.createLinearGradient(0, 0, c.width, 0);
        sh.addColorStop(0, "rgba(255,255,255,.05)");
        sh.addColorStop(0.4, "rgba(255,255,255,0)");
        sh.addColorStop(1, "rgba(0,0,0,.14)");
        ctx.fillStyle = sh;
        ctx.fillRect(0, 0, c.width, c.height);
      });
    }
    if (!this.painted && todo.length) {
      this.painted = true;
      this.onFirstPaint();
    }
  }

  /** Fixed "cover" crop for every frame, so only the pixels change — never position or scale. */
  private compose(bi: number) {
    const ctx = this.offCtx;
    const W = this.off.width;
    const H = this.off.height;
    const store = this.stores[bi];
    // The requested frame if it is decoded; while it is still loading keep showing the LAST RENDERED frame (never a blank or a jump
    // to some other frame); only before anything was rendered fall back to the nearest valid frame, then the poster.
    const exact = store && store.usable ? store.get(this.frames[bi]) : null;
    const frame = exact ?? this.shown[bi] ?? (store && store.usable ? store.best(this.frames[bi]) : null);
    const poster = this.posters[bi];
    const img = frame ?? (poster && poster.naturalWidth > 0 ? poster : null);
    if (img && (exact || !this.shown[bi])) this.shown[bi] = img;
    if (img) {
      ctx.fillStyle = "#0F0F0E";
      ctx.fillRect(0, 0, W, H);
      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * k;
      const dh = img.naturalHeight * k;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return;
    }
    this.placeholder(ctx, this.banners[bi], W, H);
  }

  /** Last-resort labelled placeholder (no sequence, no poster). */
  private placeholder(ctx: CanvasRenderingContext2D, b: HeroBanner, W: number, H: number) {
    ctx.fillStyle = "#1a1a18";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, b.accent);
    g.addColorStop(1, "#0F0F0E");
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#F3E8CC";
    ctx.font = `900 ${Math.round(H * 0.22)}px ${this.font}`;
    ctx.fillText(b.number, W * 0.05, H * 0.5);
    ctx.font = `600 ${Math.round(14 * this.dpr)}px ${this.font}`;
    ctx.fillText(`DEV PLACEHOLDER · ${b.label.toUpperCase()} · NO SEQUENCE OR POSTER`, W * 0.05, H * 0.58);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.leaveTimer);
    this.stores.forEach((s) => s?.dispose());
  }
}
