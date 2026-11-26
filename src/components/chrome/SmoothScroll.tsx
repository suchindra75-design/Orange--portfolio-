"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { getLenis, setLenis } from "@/lib/scroll";

/**
 * Lenis drives inertial scrolling; GSAP's ticker drives Lenis so ScrollTrigger
 * and the scroll position share a single frame clock (no double rAF, no drift).
 * Disabled entirely for visitors who prefer reduced motion.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  // After a route change Next sets the scroll position (top, or the restored one on Back).
  // Sync Lenis to it so it doesn't glide back to the previous page's offset, then re-measure triggers.
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const lenis = getLenis();
        if (lenis) {
          lenis.resize();
          lenis.scrollTo(window.scrollY, { immediate: true, force: true });
        }
        ScrollTrigger.refresh();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Lerp-based smoothing: responsive to the wheel, never "floaty".
    const lenis = new Lenis({ lerp: 0.14, smoothWheel: true, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(lenis);

    // Fonts change line lengths; re-measure every trigger once they land.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    // Content that changes height after an interaction (tabs, demos) would leave every trigger
    // below it stale: re-measure, debounced, whenever the page's height actually changes.
    let lastH = document.documentElement.scrollHeight;
    let t = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const h = document.documentElement.scrollHeight;
        if (Math.abs(h - lastH) < 2) return;
        lastH = h;
        ScrollTrigger.refresh();
      }, 250);
    });
    ro.observe(document.body);

    return () => {
      ro.disconnect();
      window.clearTimeout(t);
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
