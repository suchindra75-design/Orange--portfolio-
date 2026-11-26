"use client";

import { useEffect, useRef, useState } from "react";

const WORD = "thwip";
const WINDOW_MS = 1500;
const LIFE_MS = 1200;

/** One strand: from (x1, y1) to (x2, y2), and the box it lands on. `line` is false under reduced motion. */
type Shot = { x1: number; y1: number; x2: number; y2: number; box: { x: number; y: number; w: number; h: number; r: number }; line: boolean; n: number };

function editable(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

/** The nearest visible link or button to (x, y), and the closest point on its box. */
function nearestTarget(x: number, y: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let best: { el: HTMLElement; r: DOMRect; px: number; py: number; d: number } | null = null;
  for (const el of document.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")) {
    if (el.closest("[inert], [aria-hidden='true'], #jump-palette")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw) continue;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const px = Math.max(r.left, Math.min(x, r.right));
    const py = Math.max(r.top, Math.min(y, r.bottom));
    const d = Math.hypot(px - x, py - y);
    if (!best || d < best.d) best = { el, r, px, py, d };
  }
  return best;
}

/**
 * Small hidden delights. One so far: type "thwip" anywhere (outside a text field) and a single
 * chartreuse strand shoots from the pointer (or the centre of the screen) to the nearest link or
 * button, which gets a signal outline for a moment. Everything is gone in about 1.2 s.
 * The outline is drawn in the same fixed overlay (never on the element itself), so a parent's
 * overflow can't clip it and no site styles are touched. Under reduced motion: the outline only.
 * One keydown and one passive pointermove listener; nothing else runs.
 */
export function Eggs() {
  const [shot, setShot] = useState<Shot | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let pointer: { x: number; y: number } | null = null;
    let at = 0;
    let start = 0;
    let n = 0;
    const list = timers.current;

    const fire = () => {
      const x = pointer?.x ?? window.innerWidth / 2;
      const y = pointer?.y ?? window.innerHeight / 2;
      const t = nearestTarget(x, y);
      if (!t) return;
      list.forEach(clearTimeout);
      list.length = 0;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const radius = parseFloat(getComputedStyle(t.el).borderTopLeftRadius) || 0;
      const box = { x: t.r.left - 4, y: t.r.top - 4, w: t.r.width + 8, h: t.r.height + 8, r: Math.min(radius + 4, (t.r.height + 8) / 2) };
      setShot({ x1: x, y1: y, x2: t.px, y2: t.py, box, line: !reduced && t.d > 6, n: ++n });
      list.push(window.setTimeout(() => setShot(null), LIFE_MS));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing || e.key.length !== 1 || editable(e.target)) {
        if (e.key.length === 1) at = 0;
        return;
      }
      const k = e.key.toLowerCase();
      const now = performance.now();
      if (at > 0 && k === WORD[at] && now - start <= WINDOW_MS) {
        at++;
      } else if (k === WORD[0]) {
        at = 1;
        start = now;
      } else {
        at = 0;
        return;
      }
      if (at === WORD.length) {
        at = 0;
        fire();
      }
    };
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      list.forEach(clearTimeout);
      list.length = 0;
    };
  }, []);

  if (!shot) return null;
  const { box } = shot;
  return (
    <svg key={shot.n} aria-hidden="true" className={`egg-thwip ${shot.line ? "egg-thwip--shot" : ""} pointer-events-none fixed inset-0 z-[170] h-full w-full`}>
      <style>{EGG_CSS}</style>
      {/* A faint ink under-stroke on every mark: invisible on carbon, it keeps them readable on paper-ground worlds. */}
      {shot.line && (
        <g className="egg-strand">
          <line x1={shot.x1} y1={shot.y1} x2={shot.x2} y2={shot.y2} pathLength={1} stroke="var(--color-ink)" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
          <line x1={shot.x1} y1={shot.y1} x2={shot.x2} y2={shot.y2} pathLength={1} stroke="var(--color-signal)" strokeWidth="1.25" strokeLinecap="round" />
        </g>
      )}
      <g className="egg-hit" fill="none">
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={box.r} stroke="var(--color-ink)" strokeOpacity="0.3" strokeWidth="3" />
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={box.r} stroke="var(--color-signal)" strokeWidth="1.5" />
        {shot.line && <circle cx={shot.x2} cy={shot.y2} r="2" fill="var(--color-signal)" stroke="var(--color-ink)" strokeOpacity="0.35" strokeWidth="1" />}
      </g>
    </svg>
  );
}

/* Only the motion version animates: the strand draws in 140 ms, the outline and the knot land with
   it, and the whole overlay fades out by 1.2 s. Under reduced motion the outline simply shows, then goes. */
const EGG_CSS = `
.egg-thwip--shot{animation:egg-fade ${LIFE_MS}ms linear forwards}
.egg-thwip--shot .egg-strand line{stroke-dasharray:1;stroke-dashoffset:1;animation:egg-draw .14s cubic-bezier(0.2,0.9,0.3,1) forwards}
.egg-thwip--shot .egg-hit{opacity:0;animation:egg-land .12s ease-out .13s forwards}
@keyframes egg-draw{to{stroke-dashoffset:0}}
@keyframes egg-land{to{opacity:1}}
@keyframes egg-fade{0%,55%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.egg-thwip--shot,.egg-thwip--shot .egg-strand line,.egg-thwip--shot .egg-hit{animation:none;opacity:1;stroke-dashoffset:0}}
`;
