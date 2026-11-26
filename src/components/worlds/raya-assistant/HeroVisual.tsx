"use client";

import { useRef } from "react";
import type { WorldProps } from "../types";
import { useCanvasLoop } from "./canvas";
import { APRICOT, GOLD, SILVER, bandsAt, drawRibbon, rgba } from "./ribbon";

const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Geometry shared by the canvas and the DOM labels (percentages of the hero box). */
const WIDE = { x0: 0.36, x1: 0.965, cy: 0.36, amp: 0.17 };
const NARROW = { x0: 0.06, x1: 0.96, cy: 0.29, amp: 0.1 };

/**
 * HERO: a slit of light opens at the left end of the ribbon, the ribbon draws itself out of it
 * across the upper right (≤ 1.2 s), then breathes quietly. Silver hairlines measure it like an
 * instrument. Bottom-left stays calm for the title.
 */
export function HeroVisual({ project }: WorldProps) {
  const phase = useRef(0);
  const lastT = useRef(0);

  const { ref } = useCanvasLoop(({ ctx, w, h, t, reduced }) => {
    const G = w >= 768 ? WIDE : NARROW;
    const x0 = w * G.x0;
    const x1 = w * G.x1;
    const cy = h * G.cy;
    const amp = h * G.amp;
    const tt = reduced ? 3 : t;
    const dt = Math.max(0, Math.min(0.1, tt - lastT.current));
    lastT.current = tt;

    const draw = reduced ? 1 : easeOutExpo(clamp01((tt - 0.12) / 1.0));
    const intro = reduced ? 0 : 1 - clamp01((tt - 0.5) / 0.9); // 1 during the "hello", eases to 0
    const level = 0.86 + 0.12 * Math.sin(tt * 0.85) + intro * 0.3;
    const speed = 0.55 + intro * 2.1;
    phase.current = reduced ? 1.6 : phase.current + dt * speed;

    // a low warm light behind the voice
    const glow = ctx.createRadialGradient((x0 + x1) / 2, cy, 0, (x0 + x1) / 2, cy, (x1 - x0) * 0.62);
    glow.addColorStop(0, rgba(APRICOT, 0.05 + intro * 0.04));
    glow.addColorStop(1, rgba(APRICOT, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // hairlines: amplitude guides, end brackets and a 48-step ruler under the ribbon
    const guideA = 0.08 * draw;
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(SILVER, guideA);
    ctx.beginPath();
    for (const y of [cy - amp, cy + amp]) {
      ctx.moveTo(x0, Math.round(y) + 0.5);
      ctx.lineTo(x0 + (x1 - x0) * draw, Math.round(y) + 0.5);
    }
    ctx.stroke();
    const ry = Math.round(cy + amp + Math.max(18, h * 0.03)) + 0.5;
    ctx.strokeStyle = rgba(SILVER, 0.22 * draw);
    ctx.beginPath();
    ctx.moveTo(x0, ry);
    ctx.lineTo(x0 + (x1 - x0) * draw, ry);
    const steps = w >= 768 ? 48 : 24;
    for (let k = 0; k <= steps * draw; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / steps) + 0.5;
      const tall = k % 12 === 0 ? 9 : k % 4 === 0 ? 5 : 3;
      ctx.moveTo(x, ry);
      ctx.lineTo(x, ry - tall);
    }
    ctx.stroke();

    // the slit of light the ribbon comes out of
    const slit = reduced ? 0.32 : clamp01(tt / 0.28) * (1 - 0.68 * clamp01((tt - 0.35) / 0.85));
    const sh = h * (w >= 768 ? 0.3 : 0.16);
    const sg = ctx.createLinearGradient(0, cy - sh, 0, cy + sh);
    sg.addColorStop(0, rgba(GOLD, 0));
    sg.addColorStop(0.5, rgba(GOLD, slit));
    sg.addColorStop(1, rgba(GOLD, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(Math.round(x0) - 0.5, cy - sh, 1.5, sh * 2);
    if (slit > 0.05) {
      const halo = ctx.createRadialGradient(x0, cy, 0, x0, cy, h * 0.12);
      halo.addColorStop(0, rgba(GOLD, 0.16 * slit));
      halo.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(x0 - h * 0.12, cy - h * 0.12, h * 0.24, h * 0.24);
    }

    // phase is integrated by hand so the speed change after the intro never jumps
    drawRibbon(ctx, {
      x0,
      x1,
      cy,
      amp,
      level,
      t: phase.current,
      speed: 1,
      state: "ready",
      progress: draw,
      width: Math.max(1.6, Math.min(2.6, w / 640)),
      band: bandsAt(phase.current * 0.6),
      color: APRICOT,
      echo: true,
    });
  }, 30);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: project.world.bg }}>
      <canvas ref={ref} className="absolute inset-0 size-full" />
      {/* instrument labels, placed on the same geometry as the canvas */}
      <div className="enter-fade absolute font-mono text-[10px] uppercase tracking-[0.16em] max-md:left-[calc(6%+0.6rem)] max-md:top-[calc(29%+10%+1.9rem)] md:left-[calc(36%+0.75rem)] md:top-[calc(36%+17%+2.6rem)]" style={{ color: project.world.muted, animationDelay: "0.6s" }}>
        In · 16 kHz mono
      </div>
      <div className="enter-fade absolute text-right font-mono text-[10px] uppercase tracking-[0.16em] max-md:right-[4%] max-md:top-[calc(29%+10%+1.9rem)] md:right-[3.5%] md:top-[calc(36%+17%+2.6rem)]" style={{ color: project.world.muted, animationDelay: "0.75s" }}>
        Out · 24 kHz
      </div>
      <div className="enter-fade absolute right-[3.5%] top-[calc(var(--header-h)+1.25rem)] flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] max-md:right-[4%]" style={{ color: project.world.muted, animationDelay: "0.9s" }}>
        <span className="inline-block size-[6px] rounded-full" style={{ background: project.world.accent }} />
        <span style={{ color: project.world.ink }}>Ready</span>
        <span className="hidden normal-case tracking-normal sm:inline" style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem" }}>
          Speak or type a message.
        </span>
      </div>
    </div>
  );
}
