import type { SequenceRef } from "@/content/types";

export function frameUrl(seq: SequenceRef, i: number): string {
  const n = String(seq.startAt + i).padStart(seq.digits, "0");
  return seq.pattern.replace("{n}", n);
}

type Options = {
  /** Max decoded frames kept in memory (keyframes + frame 0 are exempt from eviction). */
  maxDecoded: number;
  concurrency: number;
  /** Every Nth frame is a "keyframe" loaded early so a fast scrub still shows something close. */
  keyEvery: number;
  /** Frames loaded ahead/behind the current one. */
  window: number;
};

const DEFAULTS: Options = { maxDecoded: 28, concurrency: 4, keyEvery: 12, window: 6 };

/**
 * Staged, memory-bounded frame loader.
 *  1. frame 0 immediately (the poster),
 *  2. keyframes in the background,
 *  3. a window around the current frame while scrubbing.
 * A missing/failed frame never blanks the picture: `best()` returns the nearest valid earlier frame.
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
  private opts: Options;

  constructor(
    private seq: SequenceRef,
    private onChange: () => void,
    opts: Partial<Options> = {},
  ) {
    this.opts = { ...DEFAULTS, ...opts };
    this.focus(0, 1);
  }

  get count() {
    return this.seq.frameCount;
  }

  /** Nearest valid frame at or before `i`, else the nearest after it, else null. */
  best(i: number): HTMLImageElement | null {
    for (let k = i; k >= 0; k--) {
      const im = this.imgs.get(k);
      if (im) return im;
    }
    for (let k = i + 1; k < this.seq.frameCount; k++) {
      const im = this.imgs.get(k);
      if (im) return im;
    }
    return null;
  }

  /** Tell the store which frame is on screen so it can prioritise what to load. */
  focus(i: number, dir: number) {
    this.cur = i;
    if (dir) this.dir = dir > 0 ? 1 : -1;
    const n = this.seq.frameCount;
    const wanted: number[] = [i];
    for (let d = 1; d <= this.opts.window; d++) {
      wanted.push(i + this.dir * d, i - this.dir * Math.ceil(d / 2));
    }
    for (let k = 0; k < n; k += this.opts.keyEvery) wanted.push(k);
    wanted.push(n - 1);
    this.queue = wanted.filter((k) => k >= 0 && k < n && !this.imgs.has(k) && !this.pending.has(k));
    this.pump();
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
        this.failed.add(k); // keep showing the last valid frame
      }
      this.pump();
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
