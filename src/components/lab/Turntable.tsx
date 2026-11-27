"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { projects, type ProjectSlug } from "@/content/projects";

/**
 * LAB · TURNTABLE. Pick any object off the bench and turn it in your hands, then switch the
 * bench's printed shading off and on (three flat steps vs smooth) and its ink outline, to see
 * what makes it look printed. The still from the bench holds the place; three.js loads when the
 * turntable scrolls into view with a mouse, or on a tap on touch screens (it says how heavy it is).
 */

const SHORT: Record<ProjectSlug, string> = {
  "raya-assistant": "RAYA",
  "esp32-home-automation": "ESP32",
  "infinos-website": "INFINOS",
  "infinos-app": "Telemetry",
  "brain-matrix": "Brain Matrix",
  "simplein-school": "SIMPLEIN",
  "ai-3d-studio": "AI 3D Studio",
  nocturne: "Nocturne",
};

const TurntableCanvas = dynamic(() => import("./TurntableCanvas"), { ssr: false });

export function Turntable() {
  const [slug, setSlug] = useState<ProjectSlug>("infinos-website");
  const [outline, setOutline] = useState(true);
  const [soft, setSoft] = useState(false);
  const [load, setLoad] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [touch, setTouch] = useState(false);

  // With a mouse, load as it comes into view; on touch screens, wait for the tap.
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setTouch(coarse || reduced), 0);
    if (coarse || reduced) return () => window.clearTimeout(t);
    const el = box.current;
    if (!el) return () => window.clearTimeout(t);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLoad(true), { rootMargin: "200px" });
    io.observe(el);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, []);

  const p = projects.find((x) => x.slug === slug)!;
  const seg = "t-label rounded-full border-2 border-ink px-3.5 py-2 transition-[background-color,color] duration-150";

  return (
    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-12">
      <div ref={box} className="relative aspect-square w-full overflow-hidden rounded-[28px] border-2 border-ink bg-pop">
        {!load && (
          <>
            <Image src={`/bench/${slug}.webp`} alt="" fill sizes="(max-width: 768px) 90vw, 50vw" className="object-contain p-[12%]" />
            {touch && (
              <button type="button" onClick={() => setLoad(true)} className="pill-ink t-label absolute bottom-5 left-1/2 -translate-x-1/2">
                Turn it in 3D · loads about 250 KB
              </button>
            )}
          </>
        )}
        {load && (
          <div className="absolute inset-0" aria-hidden="true">
            <TurntableCanvas slug={slug} outline={outline} soft={soft} />
          </div>
        )}
        <span className="t-label pointer-events-none absolute left-4 top-4 rounded-full border-2 border-ink bg-cream px-2.5 py-1">
          {p.index} · {p.title}
        </span>
        {load && <span className="t-label pointer-events-none absolute bottom-4 right-4 text-ink/70">Drag to turn</span>}
      </div>

      <div>
        <p className="t-label text-ink/60">Pick an object</p>
        <div role="group" aria-label="Pick an object" className="mt-3 flex flex-wrap gap-2">
          {projects.map((x) => (
            <button key={x.slug} type="button" aria-pressed={slug === x.slug} onClick={() => setSlug(x.slug)} className={`${seg} ${slug === x.slug ? "bg-ink text-cream" : "bg-cream text-ink hover:bg-ink hover:text-cream"}`}>
              {SHORT[x.slug]}
            </button>
          ))}
        </div>
        <p className="t-label mt-7 text-ink/60">What makes it look printed</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" aria-pressed={!soft} onClick={() => setSoft(!soft)} className={`${seg} ${!soft ? "bg-ink text-cream" : "bg-cream text-ink"}`}>
            Three flat steps
          </button>
          <button type="button" aria-pressed={outline} onClick={() => setOutline(!outline)} className={`${seg} ${outline ? "bg-ink text-cream" : "bg-cream text-ink"}`}>
            Ink outline
          </button>
        </div>
        <p className="mt-5 text-[0.98rem] leading-snug text-ink/80">
          {soft ? "Smooth shading: light falls off gradually, and it starts to look like a glossy render." : "Printed: every surface is one of three tones (lit, 82%, 35% toward ink), with nothing in between."}{" "}
          {outline ? "The outline is the same object pushed out a little and drawn in ink from behind." : "Without its outline, the object loses the sticker edge every card on this site has."}
        </p>
      </div>
    </div>
  );
}
