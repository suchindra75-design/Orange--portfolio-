"use client";

import { useEffect, useRef } from "react";
import NextImage from "next/image";
import { character, type CharacterFrame } from "@/content/character";
import { prefersReducedMotion } from "@/lib/hooks";

/**
 * The hero character: the owner's own head-turn animation, played one real frame at a time.
 *
 * - Frames come from his character video (tools/character/extract.py, metadata in
 *   content/character.ts). Each frame says which way it looks (screen angle) and how far (mag).
 * - The cursor sets a target angle and mag (atan2 from the face; near the face = mag 0 = eye
 *   contact). The angle eases with lerpAngle, the mag with lerp, and the canvas shows the single
 *   nearest real frame. Frames are never blended, and the picture never moves (no CSS 3D).
 * - Idle: the video's own blink, and now and then a small glance up and away.
 * - Phones: a touch on the hero turns him toward your finger, then he looks back at you.
 * - Reduced motion: the still centre frame only.
 *
 * The <img> holds the centre frame from the first paint; the canvas covers it once ready.
 */

type Loaded = CharacterFrame & { img: HTMLImageElement; x: number; y: number };

const FACE = { x: 0.5, y: 0.34 }; // where his face sits in the frame (centre frame), as fractions
const NEAR = 0.16; // within this many card-heights of the face: look straight at you
const FAR = 0.95; // this far away or more: fully turned
const SWITCH = 0.025; // hysteresis: a new frame must be this much nearer than the shown one
const DPR = 1.5; // 2D canvas cap (DESIGN §5)

function lerpAngle(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

function load(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img.decode().then(
    () => img,
    () => null,
  );
}

export function HeroCharacter({ alt }: { alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = box.current!;
    const cv = canvas.current!;
    if (prefersReducedMotion()) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let alive = true;
    let center: HTMLImageElement | null = null;
    let blink: HTMLImageElement[] = [];
    const frames: Loaded[] = [];
    let shown: HTMLImageElement | null = null;
    let shownFrame: Loaded | null = null;

    // Gaze state: target and current, as screen angle (radians) and mag (0..1).
    const target = { a: 0, m: 0 };
    const cur = { a: 0, m: 0 };
    let pointer: { x: number; y: number } | null = null;
    let lastInput = performance.now();
    let blinkAt = performance.now() + 3000 + Math.random() * 2500;
    let blinkStart = -1;
    let glanceUntil = 0;
    let glanceNext = performance.now() + 7000;
    let release = 0;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // --- canvas size and drawing -------------------------------------------------------------
    const size = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min(window.devicePixelRatio || 1, DPR);
      cv.width = Math.max(1, Math.round(r.width * s));
      cv.height = Math.max(1, Math.round(r.height * s));
      if (shown) paint(shown, true);
    };
    const paint = (img: HTMLImageElement, force = false) => {
      if (img === shown && !force) return;
      shown = img;
      // Cover-fit, anchored to the bottom (the shoulders sit on the card's lower edge).
      const k = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      ctx.drawImage(img, (cv.width - w) / 2, cv.height - h, w, h);
      el.dataset.live = "";
      el.dataset.frame = img.src.slice(img.src.lastIndexOf("/") + 1); // which frame is up (tests, devtools)
    };

    // --- choosing a frame --------------------------------------------------------------------
    const pick = (): HTMLImageElement | null => {
      if (!center) return null;
      const now = performance.now();
      const gx = cur.m * Math.cos(cur.a);
      const gy = cur.m * Math.sin(cur.a);
      let best: Loaded | null = null;
      let bd = Math.hypot(gx, gy); // the centre frame sits at (0, 0)
      for (const f of frames) {
        const d = Math.hypot(gx - f.x, gy - f.y);
        if (d < bd) {
          bd = d;
          best = f;
        }
      }
      // Hysteresis, so two neighbours never flicker back and forth.
      const sd = shownFrame ? Math.hypot(gx - shownFrame.x, gy - shownFrame.y) : Math.hypot(gx, gy);
      if (best !== shownFrame && bd > sd - SWITCH) best = shownFrame;
      shownFrame = best;
      if (best) return best.img;
      // Looking at you: the video's own blink plays now and then.
      if (blinkStart >= 0 && blink.length === 2) {
        const t = now - blinkStart;
        if (t < 60) return blink[0];
        if (t < 140) return blink[1];
        if (t < 210) return blink[0];
        blinkStart = -1;
        blinkAt = now + 2600 + Math.random() * 3400;
      }
      return center;
    };

    // --- the loop (runs only while something is moving and the hero is on screen) -----------
    let raf = 0;
    let last = 0;
    let visible = false;
    const tick = (t: number) => {
      raf = 0;
      if (!alive || !visible) return;
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      const now = performance.now();

      if (pointer) {
        const r = el.getBoundingClientRect();
        const fx = r.left + r.width * FACE.x;
        const fy = r.top + r.height * FACE.y;
        const dx = pointer.x - fx;
        const dy = pointer.y - fy;
        const d = Math.hypot(dx, dy) / r.height;
        target.a = Math.atan2(dy, dx);
        target.m = Math.min(1, Math.max(0, (d - NEAR) / (FAR - NEAR)));
      } else if (now < glanceUntil) {
        // keep the glance target
      } else {
        target.m = 0;
        if (frames.length && now > glanceNext && now - lastInput > 6000) {
          // A small real glance: up, or up and to his side (the gentle frames the video has).
          target.a = Math.random() < 0.5 ? -Math.PI / 2 : (205 * Math.PI) / 180;
          target.m = 0.42;
          glanceUntil = now + 1100;
          glanceNext = now + 8000 + Math.random() * 6000;
        }
      }

      // Ease: the angle on the circle (lerpAngle), the mag on a line.
      const ka = 1 - Math.exp(-dt * 11);
      const km = 1 - Math.exp(-dt * 8);
      cur.a = cur.m < 0.02 ? target.a : lerpAngle(cur.a, target.a, ka);
      cur.m += (target.m - cur.m) * km;

      // Blink only while looking at you; otherwise try again a little later.
      if (blinkStart < 0 && now > blinkAt) {
        if (cur.m < 0.12 && target.m < 0.12 && !shownFrame) blinkStart = now;
        else blinkAt = now + 1500;
      }

      const img = pick();
      if (img) paint(img);

      const settling = Math.abs(target.m - cur.m) > 0.004 || (cur.m > 0.02 && Math.abs(Math.atan2(Math.sin(target.a - cur.a), Math.cos(target.a - cur.a))) > 0.004);
      if (settling || blinkStart >= 0 || now < glanceUntil) kick();
      else wake(); // sleep until the next blink or glance
    };
    let sleeper = 0;
    const kick = () => {
      window.clearTimeout(sleeper);
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      window.clearTimeout(sleeper);
      const now = performance.now();
      const next = Math.min(blinkAt, frames.length && !pointer ? Math.max(glanceNext, lastInput + 6000) : Infinity, glanceUntil > now ? glanceUntil : Infinity);
      sleeper = window.setTimeout(() => {
        last = 0;
        kick();
      }, Math.max(16, next - now));
    };

    // --- input -------------------------------------------------------------------------------
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") pointer = { x: e.clientX, y: e.clientY };
      else return;
      lastInput = performance.now();
      kick();
    };
    const onLeave = () => {
      pointer = null;
      lastInput = performance.now();
      kick();
    };
    const hero = el.closest("section") ?? document.body;
    const onTouch = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      loadFrames(true);
      window.clearTimeout(release);
      pointer = { x: e.clientX, y: e.clientY };
      lastInput = performance.now();
      kick();
    };
    const onTouchEnd = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      window.clearTimeout(release);
      release = window.setTimeout(onLeave, 900);
    };

    // --- loading -----------------------------------------------------------------------------
    let framesRequested = false;
    let urgent = false; // a finger is on the hero: stop waiting for idle time
    let startTimer = 0;
    const idle = (fn: () => void) =>
      urgent ? window.setTimeout(fn, 0) : typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(fn, { timeout: 600 }) : window.setTimeout(fn, 50);
    const loadFrames = (now = false) => {
      if (now) urgent = true;
      if (framesRequested) return;
      framesRequested = true;
      // A few at a time, in idle time, in an order that covers the whole circle early
      // (every 32nd, then every 16th, every 8th...). Each frame joins the choice once decoded.
      const order: number[] = [];
      for (let step = 32; step >= 1; step /= 2)
        for (let i = 0; i < character.frames.length; i += step) if (!order.includes(i)) order.push(i);
      let next = 0;
      const pump = () => {
        if (!alive || next >= order.length) return;
        const f = character.frames[order[next++]];
        load(f.src).then((img) => {
          if (img && alive) {
            const a = (f.angle * Math.PI) / 180;
            frames.push({ ...f, img, x: f.mag * Math.cos(a), y: f.mag * Math.sin(a) });
          }
          idle(pump);
        });
      };
      for (let k = 0; k < 4; k++) idle(pump);
    };

    load(character.center).then((img) => {
      if (!img || !alive) return;
      center = img;
      size();
      paint(img, true);
      Promise.all(character.blink.map(load)).then((b) => {
        if (alive && b.every(Boolean)) blink = b as HTMLImageElement[];
      });
      // Desktop with a mouse: preload all directions once the page has settled.
      if (fine) startTimer = window.setTimeout(() => loadFrames(), 1200);
      kick();
    });

    const ro = new ResizeObserver(() => size());
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        last = 0;
        kick();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        window.clearTimeout(sleeper);
      }
    });
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    hero.addEventListener("pointerdown", onTouch, { passive: true });
    hero.addEventListener("pointermove", onTouch, { passive: true });
    hero.addEventListener("pointerup", onTouchEnd);
    hero.addEventListener("pointercancel", onTouchEnd);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(sleeper);
      window.clearTimeout(release);
      window.clearTimeout(startTimer);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      hero.removeEventListener("pointerdown", onTouch);
      hero.removeEventListener("pointermove", onTouch);
      hero.removeEventListener("pointerup", onTouchEnd);
      hero.removeEventListener("pointercancel", onTouchEnd);
    };
  }, []);

  return (
    <div ref={box} className="hero-character relative h-full w-full overflow-hidden" style={{ background: character.bg.edge }}>
      {/* The centre frame, from the first paint (also what reduced motion and no-JS see). */}
      {/* unoptimized: the canvas draws this very file, so it must not be re-encoded under another URL.
          priority: it is the hero's main image, so it gets a preload tag in the head. */}
      <NextImage src={character.center} alt={alt} fill priority unoptimized sizes="(max-width: 768px) 90vw, 40vw" className="object-cover object-bottom" />
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
