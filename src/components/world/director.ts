"use client";

import type { ActDef, ActId } from "./acts/types";

/**
 * The director: one mutable singleton, read and written inside the render
 * loop — never React state. It maps the page's scroll position onto the acts:
 *
 *   • progress[id]  0…1 while the act's section scrolls through the viewport
 *   • active        the act whose section holds the viewport's centre line
 *   • cut           0…1 opacity of the full-screen dip between acts, peaking
 *                   exactly where `active` switches, so the change of space is
 *                   never seen.
 */

type SectionBox = { id: ActId; top: number; height: number };

export const director = {
  acts: [] as ActDef[],
  sections: [] as SectionBox[],
  progress: {} as Record<ActId, number>,
  active: "arrival" as ActId,
  cut: 0,
  cutColor: "void" as ActDef["cut"],
  intro: 0,
  pointer: { x: 0, y: 0, tx: 0, ty: 0, mouse: false },
};

export function measure() {
  director.sections = director.acts
    .map((a) => {
      const el = document.querySelector<HTMLElement>(`[data-act="${a.id}"]`);
      if (!el) return null;
      return { id: a.id, top: el.getBoundingClientRect().top + window.scrollY, height: el.offsetHeight };
    })
    .filter(Boolean) as SectionBox[];
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const CUT_SPAN = 0.32; // in viewport heights, either side of a boundary

export function update(scrollY: number, vh: number) {
  const S = director.sections;
  if (!S.length) return;
  const mid = scrollY + vh * 0.5;
  let active = S[0].id;
  for (const s of S) {
    // Progress: 0 when the section's top meets the viewport top, 1 when its bottom meets the viewport bottom.
    const span = Math.max(1, s.height - vh);
    director.progress[s.id] = Math.min(1, Math.max(0, (scrollY - s.top) / span));
    if (mid >= s.top) active = s.id;
  }
  director.active = active;

  // Cut: strongest at each boundary between consecutive sections.
  let cut = 0;
  let color: ActDef["cut"] = "void";
  for (let i = 1; i < S.length; i++) {
    const d = Math.abs(mid - S[i].top) / vh;
    const c = 1 - smooth(Math.min(1, d / CUT_SPAN));
    if (c > cut) {
      cut = c;
      color = director.acts.find((a) => a.id === S[i].id)?.cut ?? "void";
    }
  }
  director.cut = cut;
  director.cutColor = color;
}

/** For scenes: a getter for an act's progress, safe to call inside useFrame. */
export const actProgress = (id: ActId) => director.progress[id] ?? 0;
export const isActive = (id: ActId) => director.active === id;
