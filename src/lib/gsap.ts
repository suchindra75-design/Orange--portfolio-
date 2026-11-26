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

export { gsap, ScrollTrigger, SplitText, useGSAP };
