"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FrameSet, REVEAL_REST, fitCanvas, revealSrc } from "./frames";
import { IWStyles, s } from "./styles";

/** The turntable uses the calmer end of the reveal: frames FIRST..REVEAL_REST, swung back and forth. */
const FIRST = 14;
const SPAN = REVEAL_REST - FIRST;
const PERIOD = 15000; // one full swing there and back, in ms
const FPS = 30;

/**
 * Mini: the bag on bone, turning slowly on its turntable (real render frames, cross-faded between
 * neighbours so the slow swing stays smooth). Animates only while visible; the rest frame under
 * reduced motion.
 */
export function Mini() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const indices = Array.from({ length: SPAN + 1 }, (_, k) => FIRST + k);
    const frames = new FrameSet(REVEAL_REST + 1, (i) => revealSrc(i, "m"));
    let raf = 0;
    let visible = false;
    let last = 0;
    let t0 = performance.now();
    let paused = 0;
    let wasLive = false;

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS) return;
      last = now;
      // The FrameSet spans the whole reveal but only the turntable range is loaded.
      if (frames.loaded < indices.length) return;
      // Sine swing from the rest frame toward FIRST and back: always eased, never a hard turn.
      const phase = ((now - t0) % PERIOD) / PERIOD;
      const pos = REVEAL_REST - SPAN * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
      const a = Math.floor(pos);
      const b = Math.min(REVEAL_REST, a + 1);
      const f = pos - a;
      const ia = frames.get(a);
      const ib = frames.get(b);
      if (!ia || !ib) return;
      fitCanvas(canvas);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(ia, 0, 0, canvas.width, canvas.height);
      if (f > 0.02) {
        ctx.globalAlpha = f;
        ctx.drawImage(ib, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      if (!wasLive) {
        wasLive = true;
        setLive(true);
      }
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) frames.load([REVEAL_REST, ...indices.slice(0, -1).reverse()], 4);
        const v = e.intersectionRatio > 0 && e.isIntersecting;
        if (v && !visible) {
          // Resume where we paused, so the swing never jumps.
          t0 += paused ? performance.now() - paused : 0;
          visible = true;
          if (!raf) raf = requestAnimationFrame(frame);
        } else if (!v && visible) {
          visible = false;
          paused = performance.now();
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      frames.dispose();
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className={`absolute inset-0 overflow-hidden ${s.studio}`}>
      <IWStyles />
      <div className={`${s.frame} ${s.mini}`}>
        <Image src={revealSrc(REVEAL_REST, "m")} alt="" fill unoptimized sizes="(max-width: 768px) 120vw, 70vw" className="transition-opacity duration-500" style={{ opacity: live ? 0 : 1 }} />
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
