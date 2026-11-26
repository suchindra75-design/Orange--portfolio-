"use client";

/**
 * Frame sequences for the INFINOS world. All frames are the owner's Blender Cycles renders made
 * for the live site (© INFINOS Tech), re-encoded as transparent WebP in public/work/infinos-website/.
 *
 *   reveal  37 frames (every other frame of the site's 72-frame reveal, plus the last one)
 *   open    120 frames (the site's full opening sequence)
 *
 * Each has a desktop set (1920×1200) and a phone set (1200×750).
 */
const BASE = "/work/infinos-website";

export const REVEAL_COUNT = 37;
export const REVEAL_REST = REVEAL_COUNT - 1;
export const OPEN_COUNT = 120;

export type FrameSize = "d" | "m";

export const revealSrc = (i: number, size: FrameSize) => `${BASE}/reveal/${size}/${String(i).padStart(2, "0")}.webp`;
export const openSrc = (i: number, size: FrameSize) => `${BASE}/open/${size}/${String(i).padStart(3, "0")}.webp`;

/** Device-pixel ratio, capped (DESIGN §5). */
export const dpr = () => Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 1.5);

/** Coarse-to-fine order: ends first, then midpoints, so a scrubbed sequence is usable early. */
export function bisectOrder(count: number): number[] {
  const out: number[] = [0, count - 1];
  const seen = new Set(out);
  let step = count - 1;
  while (step > 1) {
    const half = Math.floor(step / 2);
    for (let i = half; i < count; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }
    step = half;
  }
  for (let i = 0; i < count; i++) if (!seen.has(i)) out.push(i);
  return out;
}

/**
 * A lazily loaded image sequence. Frames load in the given order with limited concurrency and
 * are decoded before use; `nearest(i)` returns the closest frame that is ready.
 */
export class FrameSet {
  private imgs: (HTMLImageElement | null)[];
  private ready: boolean[];
  private dead = false;
  private started = false;
  loaded = 0;

  constructor(
    readonly count: number,
    private readonly src: (i: number) => string,
    private readonly onFrame?: (i: number) => void,
  ) {
    this.imgs = new Array(count).fill(null);
    this.ready = new Array(count).fill(false);
  }

  load(order: number[], concurrency = 6) {
    if (this.started || this.dead) return;
    this.started = true;
    let next = 0;
    const pump = () => {
      if (this.dead || next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = "async";
      this.imgs[i] = img;
      const done = () => {
        if (this.dead) return;
        this.ready[i] = true;
        this.loaded++;
        this.onFrame?.(i);
        pump();
      };
      img.onload = () => {
        (img.decode ? img.decode() : Promise.resolve()).then(done, done);
      };
      img.onerror = () => pump();
      img.src = this.src(i);
    };
    for (let k = 0; k < concurrency; k++) pump();
  }

  has(i: number) {
    return this.ready[i] === true;
  }

  get complete() {
    return this.loaded >= this.count;
  }

  /** The ready frame closest to i (ties prefer the earlier frame). */
  nearestIndex(i: number): number {
    if (this.ready[i]) return i;
    for (let d = 1; d < this.count; d++) {
      if (i - d >= 0 && this.ready[i - d]) return i - d;
      if (i + d < this.count && this.ready[i + d]) return i + d;
    }
    return -1;
  }

  get(i: number): HTMLImageElement | null {
    return this.ready[i] ? this.imgs[i] : null;
  }

  dispose() {
    this.dead = true;
    for (const img of this.imgs) {
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
    }
    this.imgs = [];
    this.ready = [];
  }
}

/** Size a canvas's backing store to its CSS box at the capped DPR. Returns true if it changed. */
export function fitCanvas(canvas: HTMLCanvasElement): boolean {
  const r = dpr();
  const w = Math.max(1, Math.round(canvas.clientWidth * r));
  const h = Math.max(1, Math.round(canvas.clientHeight * r));
  if (canvas.width === w && canvas.height === h) return false;
  canvas.width = w;
  canvas.height = h;
  return true;
}
