"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";

/**
 * "Slap and settle" on scroll: cards that are still below the fold wait a little lower and more
 * tilted, then drop onto their resting tilt with a small overshoot as they arrive. Cards already
 * on screen at load stay put (so a project card you return to with Back is never caught moving),
 * nothing is ever hidden, and reduced motion leaves everything at rest.
 *
 * Moves only `transform`; the resting tilt and the hover lift live on the CSS `rotate`/`translate`
 * properties (.card-tilt), so the two never fight.
 */
export function Settle({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const list = ref.current;
      if (!list || prefersReducedMotion()) return;
      const fold = window.innerHeight * 0.94;
      const waiting = (Array.from(list.children) as HTMLElement[]).filter((el) => el.getBoundingClientRect().top > fold);
      if (!waiting.length) return;
      const tilt = (el: HTMLElement) => parseFloat(el.style.getPropertyValue("--tilt")) || 0;
      gsap.set(waiting, { y: 64, rotation: (_: number, el: HTMLElement) => tilt(el) * 2.5 });
      const landed = new WeakSet<Element>();
      const land = (batch: Element[]) => {
        const fresh = batch.filter((el) => !landed.has(el));
        fresh.forEach((el) => landed.add(el));
        if (fresh.length) gsap.to(fresh, { y: 0, rotation: 0, duration: 0.85, ease: MOTION.settle, stagger: 0.08, overwrite: "auto", clearProps: "transform" });
      };
      // A fast jump past the cards (a hash link, End key) still lands them.
      ScrollTrigger.batch(waiting, { start: "top 94%", interval: 0.08, onEnter: land, onLeave: land, onEnterBack: land });
    },
    { scope: ref },
  );

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
