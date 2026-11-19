import type { SequenceRef } from "@/content/types";

export function sequenceLength(seq: SequenceRef): number {
  return "frames" in seq ? seq.frames.length : seq.frameCount;
}

export function frameUrl(seq: SequenceRef, i: number): string {
  if ("frames" in seq) return seq.frames[i];
  return seq.pattern.replace("{n}", String(seq.startAt + i).padStart(seq.digits, "0"));
}

type Options = {
  /** Max decoded frames kept in memory (keyframes + frame 0 are exempt from eviction). */
  maxDecoded: number;
  concurrency: number;
  /** Every Nth frame is a "keyframe" loaded early so a fast scrub still shows something close. */
  keyEvery: number;
  /** Frames loaded around the current one. */
  window: number;
};

/** Sequences up to this many frames are loaded completely in the background (nearest frames first). */
const SMALL_SEQUENCE = 30;

const DEFAULTS: Options = { maxDecoded: 20, concurrency: 3, keyEvery: 10, window: 5 };

/**
 * Staged, memory-bounded frame loader for ONE banner.
 *  1. frame 0 immediately, 2. keyframes in the background, 3. a window around the current frame.
 * A missing/failed frame never blanks the picture: `best()` returns the nearest valid frame.
 */
export class FrameStore {
  private imgs = new Map<number, HTMLImageElement>();
  private pending = new Set<number>();
  private failed = new Set<number>();
  private queue: number[] = [];
  private active = 0;
  private cur = 0;
  private dir = 1;
  private disposed = false;
  private all = false;
  private opts: Options;
  readonly count: number;

  constructor(
    private seq: SequenceRef,
    private onChange: () => void,
    opts: Partial<Options> = {},
  ) {
    this.opts = { ...DEFAULTS, ...opts };
    this.count = sequenceLength(seq);
    // A short sequence is small enough to keep entirely: load every frame in the background and never evict.
    this.all = this.count <= SMALL_SEQUENCE;
    if (this.all) this.opts.maxDecoded = Math.max(this.opts.maxDecoded, this.count);
    this.focus(0, 1);
  }

  /** True while the sequence can still produce something (some frame loaded, or loading is in flight). */
  get usable(): boolean {
    return this.count > 0 && (this.imgs.size > 0 || this.pending.size > 0 || this.queue.length > 0);
  }

  /** The decoded frame `i` itself, or null while it is still loading. */
  get(i: number): HTMLImageElement | null {
    return this.imgs.get(i) ?? null;
  }

  /** Nearest valid frame to `i` (ties prefer the earlier one), else null. */
  best(i: number): HTMLImageElement | null {
    const hit = this.imgs.get(i);
    if (hit) return hit;
    for (let d = 1; d < this.count; d++) {
      const a = this.imgs.get(i - d);
      if (a) return a;
      const b = this.imgs.get(i + d);
      if (b) return b;
    }
    return null;
  }

  /** Tell the store which frame is wanted so it can prioritise what to load. */
  focus(i: number, dir: number) {
    this.cur = i;
    if (dir) this.dir = dir > 0 ? 1 : -1;
    const n = this.count;
    const wanted: number[] = [i];
    for (let d = 1; d <= this.opts.window; d++) {
      wanted.push(i + this.dir * d, i - this.dir * Math.ceil(d / 2));
    }
    for (let k = 0; k < n; k += this.opts.keyEvery) wanted.push(k);
    wanted.push(n - 1);
    if (this.all) for (let d = 1; d < n; d++) wanted.push(i + d, i - d); // then everything else, nearest first
    this.queue = wanted.filter((k) => k >= 0 && k < n && !this.imgs.has(k) && !this.pending.has(k));
    this.pump();
  }

  /** Drop everything except keyframes (called when a banner goes off-stage). */
  trim() {
    for (const k of [...this.imgs.keys()]) {
      if (k !== 0 && k % this.opts.keyEvery !== 0) this.imgs.delete(k);
    }
  }

  private pump() {
    while (!this.disposed && this.active < this.opts.concurrency && this.queue.length) {
      const k = this.queue.shift()!;
      if (this.imgs.has(k) || this.pending.has(k) || this.failed.has(k)) continue;
      this.load(k);
    }
  }

  private load(k: number) {
    this.pending.add(k);
    this.active++;
    const im = new Image();
    im.decoding = "async";
    const done = (ok: boolean) => {
      this.pending.delete(k);
      this.active--;
      if (this.disposed) return;
      if (ok) {
        this.imgs.set(k, im);
        this.evict();
        this.onChange();
      } else {
        this.failed.add(k); // keep showing the nearest valid frame
      }
      this.pump();
      if (!ok) this.onChange(); // lets the engine re-check `usable` and fall back to the poster
    };
    im.onload = () => (im.decode ? im.decode().then(() => done(true), () => done(true)) : done(true));
    im.onerror = () => done(false);
    im.src = frameUrl(this.seq, k);
  }

  private evict() {
    while (this.imgs.size > this.opts.maxDecoded) {
      let worst = -1;
      let dist = -1;
      for (const k of this.imgs.keys()) {
        if (k === 0 || k % this.opts.keyEvery === 0) continue;
        const d = Math.abs(k - this.cur);
        if (d > dist) {
          dist = d;
          worst = k;
        }
      }
      if (worst < 0) return;
      this.imgs.delete(worst);
    }
  }

  dispose() {
    this.disposed = true;
    this.imgs.clear();
    this.queue = [];
  }
}
