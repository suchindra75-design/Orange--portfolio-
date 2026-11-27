"use client";

import { useEffect, useRef } from "react";
import NextImage from "next/image";
import { character } from "@/content/character";
import { bench } from "@/lib/bench";
import { prefersReducedMotion } from "@/lib/hooks";
import { ANG, MAG, N, RING, RING_NODES, angDiff, route } from "./poseGraph";

/**
 * The hero character: the owner's own head-turn animation, played one real frame at a time.
 *
 * How he follows the cursor:
 * - Frames come from his character video (tools/character/extract.py, metadata in
 *   content/character.ts). Each frame says which way it looks (screen angle) and how far (mag).
 *   The video turns his head in a full circle, so almost every direction exists only as a full
 *   turn; only "up" and "up-left" also have the in-between frames of the head turning out.
 * - So there are two kinds of pose to aim for: looking at you (the cursor is on his face) or
 *   turned toward the cursor (the full-turn frame nearest its direction). That is what makes him
 *   respond the moment the cursor leaves his face, instead of waiting for it to travel far away.
 * - He never jumps across the circle. The frames form a graph: neighbours in the video, the
 *   circle closed on itself, and a direct turn from looking at you to each full turn. The shown
 *   frame walks the shortest route to the aimed pose, one real frame per step (two when far
 *   behind), the way the video itself plays. Frames are never blended, and the picture never
 *   moves (no CSS 3D).
 * - Idle: the video's own blink, and now and then a small glance up and away (the gentle
 *   in-between frames, there and back).
 * - Phones: a touch on the hero turns him toward your finger, then he looks back at you.
 * - Reduced motion: the still centre frame only.
 *
 * The <img> holds the centre frame from the first paint; the canvas covers it once ready.
 */

const FACE = { x: 0.5, y: 0.34 }; // where his face sits in the frame (centre frame), as fractions
const EYE_IN = 0.14; // cursor closer than this many card-heights to his face: look at you
const EYE_OUT = 0.18; // ...and further than this to turn away again (hysteresis, no flicker)
const AIM_HOLD = (4 * Math.PI) / 180; // a new full turn must be this much closer in angle
const STEP = 1000 / 60; // one real frame per display frame...
const STEP_FAST = 1000 / 120; // ...two when the shown frame is far behind the aim
const DPR = 1.5; // DESIGN §5 cap: on this class of GPU a 2× canvas on the tilted card cost scroll frames

/** A frame, decoded off the main thread into a GPU-ready bitmap (drawing it never decodes). */
type Frame = { bmp: ImageBitmap; name: string };
function load(src: string): Promise<Frame | null> {
  const name = src.slice(src.lastIndexOf("/") + 1);
  return fetch(src)
    .then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then((b) => createImageBitmap(b))
    .then(
      (bmp) => ({ bmp, name }),
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
    const img: (Frame | null)[] = new Array(N).fill(null); // img[0] is the centre frame
    let blink: Frame[] = [];
    let drawn: Frame | null = null;

    // Pose state: the node shown, the node aimed at, and the route between them.
    let at = 0;
    let aim = 0;
    let path: number[] = [];
    let stepAcc = 0;
    let looking = true; // the cursor is on his face (with hysteresis)

    let pointer: { x: number; y: number } | null = null;
    let lastInput = performance.now();
    let blinkAt = performance.now() + 2500 + Math.random() * 2500;
    let blinkStart = -1;
    let glanceUntil = 0;
    let glanceNext = performance.now() + 7000;
    let release = 0;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const has = (i: number) => img[i] !== null;

    // --- canvas size and drawing -------------------------------------------------------------
    const size = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min(window.devicePixelRatio || 1, DPR);
      cv.width = Math.max(1, Math.round(r.width * s));
      cv.height = Math.max(1, Math.round(r.height * s));
      if (drawn) paint(drawn, true);
    };
    const paint = (f: Frame, force = false) => {
      if (f === drawn && !force) return;
      drawn = f;
      // Cover-fit, anchored to the bottom (the shoulders sit on the card's lower edge).
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const k = Math.max(cv.width / f.bmp.width, cv.height / f.bmp.height);
      const w = f.bmp.width * k;
      const h = f.bmp.height * k;
      ctx.drawImage(f.bmp, (cv.width - w) / 2, cv.height - h, w, h);
      el.dataset.live = "";
      el.dataset.frame = f.name; // which frame is up (tests, devtools)
    };

    // --- choosing what to aim at -------------------------------------------------------------
    /** The full turn nearest a direction, among the frames that have arrived. */
    const nearestTurn = (a: number) => {
      let best = -1;
      for (const i of RING_NODES) if (has(i) && (best < 0 || angDiff(ANG[i], a) < angDiff(ANG[best], a))) best = i;
      return best;
    };
    /** A gentle in-between frame (for idle glances): the one nearest a direction and a small turn. */
    const nearestSoft = (a: number, m: number) => {
      let best = -1;
      let bd = Infinity;
      for (let i = 1; i < N; i++) {
        if (!has(i) || MAG[i] >= RING) continue;
        const d = Math.hypot(MAG[i] * Math.cos(ANG[i]) - m * Math.cos(a), MAG[i] * Math.sin(ANG[i]) - m * Math.sin(a));
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return best;
    };
    const setAim = (n: number) => {
      if (n < 0 || n === aim) return;
      aim = n;
      path = route(at, aim, has);
    };

    // --- the loop (runs only while something is moving and the hero is on screen) -----------
    let raf = 0;
    let last = 0;
    let visible = false;
    const tick = (t: number) => {
      raf = 0;
      if (!alive || !visible || !img[0]) return;
      const dt = Math.min(100, last ? t - last : STEP);
      last = t;
      const now = performance.now();

      // On the home bench he looks at the object you point at; otherwise at your cursor.
      const target = bench.get().look ?? pointer;
      if (target) {
        const r = el.getBoundingClientRect();
        const dx = target.x - (r.left + r.width * FACE.x);
        const dy = target.y - (r.top + r.height * FACE.y);
        const d = Math.hypot(dx, dy) / r.height;
        looking = looking ? d < EYE_OUT : d < EYE_IN;
        if (looking) setAim(0);
        else {
          const a = Math.atan2(dy, dx);
          // Hold the current full turn unless another is clearly nearer (no back-and-forth).
          const n = nearestTurn(a);
          if (n >= 0 && !(MAG[aim] >= RING && has(aim) && angDiff(ANG[aim], a) <= angDiff(ANG[n], a) + AIM_HOLD)) setAim(n);
        }
      } else if (now >= glanceUntil) {
        looking = true;
        setAim(0);
        if (now > glanceNext && now - lastInput > 6000) {
          // A small real glance: up, or up and to his side (the in-between frames the video has).
          setAim(nearestSoft(Math.random() < 0.5 ? -Math.PI / 2 : (205 * Math.PI) / 180, 0.45));
          glanceUntil = now + 1200;
          glanceNext = now + 8000 + Math.random() * 6000;
        }
      }

      // Walk the route: one real frame per step, faster when far behind.
      if (path.length) {
        stepAcc += dt;
        const interval = path.length > 8 ? STEP_FAST : STEP;
        while (path.length && stepAcc >= interval - 2) {
          stepAcc = Math.max(0, stepAcc - interval);
          // Skip frames that haven't arrived yet; stop on the next one that has.
          let n = path.shift()!;
          while (!has(n) && path.length) n = path.shift()!;
          if (has(n)) at = n;
        }
        if (!path.length) stepAcc = 0;
      } else stepAcc = 0;

      // Blink only while looking at you; otherwise try again a little later.
      if (blinkStart < 0 && now > blinkAt) {
        if (at === 0 && aim === 0 && blink.length === 2) blinkStart = now;
        else blinkAt = now + 1500;
      }
      let f = img[at] ?? img[0];
      if (at === 0 && blinkStart >= 0) {
        const bt = now - blinkStart;
        if (bt < 60) f = blink[0];
        else if (bt < 140) f = blink[1];
        else if (bt < 210) f = blink[0];
        else {
          blinkStart = -1;
          blinkAt = now + 2600 + Math.random() * 3400;
        }
      } else if (at !== 0) blinkStart = -1;
      if (f) paint(f);

      if (path.length || blinkStart >= 0 || now < glanceUntil) kick();
      else wake(); // sleep until the next blink or glance (or the next pointer move)
    };
    let sleeper = 0;
    const kick = () => {
      window.clearTimeout(sleeper);
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      window.clearTimeout(sleeper);
      last = 0;
      const now = performance.now();
      const next = Math.min(blinkAt, !pointer && !bench.get().look ? Math.max(glanceNext, lastInput + 6000) : Infinity, glanceUntil > now ? glanceUntil : Infinity);
      sleeper = window.setTimeout(kick, Math.max(16, next - now));
    };

    // --- input -------------------------------------------------------------------------------
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointer = { x: e.clientX, y: e.clientY };
      lastInput = performance.now();
      loadFrames();
      kick();
    };
    const onLeave = () => {
      pointer = null;
      glanceUntil = 0;
      lastInput = performance.now();
      kick();
    };
    const hero = el.closest("section") ?? document.body;
    const onTouch = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      loadFrames();
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
    // All direction frames at once (about 10 KB each), as soon as a mouse moves or the page has
    // settled. They decode off the main thread and join the choice as they arrive; until a
    // direction has arrived he turns to the nearest one that has.
    let requested = false;
    let startTimer = 0;
    const loadFrames = () => {
      if (requested) return;
      requested = true;
      window.clearTimeout(startTimer);
      character.frames.forEach((f, i) =>
        load(f.src).then((fr) => {
          if (!fr) return;
          if (!alive) return fr.bmp.close();
          img[i + 1] = fr;
          if (pointer) {
            // A better match may just have arrived: re-aim.
            aim = -1;
            kick();
          }
        }),
      );
    };

    load(character.center).then((fr) => {
      if (!fr || !alive) return;
      img[0] = fr;
      size();
      paint(fr, true);
      Promise.all(character.blink.map(load)).then((b) => {
        if (alive && b.every(Boolean)) blink = b as Frame[];
      });
      if (fine) startTimer = window.setTimeout(loadFrames, 900);
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
    let lastLook = bench.get().look;
    const offBench = bench.subscribe((s) => {
      if (s.look === lastLook) return;
      lastLook = s.look;
      lastInput = performance.now();
      loadFrames();
      kick();
    });
    hero.addEventListener("pointerdown", onTouch, { passive: true });
    hero.addEventListener("pointermove", onTouch, { passive: true });
    hero.addEventListener("pointerup", onTouchEnd);
    hero.addEventListener("pointercancel", onTouchEnd);

    return () => {
      alive = false;
      [...img, ...blink].forEach((f) => f?.bmp.close());
      cancelAnimationFrame(raf);
      window.clearTimeout(sleeper);
      window.clearTimeout(release);
      window.clearTimeout(startTimer);
      ro.disconnect();
      io.disconnect();
      offBench();
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
