"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { PAPER, artifacts, drawPaper, drawPen, eeg, eog, eyeMovements, recordingTime, runCanvas, totalSamples } from "./signal";

/** The six channels, named as the app names them (field1–field6 of the cloud channel). */
const LANES = [
  { name: "EEG value", sub: "field1 · µV", f: eeg, color: PAPER.ink, amp: 0.42, width: 1.15 },
  { name: "EOG value", sub: "field2 · µV", f: eog, color: PAPER.verdigris, amp: 0.36, width: 1.3 },
  { name: "Eye Movements", sub: "field3 · events", f: (t: number) => eyeMovements(t), color: PAPER.terracotta, amp: 0.36, width: 1.1 },
  { name: "EEG Artifacts", sub: "field4", f: artifacts, color: PAPER.oxblood, amp: 0.4, width: 1.1 },
  { name: "Total Samples", sub: "field5", f: (t: number) => totalSamples(t), color: PAPER.muted, amp: 0.34, width: 1 },
  { name: "Recording Time", sub: "field6", f: (t: number) => recordingTime(t), color: PAPER.muted, amp: 0.34, width: 1 },
];

/** Sprocket margin of the strip, shared by the canvas and the HTML lane labels. */
const M = 18;
const INTRO_MS = 1050;

/**
 * HeroVisual: a recorder strip in the top right. On arrival a red sweep crosses it once
 * (≈1 s) and leaves the six lanes inked behind it; then the paper idles forward slowly.
 */
export function HeroVisual() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let paper = 2400;
    // The intro runs on the clock, not on frames: if frames are scarce it still ends on time.
    const t0 = performance.now();
    let repaint = () => {};
    const done = window.setTimeout(() => repaint(), INTRO_MS + 60);
    const stop = runCanvas(canvas, {
      animate: !reduced,
      fps: 30,
      expose: (r) => (repaint = r),
      draw: ({ ctx, w, h, now, dt }) => {
        const raw = reduced ? 1 : Math.min(1, Math.max(0, (now - t0) / INTRO_MS));
        const p = 1 - Math.pow(1 - raw, 3);
        if (raw >= 1) paper += dt * 22;

        const narrow = w < 560;
        const pxPerSec = narrow ? 150 : 190;
        drawPaper(ctx, 0, 0, w, h, { shift: paper, cell: 10, margin: M });
        const penX = w * (narrow ? 0.82 : 0.86);
        const sweepX = penX * p;
        const laneH = (h - 2 * M) / LANES.length;

        // Lane rules, drawn by the sweep.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, sweepX, h);
        ctx.clip();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = "rgba(26,18,22,0.14)";
        ctx.lineWidth = 1;
        for (let i = 1; i < LANES.length; i++) {
          const y = Math.round(M + laneH * i) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(penX, y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        LANES.forEach((ln, i) => {
          const cy = M + laneH * (i + 0.5);
          ctx.strokeStyle = ln.color;
          ctx.lineWidth = ln.width;
          ctx.lineJoin = "round";
          ctx.beginPath();
          for (let x = 0; x <= sweepX; x += 1.25) {
            const t = (paper - (penX - x)) / pxPerSec;
            const y = cy - ln.f(t) * laneH * ln.amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        ctx.restore();

        // The sweep / the pens.
        ctx.strokeStyle = raw < 1 ? PAPER.oxblood : "rgba(122,36,48,0.5)";
        ctx.lineWidth = raw < 1 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(sweepX) + 0.5, M - 6);
        ctx.lineTo(Math.round(sweepX) + 0.5, h - M + 6);
        ctx.stroke();
        LANES.forEach((ln, i) => {
          const cy = M + laneH * (i + 0.5);
          const t = (paper - (penX - sweepX)) / pxPerSec;
          drawPen(ctx, sweepX, cy - ln.f(t) * laneH * ln.amp, w - 10, cy, 1);
        });
      },
    });
    return () => {
      window.clearTimeout(done);
      stop();
    };
  }, [reduced]);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: PAPER.bg }}>
      {/* The bench: a faint static grid on the ground around the strip. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(122,36,48,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(122,36,48,0.045) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, black 30%, transparent 85%)",
        }}
      />
      <div className="absolute left-[var(--gutter)] right-0 top-[calc(var(--header-h)+3.5rem)] h-[clamp(9rem,calc(100svh-40rem),30svh)] md:left-[40%] md:top-[calc(var(--header-h)+2rem)] md:h-[clamp(10rem,calc(100svh-35rem),46svh)]">
        <div className="absolute inset-0 shadow-[0_30px_60px_-40px_rgba(26,18,22,0.45)]">
          <canvas ref={ref} className="absolute inset-0 block size-full" />
        </div>
        {/* Lane labels: in a column left of the strip on wide screens, inside each lane on phones. */}
        <ol className="pointer-events-none absolute left-0 grid w-48 md:left-auto md:right-[calc(100%+1.25rem)] md:w-44" style={{ top: M, bottom: M, gridTemplateRows: `repeat(${LANES.length}, 1fr)` }}>
          {LANES.map((ln, i) => (
            <li
              key={ln.name}
              className="flex flex-col justify-start pl-2 pt-1 md:justify-center md:pl-0 md:pt-0 md:text-right"
              style={{ animation: reduced ? undefined : `fade-in 0.5s ease-out ${0.15 + i * 0.09}s both` }}
            >
              <span className="t-label w-fit rounded-[2px] md:self-end bg-[#F5EEE3]/85 px-1 text-[0.56rem] leading-tight md:bg-transparent md:px-0 md:text-[0.64rem]" style={{ color: i === 0 ? PAPER.ink : ln.color === PAPER.muted ? PAPER.ink : ln.color }}>
                <span className="mr-2 opacity-50">{String(i + 1).padStart(2, "0")}</span>
                {ln.name}
              </span>
              <span className="t-label hidden text-[0.56rem] leading-tight md:block" style={{ color: PAPER.muted }}>
                {ln.sub.replace(" · µV", "")}
                {ln.sub.endsWith("µV") && <span className="normal-case"> · µV</span>}
              </span>
            </li>
          ))}
        </ol>
        <div className="absolute left-0 right-[var(--gutter)] top-full mt-3 flex items-center justify-between gap-3">
          <span className="t-label hidden text-[0.6rem] sm:inline" style={{ color: PAPER.muted }}>
            Live EEG · montage stack · six channels
          </span>
          <span className="sim sim-light ml-auto">Synthetic signal · illustration</span>
        </div>
      </div>
    </div>
  );
}
