"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { REVEAL_REST, revealSrc } from "./frames";
import { IWStyles, s } from "./styles";
import { isScrolling } from "@/lib/scroll";

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
    // Compressed frames (about 25 KB each), fetched once; decoding happens off the main thread.
    const blobs = new Map<number, Blob>();
    let loading = false;
    const loadAll = () => {
      if (loading) return;
      loading = true;
      const order = [REVEAL_REST, ...indices.slice(0, -1).reverse()];
      let next = 0;
      const pump = () => {
        if (disposed || next >= order.length) return;
        const i = order[next++];
        fetch(revealSrc(i, "m"))
          .then((r) => (r.ok ? r.blob() : null))
          .then((b) => {
            if (b && !disposed) blobs.set(i, b);
          })
          .catch(() => {})
          .finally(pump);
      };
      for (let k = 0; k < 4; k++) pump();
    };
    let raf = 0;
    let visible = false;
    let last = 0;
    let t0 = performance.now();
    let paused = 0;
    let wasLive = false;
    let disposed = false;

    // The renders are 1200×750; the card is far smaller. Each frame is decoded off the main
    // thread straight to the canvas's own pixel size (high-quality filtering) and kept as a
    // bitmap, so nothing is decoded or scaled while the page scrolls (decoding full-size frames
    // on the main thread used to stall scrolling for up to 100 ms). Canvas DPR ≤ 1.5 (DESIGN §5).
    const bitmaps = new Map<number, ImageBitmap>();
    const pending = new Set<number>();
    let gen = 0;
    const size = () => {
      const r = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * r));
      const h = Math.max(1, Math.round(canvas.clientHeight * r));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gen++;
      bitmaps.forEach((b) => b.close());
      bitmaps.clear();
      pending.clear();
    };
    const bitmap = (i: number): ImageBitmap | null => {
      const have = bitmaps.get(i);
      if (have) return have;
      const blob = blobs.get(i);
      if (!blob || pending.has(i) || typeof createImageBitmap !== "function") return null;
      pending.add(i);
      const g = gen;
      createImageBitmap(blob, { resizeWidth: canvas.width, resizeHeight: canvas.height, resizeQuality: "high" }).then(
        (b) => {
          if (g === gen && !disposed) bitmaps.set(i, b);
          else b.close();
          pending.delete(i);
        },
        () => pending.delete(i),
      );
      return null;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS || isScrolling()) return;
      last = now;
      // The FrameSet spans the whole reveal but only the turntable range is loaded.
      // Sine swing from the rest frame toward FIRST and back: always eased, never a hard turn.
      const phase = ((now - t0) % PERIOD) / PERIOD;
      const pos = REVEAL_REST - SPAN * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
      const a = Math.floor(pos);
      const b = Math.min(REVEAL_REST, a + 1);
      const f = pos - a;
      // Warm the next frames a little ahead, one per tick.
      for (let k = 0; k <= SPAN; k++) if (!bitmaps.has(FIRST + k)) { bitmap(FIRST + k); break; }
      const ia = bitmap(a);
      const ib = f > 0.02 ? bitmap(b) : ia;
      if (!ia || !ib) return; // keep the last picture until both are ready
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
        if (e.isIntersecting) loadAll();
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
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      blobs.clear();
      bitmaps.forEach((bm) => bm.close());
      bitmaps.clear();
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
