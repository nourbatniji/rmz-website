import type { HeroBanner } from "@/content/types";
import { FrameStore, frameUrl } from "./frame-store";

/**
 * Draws each banner once into an offscreen canvas, then slices it across the rib canvases.
 * Only banners with an image sequence are redrawn while scrolling; stills draw once.
 */
export class PrismEngine {
  private off = document.createElement("canvas");
  private offCtx = this.off.getContext("2d")!;
  private grid: HTMLCanvasElement[][] = [];
  private stores: (FrameStore | null)[];
  private stills: (HTMLImageElement | null)[];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private frame = 0;
  private raf = 0;
  private disposed = false;
  private painted = false;
  private font = "sans-serif";

  constructor(
    private banners: HeroBanner[],
    private onFirstPaint: () => void,
  ) {
    this.font = getComputedStyle(document.body).fontFamily || "sans-serif";
    this.stores = banners.map((b) =>
      b.media?.kind === "sequence" ? new FrameStore(b.media.sequence, () => this.requestDraw(true)) : null,
    );
    this.stills = banners.map((b) => {
      if (b.media?.kind !== "still") return null;
      const im = new Image();
      im.decoding = "async";
      im.onload = () => this.requestDraw(true);
      im.src = b.media.image.src;
      return im;
    });
  }

  /** Number of frames of the first sequence banner (for scroll → frame mapping). */
  get frameCount(): number {
    return this.stores.find((s) => s)?.count ?? 72;
  }

  setCanvases(grid: HTMLCanvasElement[][]) {
    this.grid = grid;
    this.sizeCanvases();
    this.requestDraw(true);
  }

  resize(w: number, h: number, dpr: number) {
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(dpr, 1.5);
    this.off.width = Math.max(1, Math.round(w * this.dpr));
    this.off.height = Math.max(1, Math.round(h * this.dpr));
    this.sizeCanvases();
    this.requestDraw(true);
  }

  setFrame(i: number) {
    const n = this.frameCount;
    const f = Math.max(0, Math.min(n - 1, i));
    if (f === this.frame) return;
    const dir = f - this.frame;
    this.frame = f;
    this.stores.forEach((s) => s?.focus(f, dir));
    this.requestDraw(false);
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

  private requestDraw(all: boolean) {
    if (this.disposed) return;
    if (all) this.dirtyAll = true;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }
  private dirtyAll = true;

  private draw() {
    if (this.disposed || !this.w || !this.grid.length) return;
    const all = this.dirtyAll;
    this.dirtyAll = false;
    this.banners.forEach((b, bi) => {
      const live = this.stores[bi] !== null || (b.media === null && b.expects === "sequence");
      if (!all && !live) return;
      this.compose(b, bi);
      const row = this.grid[bi];
      if (!row) return;
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
    });
    if (!this.painted) {
      this.painted = true;
      this.onFirstPaint();
    }
  }

  private compose(b: HeroBanner, bi: number) {
    const ctx = this.offCtx;
    const W = this.off.width;
    const H = this.off.height;
    const store = this.stores[bi];
    const img = store ? store.best(this.frame) : this.stills[bi];
    if (img && img.naturalWidth > 0) {
      ctx.fillStyle = "#0F0F0E";
      ctx.fillRect(0, 0, W, H);
      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight); // cover
      const dw = img.naturalWidth * k;
      const dh = img.naturalHeight * k;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return;
    }
    this.placeholder(ctx, b, bi, W, H);
  }

  /** Clearly-labelled development placeholder with the right proportions; moves with scroll. */
  private placeholder(ctx: CanvasRenderingContext2D, b: HeroBanner, bi: number, W: number, H: number) {
    const n = this.frameCount;
    const p = n > 1 ? this.frame / (n - 1) : 0;
    const s = this.dpr;
    ctx.fillStyle = "#1a1a18";
    ctx.fillRect(0, 0, W, H);

    // big diagonal colour field, drifts with progress (bi differs per banner)
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, b.accent);
    g.addColorStop(1, "#0F0F0E");
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = g;
    ctx.beginPath();
    const shift = (p * 0.35 + bi * 0.12) * W;
    ctx.moveTo(shift, 0);
    ctx.lineTo(shift + W * 0.7, 0);
    ctx.lineTo(shift + W * 0.35, H);
    ctx.lineTo(shift - W * 0.35, H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // frame-scrub bar
    ctx.fillStyle = "rgba(243,232,204,.9)";
    ctx.fillRect(p * (W - 6 * s), 0, 6 * s, H);

    // labels
    ctx.fillStyle = "#F3E8CC";
    ctx.textBaseline = "alphabetic";
    ctx.font = `900 ${Math.round(H * 0.22)}px ${this.font}`;
    ctx.fillText(b.number, W * 0.05, H * 0.5);
    ctx.font = `600 ${Math.round(14 * s)}px ${this.font}`;
    const tag = b.expects === "sequence"
      ? `DEV PLACEHOLDER · ${b.label.toUpperCase()} · FRAME ${String(this.frame + 1).padStart(3, "0")} / ${String(n).padStart(3, "0")}`
      : `DEV PLACEHOLDER · ${b.label.toUpperCase()} · STILL 16:10`;
    ctx.fillText(tag, W * 0.05, H * 0.58);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.stores.forEach((s) => s?.dispose());
  }
}

export { frameUrl };
