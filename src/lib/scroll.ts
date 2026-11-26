"use client";

import type Lenis from "lenis";

/** The active Lenis instance (null under reduced motion or before mount). */
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};
export const getLenis = () => instance;

type Target = string | number | HTMLElement;

export function scrollToTarget(target: Target, opts: { immediate?: boolean; duration?: number; offset?: number } = {}) {
  const lenis = instance;
  if (lenis) {
    lenis.scrollTo(target, {
      immediate: opts.immediate,
      duration: opts.duration ?? 1.6,
      offset: opts.offset ?? 0,
      easing: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    });
    return;
  }
  const behavior: ScrollBehavior = opts.immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior });
    return;
  }
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0);
  window.scrollTo({ top, behavior });
}

/** Move keyboard focus to a section after a programmatic jump, without re-scrolling. */
export function focusSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}
