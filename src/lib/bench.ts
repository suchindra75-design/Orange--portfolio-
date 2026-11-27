"use client";

import type { ProjectSlug } from "@/content/projects";

/**
 * THE BENCH'S SHARED STATE (one module, no React state in any frame loop).
 *
 * The home hero's crane, the 3D bench, its DOM layer (index rail, hit areas, labels, chips, tour)
 * and the character all read and write this one place. It is written from input and from GSAP's
 * ticker, and read inside the render loop, so nothing here ever triggers a React render on its
 * own; DOM that needs to react subscribes.
 *
 *   crane     0 → 1 as the hero cranes over into the bench (scrubbed by scroll)
 *   hover     the object being pointed at or focused (rail, hit area, keyboard)
 *   focus     the object the camera is framing (opening a project, or a tour stop)
 *   filter    the chip in use, if any: the slugs that stay forward
 *   look      a point on screen the character should look at (an object), or null for the cursor
 */
export type BenchState = {
  crane: number;
  hover: ProjectSlug | null;
  focus: ProjectSlug | null;
  filter: { id: string; slugs: ProjectSlug[] } | null;
  tour: boolean;
  look: { x: number; y: number } | null;
};

const state: BenchState = { crane: 0, hover: null, focus: null, filter: null, tour: false, look: null };
const listeners = new Set<(s: BenchState) => void>();
let renderer: (() => void) | null = null;

export const bench = {
  get: () => state,
  /** Merge a change, ask the bench for a frame, and tell subscribers. */
  set(patch: Partial<BenchState>) {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof BenchState)[]) {
      if (state[k] !== patch[k]) {
        (state as Record<string, unknown>)[k] = patch[k];
        changed = true;
      }
    }
    if (!changed) return;
    renderer?.();
    listeners.forEach((l) => l(state));
  },
  subscribe(l: (s: BenchState) => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  /** The 3D bench registers how to ask itself for a frame. */
  setRenderer(fn: (() => void) | null) {
    renderer = fn;
  },
  requestRender: () => renderer?.(),
};
