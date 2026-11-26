"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Label } from "@/components/project/ProjectPage";
import { ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { scrollToTarget } from "@/lib/scroll";
import { FrameSet, OPEN_COUNT, bisectOrder, fitCanvas, openSrc, type FrameSize } from "./frames";
import { IWStyles, s } from "./styles";
import type { WorldProps } from "../types";

type Beat = { from: number; stage: string; frame: number; chapter: string; title: string; body: string; note?: string; tags?: string[] };

/**
 * The opening sequence, beat by beat. Ranges follow the site's own stage timings (flap, lid, lower
 * door, inner box out, inner box lid). Chapter names, headlines and copy are quoted from the live site.
 */
const BEATS: Beat[] = [
  { from: 0, stage: "Closed", frame: 4, chapter: "01 · Smart cold chain", title: "The cold chain, made smart.", body: "Smart, temperature-controlled transportation.", note: "Shown: INFINOS Pro Dual-Chamber Bag" },
  {
    from: 0.1,
    stage: "Lid",
    frame: 36,
    chapter: "02 · Dual-temperature architecture",
    title: "Two temperature zones, by design.",
    body: "Zone 1 in the upper chamber at about 2–8 °C, Zone 2 at an example −10 °C.",
    note: "Simultaneous operation of both zones is not yet confirmed and awaits validation.",
  },
  {
    from: 0.33,
    stage: "Lower door",
    frame: 62,
    chapter: "04 · Intelligent compartments",
    title: "A place for every sample.",
    body: "Organised sub-compartments keep sample categories apart: Zone 1 in the upper chamber, Zone 2 in the lower chamber, and a removable inner box.",
  },
  {
    from: 0.55,
    stage: "Inner box",
    frame: 90,
    chapter: "07 · Safety & sample integrity",
    title: "Built for sample integrity.",
    body: "Tamper-related and chain-of-custody functionality are designed to support sample integrity, from collection to analysis.",
    tags: ["Zipped, removable inner box"],
  },
  {
    from: 0.8,
    stage: "Sample rack",
    frame: 119,
    chapter: "08 · The complete INFINOS system",
    title: "From doorstep to laboratory.",
    body: "Smart diagnostic transportation, intelligent cold-chain technology and social and environmental impact — one INFINOS system, from collection to analysis.",
    tags: ["Sample rack · 12 × (3 + 4)", "Reflective lining"],
  },
];

const beatAt = (p: number) => {
  let b = 0;
  for (let i = 0; i < BEATS.length; i++) if (p >= BEATS[i].from) b = i;
  return b;
};
const beatMid = (i: number) => (BEATS[i].from + (BEATS[i + 1]?.from ?? 1)) / 2;

const BADGE = "Pre-rendered frames · scrubbed by your scroll";
const SOURCE = "Cycles render frames from the live site, © INFINOS Tech · captions quoted from its chapters";

function Header({ compact = false, n }: { compact?: boolean; n?: string[] }) {
  return (
    <>
      <Label n={n?.[0] ?? "·"}>The demo</Label>
      <h2 id="iw-open-title" className={`t-h2 ${compact ? "mt-3 portrait:text-[clamp(1.7rem,7.4vw,2.4rem)]" : "mt-8"}`}>
        Scroll to <span className="t-italic text-[var(--w-accent)]">open</span> the bag.
      </h2>
    </>
  );
}

/** Reduced motion: no pin and no scrubbing, the five beats as a calm sequence of stills. */
function OpenStatic({ n }: { n?: string[] }) {
  return (
    <section data-ground="light" className="section py-[clamp(5rem,12svh,9rem)]" aria-labelledby="iw-open-title">
      <Header n={n} />
      <p className="mt-5 flex flex-wrap items-center gap-3">
        <span className="sim sim-light">Pre-rendered frames · stills</span>
      </p>
      <ol className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
        {BEATS.map((b) => (
          <li key={b.stage}>
            <figure>
              <div className={`relative aspect-[16/10] overflow-hidden rounded-[4px] ${s.studio}`}>
                <Image src={openSrc(b.frame, "m")} alt={`The bag in the opening sequence: ${b.stage.toLowerCase()}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw" className="object-cover" />
              </div>
              <figcaption className="mt-4">
                <p className="t-label text-[var(--w-accent)]">{b.chapter}</p>
                <h3 className="mt-2 font-display text-[1.45rem] font-light leading-tight">{b.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed opacity-80">{b.body}</p>
                {b.note && <p className="mt-2 text-[0.85rem] leading-snug text-[var(--w-muted)]">{b.note}</p>}
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
      <p className="t-label mt-10 text-[var(--w-muted)]">{SOURCE}</p>
    </section>
  );
}

/** The scroll-scrubbed opening: a sticky canvas, 120 real frames (phone frames on phones). */
function OpenScrub({ n }: { n?: string[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size: FrameSize = window.innerWidth < 768 ? "m" : "d";

    let want = 0;
    let shown = -1;
    let raf = 0;
    let force = false;

    const draw = () => {
      raf = 0;
      const i = frames.nearestIndex(want);
      const img = i >= 0 ? frames.get(i) : null;
      if (!img) return;
      const resized = fitCanvas(canvas);
      if (i === shown && !resized && !force) return;
      force = false;
      shown = i;
      const W = canvas.width;
      const H = canvas.height;
      let fh: number, x: number, y: number;
      if (H > W) {
        // Portrait: the frame fills the band between the heading and the caption block.
        const r = canvas.getBoundingClientRect();
        const k = H / Math.max(1, r.height);
        const top = ((headRef.current?.getBoundingClientRect().bottom ?? r.top + r.height * 0.19) - r.top) * k;
        const bottom = ((footRef.current?.getBoundingClientRect().top ?? r.top + r.height * 0.69) - r.top) * k;
        fh = Math.max(H * 0.25, bottom - top + 24 * k);
        x = W * 0.5 - fh * 1.6 * 0.48;
        y = top - 4 * k;
      } else {
        // Landscape: full height, the bag to the right of the copy column.
        fh = H;
        x = W * 0.64 - fh * 1.6 * 0.5;
        y = 0;
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, x, y, fh * 1.6, fh);
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    let lastCount = 0;
    const frames = new FrameSet(OPEN_COUNT, (i) => openSrc(i, size), (i) => {
      // Redraw only if the new frame is closer to the wanted one than what is on screen.
      if (shown < 0 || Math.abs(i - want) < Math.abs(shown - want)) request();
      if (frames.loaded - lastCount >= 12 || frames.complete) {
        lastCount = frames.loaded;
        setLoaded(frames.loaded);
      }
    });

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          frames.load(bisectOrder(OPEN_COUNT), 6);
          io.disconnect();
        }
      },
      { rootMargin: "120% 0px" },
    );
    io.observe(section);

    const update = (p: number) => {
      want = Math.round(p * (OPEN_COUNT - 1));
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
      setBeat(beatAt(p));
      request();
    };
    const st = ScrollTrigger.create({ trigger: section, start: "top top", end: "bottom bottom", onUpdate: (self) => update(self.progress) });
    update(st.progress);

    const ro = new ResizeObserver(() => {
      force = true;
      request();
    });
    ro.observe(canvas);

    return () => {
      st.kill();
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      frames.dispose();
    };
  }, []);

  const jump = useCallback((i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const travel = section.offsetHeight - window.innerHeight;
    scrollToTarget(top + travel * beatMid(i), { duration: 1.2 });
  }, []);

  const b = BEATS[beat];

  return (
    <section ref={sectionRef} data-ground="light" className="relative h-[260svh]" aria-labelledby="iw-open-title">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${s.openShade}`} />

        <div className="relative grid h-full grid-rows-[auto_1fr_auto] px-[var(--gutter)] pb-[clamp(1.25rem,4svh,2.75rem)] pt-[calc(var(--header-h)+0.5rem)] landscape:max-w-[calc(min(31rem,36vw)+var(--gutter)*2)] landscape:pt-[calc(var(--header-h)+2rem)]">
          <div ref={headRef} className={`z-[1] pb-2 ${s.featherDown}`}>
            <Header compact n={n} />
            <div className="mt-4 hidden landscape:block">
              <span className="sim sim-light">{BADGE}</span>
              <p className="t-label mt-3 text-[var(--w-muted)]">Captions quoted from the live site</p>
            </div>
          </div>
          <div />
          <div ref={footRef} className={`z-[1] pt-2 ${s.featherUp}`}>
            {/* Captions share one grid cell, so the block keeps the height of the tallest. */}
            <div className="grid">
              {BEATS.map((x, i) => (
                <div key={x.stage} className={s.beat} data-on={i === beat} aria-hidden={i !== beat} style={{ gridArea: "1 / 1" }}>
                  <p className="t-label text-[var(--w-accent)]">{x.chapter}</p>
                  <h3 className="mt-2 font-display text-[clamp(1.5rem,2.5vw,2.5rem)] font-light leading-[1.02] tracking-[-0.025em]">{x.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-snug opacity-85 landscape:text-[1.02rem] landscape:leading-relaxed">{x.body}</p>
                  {x.note && <p className="mt-2 text-[0.82rem] leading-snug text-[var(--w-muted)]">{x.note}</p>}
                  {x.tags && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {x.tags.map((t) => (
                        <li key={t} className="pill t-label">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <p className="sr-only" aria-live="polite">
              {`Step ${beat + 1} of ${BEATS.length}: ${b.stage}. ${b.title}`}
            </p>

            {/* The rail: progress, and a way to jump to each beat without scrubbing. */}
            <nav aria-label="Opening sequence steps" className="mt-6 landscape:mt-8">
              <div className="relative h-px bg-current/20">
                <div ref={fillRef} className="absolute inset-0 origin-left bg-[var(--w-accent)]" style={{ transform: "scaleX(0)" }} />
              </div>
              <ol className="mt-2 grid grid-cols-5 gap-1">
                {BEATS.map((x, i) => (
                  <li key={x.stage}>
                    <button
                      type="button"
                      onClick={() => jump(i)}
                      aria-current={i === beat ? "step" : undefined}
                      className={`t-label w-full rounded-sm py-2 text-left leading-tight transition-colors ${i === beat ? "text-[var(--w-ink)]" : "text-[var(--w-muted)] hover:text-[var(--w-ink)]"}`}
                    >
                      <span className={`block ${i === beat ? "text-[var(--w-accent)]" : ""}`}>{String(i + 1).padStart(2, "0")}</span>
                      <span className="block text-[0.6rem] tracking-[0.1em]">{x.stage}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="t-label mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6rem] text-[var(--w-muted)]">
                <span className="sim sim-light landscape:hidden">{BADGE}</span>
                <span>{loaded < OPEN_COUNT ? `Frames ${loaded}/${OPEN_COUNT} · ` : `${OPEN_COUNT} frames · `}© INFINOS Tech</span>
              </p>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Demo: the site's opening sequence, scrubbed by scroll (stills under reduced motion). */
export function Demo({ n }: WorldProps) {
  const reduced = useReducedMotion();
  return (
    <>
      <IWStyles />
      {reduced ? <OpenStatic n={n} /> : <OpenScrub n={n} />}
    </>
  );
}
