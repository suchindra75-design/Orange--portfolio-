"use client";

import { useSyncExternalStore } from "react";

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const reduced = mediaStore("(prefers-reduced-motion: reduce)");
const finePointer = mediaStore("(hover: hover) and (pointer: fine)");

export function useReducedMotion() {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
}

export function useFinePointer() {
  return useSyncExternalStore(finePointer.subscribe, finePointer.get, () => false);
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
