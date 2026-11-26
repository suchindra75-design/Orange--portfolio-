"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  gsap.defaults({ ease: "expo.out", duration: 1.1 });
  // Development-only handle for driving frames from devtools / automated checks.
  if (process.env.NODE_ENV !== "production") (window as unknown as { __gsap: typeof gsap }).__gsap = gsap;
}

/** Signature curve: slow start, decisive middle, soft landing. */
export const EASE_STRATA = "expo.inOut";

/**
 * One set of motion values for the whole site, so every scroll-linked move has the same weight.
 *   scrub        lag (s) for scroll-scrubbed motion: calm, never glued to the wheel
 *   scrubSlow    for big, heavy layers (the footer panorama)
 *   settle       "slap and settle": a sticker or card landing with a small overshoot
 *   rise         text and panels arriving
 *   enter        where an element counts as arrived
 */
export const MOTION = {
  scrub: 0.6,
  scrubSlow: 0.9,
  settle: "back.out(1.6)",
  rise: "expo.out",
  enter: "top 88%",
} as const;

export { gsap, ScrollTrigger, SplitText, useGSAP };
