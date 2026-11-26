"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";

/** Masked line-by-line rise, triggered once when the block enters view. */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  delay = 0,
  start = "top 88%",
  id,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  start?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion() || !ref.current) return;
      const el = ref.current;
      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 115,
            duration: 1.1,
            stagger: 0.09,
            ease: "expo.out",
            delay,
            scrollTrigger: { trigger: el, start, once: true },
          });
        },
      });
      return () => split.revert();
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
