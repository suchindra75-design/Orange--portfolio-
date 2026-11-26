"use client";

import type Lenis from "lenis";

/** The active Lenis instance (null under reduced motion or before mount). */
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};
export const getLenis = () => instance;

/**
 * Smooth scroll holds still while a page transition plays, so the old page's inertia never drags
 * the new page (Lenis and the View Transition would otherwise fight over the scroll position).
 * SmoothScroll releases the hold on the next route; a timer releases it if no route change comes.
 */
let navHold = false;
let navTimer = 0;
export function holdForNavigation() {
  if (!instance || instance.isStopped) return;
  navHold = true;
  instance.stop();
  window.clearTimeout(navTimer);
  navTimer = window.setTimeout(releaseNavigationHold, 1500);
}
export function releaseNavigationHold() {
  window.clearTimeout(navTimer);
  if (!navHold) return;
  navHold = false;
  instance?.start();
}

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

/**
 * True while the page is scrolling (and for a moment after). Decorative loops (the project cards'
 * canvases) skip their redraws while it is true, so scrolling gets the whole frame budget; they
 * pick up again as soon as the page settles. One passive listener for the whole app.
 */
let lastScroll = -1e9;
if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => (lastScroll = performance.now()), { passive: true, capture: true });
}
export const isScrolling = () => performance.now() - lastScroll < 150;
