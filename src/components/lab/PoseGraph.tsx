"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { character } from "@/content/character";
import { ANG, EDGES, MAG, N, RING_NODES, angDiff, route } from "@/components/home/poseGraph";
import { prefersReducedMotion } from "@/lib/hooks";

/**
 * LAB · POSE GRAPH. The hero character's 64 real frames, laid out where each one looks: angle
 * around the ring, turn amount out from the middle (the centre frame, looking at you). Point
 * anywhere and he takes the cheapest route there through real frames (the same graph and the same
 * Dijkstra the hero uses), one frame per display frame. Nothing is blended or invented.
 */

const R = 44; // ring radius in the SVG's units (viewBox -50…50)
// Rounded, so the server's and the browser's maths print the same attributes (no hydration mismatch).
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const pos = (i: number) => (i === 0 ? { x: 0, y: 0 } : { x: r3(Math.cos(ANG[i]) * MAG[i] * R), y: r3(Math.sin(ANG[i]) * MAG[i] * R) });
const src = (i: number) => (i === 0 ? character.center : character.frames[i - 1].src);
const name = (i: number) => src(i).slice(src(i).lastIndexOf("/") + 1);

/** Where to aim for a point (in ring units): the middle looks at you, anywhere else is the nearest full turn. */
function aimFor(x: number, y: number) {
  if (Math.hypot(x, y) < R * 0.22) return 0;
  const a = Math.atan2(y, x);
  let best = RING_NODES[0];
  for (const i of RING_NODES) if (angDiff(ANG[i], a) < angDiff(ANG[best], a)) best = i;
  return best;
}

export function PoseGraph() {
  const [at, setAt] = useState(0);
  const [aim, setAim] = useState(0);
  const [path, setPath] = useState<number[]>([]);
  const [steps, setSteps] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const keyAngle = useRef(0);

  // Warm the browser cache once the graph is on screen, so walking a route never waits on a frame.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      character.frames.forEach((f) => (new Image().src = f.src));
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Walk the route: one real frame per display frame (two when far behind), like the hero.
  useEffect(() => {
    if (!path.length) return;
    let raf = 0;
    let last = 0;
    let acc = 0;
    let rest = [...path];
    const tick = (t: number) => {
      acc += last ? t - last : 16.7;
      last = t;
      const interval = rest.length > 8 ? 1000 / 120 : 1000 / 60;
      let moved = -1;
      while (rest.length && acc >= interval - 2) {
        acc -= interval;
        moved = rest.shift()!;
      }
      if (moved >= 0) setAt(moved);
      if (rest.length) raf = requestAnimationFrame(tick);
      else setPath([]);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      rest = [];
    };
  }, [path]);

  const go = (n: number) => {
    if (n === aim && !path.length) return;
    setAim(n);
    const from = at;
    const r = route(from, n, () => true);
    setSteps(r.length);
    // Reduced motion: arrive at once (the same real frame, no walk).
    if (prefersReducedMotion()) setAt(n);
    else setPath(r);
  };

  const onPoint = (e: PointerEvent<SVGSVGElement>) => {
    if (e.type === "pointermove" && e.pointerType !== "mouse" && e.buttons === 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100 - 50;
    const y = ((e.clientY - r.top) / r.height) * 100 - 50;
    go(aimFor(x, y));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      keyAngle.current += (e.key === "ArrowRight" ? 1 : -1) * (Math.PI / 12);
      go(aimFor(Math.cos(keyAngle.current) * R, Math.sin(keyAngle.current) * R));
    } else if (e.key === "Enter" || e.key === " " || e.key === "0") {
      e.preventDefault();
      go(0);
    }
  };

  const onPath = new Set(path);
  const ap = pos(aim);

  return (
    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-12">
      <svg
        ref={svgRef}
        viewBox="-50 -50 100 100"
        role="application"
        tabIndex={0}
        aria-label="Pose graph of the character's real frames. Point anywhere, or use the left and right arrow keys to turn him and Enter to have him look at you."
        onPointerMove={onPoint}
        onPointerDown={onPoint}
        onKeyDown={onKey}
        className="lab-graph aspect-square w-full touch-none rounded-[28px] border-2 border-ink bg-cream outline-none focus-visible:ring-4 focus-visible:ring-ink/40"
      >
        <circle r={R * 0.85} fill="none" stroke="var(--color-ink)" strokeOpacity=".12" strokeDasharray="1 1.5" strokeWidth=".4" />
        <circle r={R * 0.22} fill="none" stroke="var(--color-ink)" strokeOpacity=".12" strokeWidth=".4" />
        {/* Edges: the video's order and the closed ring (ink); the straight turns from the middle (faint) */}
        {EDGES.flatMap((es, a) =>
          es
            .filter(([b]) => b > a)
            .map(([b, w]) => {
              const p = pos(a);
              const q = pos(b);
              const cut = a === 0 || b === 0 ? w > 1 : false;
              return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--color-ink)" strokeOpacity={cut ? 0.05 : 0.35} strokeWidth={cut ? 0.25 : 0.45} />;
            }),
        )}
        {Array.from({ length: N }, (_, i) => {
          const p = pos(i);
          const cls = i === at ? "fill-pop" : onPath.has(i) ? "fill-ink" : MAG[i] >= 0.85 ? "fill-ink/60" : "fill-ink/30";
          return <circle key={i} cx={p.x} cy={p.y} r={i === at ? 2.4 : i === 0 ? 1.8 : 1.05} className={cls} stroke={i === at ? "var(--color-ink)" : "none"} strokeWidth=".5" />;
        })}
        <circle cx={ap.x} cy={ap.y} r="3.6" fill="none" stroke="var(--color-pop)" strokeWidth=".7" />
      </svg>

      <div>
        <div className="chunky overflow-hidden">
          {/* The real frame the graph is on right now (an image from his own video) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(at)} alt={`The character, frame ${name(at)}`} width={360} height={450} className="block aspect-[4/5] w-full bg-[#C8392B] object-cover object-bottom" />
        </div>
        <dl className="t-label mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
          <dt className="text-ink/55">Frame</dt>
          <dd>{name(at)}</dd>
          <dt className="text-ink/55">Looking</dt>
          <dd>{at === 0 ? "at you" : `${Math.round((ANG[at] * 180) / Math.PI)}° · ${Math.round(MAG[at] * 100)}% turned`}</dd>
          <dt className="text-ink/55">Last route</dt>
          <dd>{steps ? `${steps} real frames` : "—"}</dd>
        </dl>
      </div>
    </div>
  );
}
