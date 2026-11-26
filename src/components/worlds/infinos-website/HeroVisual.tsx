"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FrameSet, REVEAL_COUNT, REVEAL_REST, fitCanvas, revealSrc, type FrameSize } from "./frames";
import { IWStyles, s } from "./styles";

const INTRO_MS = 1150; // DESIGN §4: intros stay under 1.2 s
const WAIT_MS = 1400; // the longest we wait for frames before starting the intro anyway
const ease = (t: number) => 1 - Math.pow(1 - t, 4); // quart out: a decisive turn, a soft landing

/**
 * The hero: the site's photoreal reveal, played once as the intro (the camera swings round the
 * bag), then resting on the hero frame. Frames load progressively; the first frame is the poster.
 * Reduced motion: the rest frame only, no animation.
 */
export function HeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size: FrameSize = window.innerWidth < 768 ? "m" : "d";

    let raf = 0;
    let timer = 0;
    let shown = -1;
    let target = reduced ? REVEAL_REST : 0;
    let started = false;
    let alive = true;

    const draw = (want: number, force = false) => {
      const i = frames.nearestIndex(want);
      if (i < 0) return;
      const img = frames.get(i);
      if (!img) return;
      const resized = fitCanvas(canvas);
      if (i === shown && !resized && !force) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (shown < 0) setLive(true);
      shown = i;
    };

    const play = () => {
      if (started || !alive) return;
      started = true;
      window.clearTimeout(timer);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / INTRO_MS);
        target = Math.round(ease(t) * REVEAL_REST);
        draw(target);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const frames = new FrameSet(
      REVEAL_COUNT,
      (i) => revealSrc(i, size),
      (i) => {
        if (reduced) {
          if (i === REVEAL_REST) draw(REVEAL_REST);
          return;
        }
        if (frames.complete) play();
        // After the intro, keep converging on the rest frame as stragglers arrive.
        else if (started && target === REVEAL_REST) draw(REVEAL_REST);
      },
    );

    if (reduced) frames.load([REVEAL_REST], 1);
    else {
      frames.load(Array.from({ length: REVEAL_COUNT }, (_, i) => i), 6);
      timer = window.setTimeout(play, WAIT_MS);
    }

    const ro = new ResizeObserver(() => {
      if (shown >= 0) draw(shown, true);
    });
    ro.observe(canvas);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      ro.disconnect();
      frames.dispose();
    };
  }, []);

  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden ${s.studio}`}>
      <IWStyles />
      <div className={`${s.frame} ${s.hero}`}>
        <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: live ? 0 : 1 }}>
          <Image src={revealSrc(0, "m")} alt="" fill unoptimized sizes="190vw" fetchPriority="high" className={s.posterM} />
          <Image src={revealSrc(0, "d")} alt="" fill unoptimized sizes="110vw" fetchPriority="high" className={s.posterD} />
          <Image src={revealSrc(REVEAL_REST, "m")} alt="" fill unoptimized sizes="190vw" className={s.posterRestM} />
          <Image src={revealSrc(REVEAL_REST, "d")} alt="" fill unoptimized sizes="110vw" className={s.posterRestD} />
        </div>
        <canvas ref={canvasRef} className="block" />
      </div>
      {/* Editorial annotation, kept to the right edge so the bottom-left stays calm for the title. */}
      <div className="absolute right-[var(--gutter)] top-[calc(var(--header-h)+1.25rem)] hidden items-center gap-3 text-[var(--w-muted)] md:flex">
        <span className="inline-block h-px w-8 bg-[var(--w-accent)]" />
        <span className="t-label">Cycles render · reveal sequence</span>
      </div>
      <p className={`t-label absolute right-[calc(var(--gutter)*0.55)] top-1/2 hidden -translate-y-1/2 text-[var(--w-muted)] opacity-70 lg:block ${s.credit}`}>INFINOS Pro Dual-Chamber Bag · © INFINOS Tech</p>
    </div>
  );
}
