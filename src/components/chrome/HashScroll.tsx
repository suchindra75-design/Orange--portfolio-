"use client";

import { useEffect } from "react";
import { scrollToTarget, focusSection } from "@/lib/scroll";

/** Honour `/#stratum` deep links once the page (and Lenis) are mounted. */
export function HashScroll() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id || !document.getElementById(id)) return;
    const t = window.setTimeout(() => {
      scrollToTarget(`#${id}`, { immediate: true });
      focusSection(id);
    }, 60);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
