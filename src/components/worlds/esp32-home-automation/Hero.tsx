"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { FRAMING_HERO, House, ROOMS, allLit, sendPulse, useInView, type Lit } from "./house";

const STAGGER = 110;
const TRAVEL = 300;

/**
 * HERO: the house is dark for a breath, then lights room by room from the controller outward
 * (all done inside 1.2 s), and rests lit. The only idle motion is the bedroom fan, and only
 * while the hero is on screen.
 */
export function HeroVisual() {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(box);
  const [lit, setLit] = useState<Lit>(allLit(false));
  const [tv, setTv] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const timers: number[] = [];
    const anims: Animation[] = [];
    ROOMS.forEach((r, i) => {
      timers.push(
        window.setTimeout(() => {
          const a = sendPulse(svg.current, r, TRAVEL);
          if (a) anims.push(a);
        }, 60 + i * STAGGER),
      );
      timers.push(
        window.setTimeout(() => {
          setLit((s) => ({ ...s, [r]: true }));
          if (r === "living") setTv(true);
        }, 60 + i * STAGGER + TRAVEL - 40),
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
    };
  }, [reduced]);

  const on = reduced ? allLit(true) : lit;
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ background: "#120A0F" }} aria-hidden="true">
      <House svgRef={svg} lit={on} tv={reduced || tv} fan={reduced || on.bedroom} caption="turn on the lights" captionState="sent" framing={FRAMING_HERO} live={inView} fade={300} />
    </div>
  );
}
