"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { H, W, makeCrowd, Patterns, PersonSvg, type Person } from "./crowd/people";
import Image from "next/image";
import { webPath } from "@/lib/web";

const PEOPLE = makeCrowd();
const WEB_L = webPath({ x: 0, y: 0, r: 300, a0: 0, a1: Math.PI / 2, spokes: 8, rings: 6 });
const WEB_R = webPath({ x: 1440, y: 0, r: 260, a0: Math.PI / 2, a1: Math.PI, spokes: 7, rings: 5 });
const BACK = PEOPLE.filter((p) => p.row < 2);
const FRONT = PEOPLE.filter((p) => p.row >= 2);

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/**
 * One depth layer of the crowd. Every person is their own small SVG (all drawn in the same
 * 2000×560 scene units, so patterns and positions line up exactly) and carries their own "flow"
 * offset toward the centre. Moving them is then pure compositing: the drawing is painted once,
 * not on every scroll frame, which is what used to drop frames as the footer arrived.
 */
function Layer({ people, id }: { people: Person[]; id: string }) {
  const pat = (k: string) => `url(#${id}-${k})`;
  return (
    <div className="crowd-layer" aria-hidden="true">
      <svg width="0" height="0" className="absolute">
        <Patterns id={id} />
      </svg>
      <div className="crowd-scene">
        {people.map((p, i) => {
          // The person's box in scene units: shoulders, a tilt of a few degrees, hair above the head.
          const half = 70 * p.s + 32;
          const x0 = p.x - half;
          const y0 = p.hy - p.hh - 45 * p.s;
          const w = half * 2;
          const h = H + 40 - y0;
          return (
            <svg
              key={i}
              viewBox={`${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`}
              overflow="visible"
              className="crowd-person"
              style={{ left: pct(x0 / W), top: pct(y0 / H), width: pct(w / W), height: pct(h / H), ["--dx" as string]: pct(p.flow / w) }}
            >
              <PersonSvg p={p} pat={pat} />
            </svg>
          );
        })}
      </div>
    </div>
  );
}

/**
 * LAYER 2 OF THE FOOTER: THE FINAL SCENE.
 * A wide orange panorama, back to front: SUCHINDRA set enormous behind everything, the
 * back rows of an illustrated crowd, the owner's actual photograph printed as an ink line-engraving
 * and cut out like a sticker (so he belongs to the same drawing) standing a head taller at the centre, then the front rows.
 * As the footer arrives the crowd flows outward from him while he stays still. Faint webs sit in
 * the top corners, and one very small spider hangs from a single strand (it climbs away on hover).
 */
export function Crowd({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        el.style.setProperty("--flow", "0");
        return;
      }
      const st = { trigger: el, start: "top bottom", end: "bottom bottom", scrub: MOTION.scrubSlow };
      // The crowd starts gathered close around him and flows outward as the panorama arrives.
      gsap.fromTo(el, { "--flow": 1 }, { "--flow": 0, ease: "none", scrollTrigger: { ...st, start: "top 95%" } });
      gsap.fromTo("[data-depth=name]", { xPercent: 4 }, { xPercent: -4, ease: "none", scrollTrigger: st });
      gsap.fromTo("[data-depth=hero]", { yPercent: 2 }, { yPercent: 0, ease: "power2.out", scrollTrigger: st });
    },
    { scope: ref },
  );

  useEffect(() => {
    const el = ref.current!;
    // Eye-tracking is decoration: off under reduced motion, and only listening while the crowd is on screen.
    if (prefersReducedMotion()) return;
    let raf = 0;
    let listening = false;
    let idle = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const ex = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const ey = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.45)) / r.height));
        el.style.setProperty("--ex", ex.toFixed(3));
        el.style.setProperty("--ey", ey.toFixed(3));
        // After a few still seconds, everyone turns back to look at him.
        window.clearTimeout(idle);
        idle = window.setTimeout(() => {
          el.style.removeProperty("--ex");
          el.style.removeProperty("--ey");
        }, 2600);
      });
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === listening) return;
      listening = entry.isIntersecting;
      if (listening) window.addEventListener("pointermove", onMove, { passive: true });
      else window.removeEventListener("pointermove", onMove);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
    };
  }, []);

  return (
    <div ref={ref} className="crowd relative h-[clamp(440px,42vw,700px)] overflow-hidden bg-pop text-ink" style={{ ["--flow" as string]: 1 }}>
      {/* The name, enormous, behind everyone */}
      <div data-depth="name" aria-hidden="true" className="pointer-events-none absolute will-change-transform inset-x-[-6%] top-[5%] flex select-none justify-center">
        <span className="t-name whitespace-nowrap uppercase text-cream" style={{ fontSize: "clamp(3.4rem, 16.6vw, 19rem)" }}>
          {name}
        </span>
      </div>
      <svg aria-hidden="true" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute inset-0 z-[1] h-full w-full">
        <path d={WEB_L} fill="none" stroke="rgba(20,15,11,.14)" strokeWidth="0.8" />
        <path d={WEB_R} fill="none" stroke="rgba(20,15,11,.11)" strokeWidth="0.8" />
      </svg>
      <Layer people={BACK} id="crowd-back" />
      {/* The main character: his actual photograph, printed in the crowd's ink */}
      <div data-depth="hero" className="absolute will-change-transform left-1/2 top-[22%] z-[3] aspect-[1808/2862] h-[80%] -translate-x-1/2 md:top-[12%] md:h-[94%]">
        <Image src="/me/footer-ink.png" alt={`${name}, standing at the centre of the crowd`} fill sizes="(max-width: 768px) 60vw, 26vw" className="sticker-cut object-contain object-top" />
      </div>
      <Layer people={FRONT} id="crowd-front" />
      {/* A very small spider on one strand. Hover: it climbs out of sight. */}
      <div className="crowd-spider absolute right-[16%] top-0 z-[6] h-[22%] w-6" aria-hidden="true">
        <span className="absolute left-1/2 top-0 block h-full w-px -translate-x-1/2 bg-ink/45" />
        <svg viewBox="-8 -9 16 16" className="absolute bottom-[-9px] left-1/2 size-4 -translate-x-1/2">
          <g fill="#121211" stroke="#121211" strokeWidth=".7" strokeLinecap="round">
            <ellipse rx="2.6" ry="3.4" stroke="none" />
            <circle cy="-4.1" r="1.6" stroke="none" />
            {[-1, 1].map((d) => [0, 1, 2, 3].map((k) => <path key={`${d}${k}`} d={`M0 ${-1.6 + k * 1.3} q${d * 4} ${-2.4 + k * 1.3} ${d * 5.6} ${0.8 + k * 1.8}`} fill="none" />))}
          </g>
        </svg>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[9%] bg-gradient-to-b from-pop/0 to-pop/70" />
    </div>
  );
}
