"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type RefObject } from "react";
import dynamic from "next/dynamic";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { bench } from "@/lib/bench";
import { mainProjects, projects, type ProjectSlug } from "@/content/projects";
import { CHIPS, chipSlugs } from "@/content/bench";
import { PageLink, ProjectLink } from "@/components/chrome/Links";
import type { BenchTargets } from "@/components/bench/BenchCanvas";

/**
 * THE BENCH, DOM SIDE (home hero, desktop with a mouse; see DESIGN.md v8 "The bench").
 *
 * The hero pins, and scrolling cranes the camera from the hero over the bench (the crane). The
 * DOM owns everything a visitor reads or clicks:
 *   - the index rail: every project as a real link (keyboard and screen readers use only this);
 *   - one invisible hit area per object, sized each frame to the object's box on screen;
 *   - the label over the object you point at, and his look toward it;
 *   - the chips (honest filters) and the guided tour.
 * Opening a project flies the camera to the object first, then plays the usual page transition.
 */

const BenchCanvas = dynamic(() => import("@/components/bench/BenchCanvas"), { ssr: false });

const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p])) as Record<ProjectSlug, (typeof projects)[number]>;
const FLY_MS = 640;
const TOUR_MS = 6500;

let capable: boolean | null = null;
/** A mouse, a laptop-wide screen, motion allowed, no Save-Data, and WebGL (checked once per visit). */
function benchCapable() {
  if (capable !== null) return capable;
  capable =
    window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-height: 600px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData &&
    (() => {
      try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        return false;
      }
    })();
  return capable;
}
const noSubscribe = () => () => {};

/** Whether this visit gets the bench (false on the server and in every fallback). */
export function useBenchMode() {
  const on = useSyncExternalStore(noSubscribe, benchCapable, () => false);
  useEffect(() => {
    if (!on) return;
    document.documentElement.dataset.bench = "";
    return () => {
      delete document.documentElement.dataset.bench;
    };
  }, [on]);
  return on;
}

/** Loads three.js only once the intro has played (on idle), or at once if the visitor starts scrolling. */
function useLoadCanvas() {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    let idle = 0;
    const go = () => setLoad(true);
    const t = window.setTimeout(() => {
      idle = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(go, { timeout: 2000 }) : window.setTimeout(go, 200);
    }, 1300);
    const onScroll = () => go();
    window.addEventListener("scroll", onScroll, { passive: true, once: true });
    return () => {
      window.clearTimeout(t);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return load;
}

/** The canvas reads these every frame; they are written outside render (effects and ref callbacks). */
function bindTargets(t: BenchTargets, els: Pick<BenchTargets, "label" | "card" | "fig">) {
  Object.assign(t, els);
}
function bindHit(t: BenchTargets, slug: ProjectSlug, el: HTMLElement | null) {
  t.hits[slug] = el;
}

export function Bench({ hero, card, fig }: { hero: RefObject<HTMLElement | null>; card: RefObject<HTMLDivElement | null>; fig: RefObject<HTMLDivElement | null> }) {
  const load = useLoadCanvas();
  const labelRef = useRef<HTMLDivElement>(null);
  const hitsRef = useRef<HTMLDivElement>(null);
  const [targets] = useState<BenchTargets>(() => ({ hits: {}, label: null, card: null, fig: null }));
  const [hover, setHover] = useState<ProjectSlug | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [tour, setTour] = useState<{ i: number } | null>(null);
  const [ready, setReady] = useState(false);
  const bypass = useRef(false);

  // Hand the canvas its DOM targets.
  useEffect(() => bindTargets(targets, { label: labelRef.current, card: card.current, fig: fig.current }), [targets, card, fig]);

  // Mirror the shared state into the few bits of DOM that show it.
  useEffect(
    () =>
      bench.subscribe((s) => {
        setHover(s.hover);
        setFilter(s.filter?.id ?? null);
        hitsRef.current?.toggleAttribute("data-on", s.crane > 0.82 && !s.tour);
      }),
    [],
  );

  // The crane: the hero pins and the camera rises over the bench as you scroll (1:1, never hijacked).
  useGSAP(
    () => {
      const root = hero.current;
      if (!root) return;
      const proxy = { p: 0 };
      const from = { immediateRender: false };
      const tl = gsap.timeline({
        scrollTrigger: { id: "crane", trigger: root, start: "top top", end: "+=130%", pin: true, scrub: MOTION.scrub, anticipatePin: 1 },
      });
      tl.to(proxy, { p: 1, duration: 1, ease: "none", onUpdate: () => bench.set({ crane: proxy.p }) }, 0)
        .fromTo(root.querySelector("h1"), { yPercent: 0, autoAlpha: 1 }, { yPercent: -45, autoAlpha: 0, duration: 0.42, ease: "power1.in", ...from }, 0.04)
        .fromTo(root.querySelectorAll("[data-sticker]"), { yPercent: 0, autoAlpha: 1 }, { yPercent: -160, autoAlpha: 0, duration: 0.3, ease: "power1.in", ...from }, 0)
        .fromTo(root.querySelectorAll("[data-lead], [data-see-work]"), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.14, ...from }, 0)
        .fromTo(root.querySelectorAll("[data-bench-ui]"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.18, ease: "power2.out", ...from }, 0.8);
      return () => bench.set({ crane: 0, hover: null, focus: null, filter: null, tour: false, look: null });
    },
    { scope: hero, dependencies: [] },
  );

  /** Point at (or focus) a project: it lifts, and he looks at it. */
  const point = useCallback(
    (slug: ProjectSlug | null) => {
      if (bench.get().tour) return;
      const el = slug ? targets.hits[slug] : null;
      const r = el?.getBoundingClientRect();
      bench.set({ hover: slug, look: r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.4 } : null });
    },
    [targets],
  );

  // The guided tour: the camera visits the main projects, one line each. Any input stops it.
  const stopTour = useCallback(() => {
    if (!bench.get().tour) return;
    setTour(null);
    bench.set({ tour: false, focus: null, hover: null, look: null });
  }, []);

  /** Opening a project: the camera flies to it, then the page transition plays. */
  const open = useCallback(
    (slug: ProjectSlug) => (e: MouseEvent<HTMLAnchorElement>) => {
      if (bypass.current) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const a = e.currentTarget;
      stopTour();
      bench.set({ hover: slug, focus: slug });
      window.setTimeout(() => {
        bypass.current = true;
        a.click();
        bypass.current = false;
      }, FLY_MS);
    },
    [stopTour],
  );

  const toggleChip = (id: string) => {
    stopTour();
    const next = bench.get().filter?.id === id ? null : { id, slugs: chipSlugs(id) };
    bench.set({ filter: next });
  };

  // The tour itself.
  useEffect(() => {
    if (!tour) return;
    const slug = mainProjects[tour.i].slug;
    bench.set({ tour: true, filter: null, focus: slug, hover: slug, look: null });
    const t = window.setTimeout(() => {
      if (tour.i + 1 < mainProjects.length) setTour({ i: tour.i + 1 });
      else stopTour();
    }, TOUR_MS);
    const stop = (e: Event) => {
      if (e.type === "keydown") {
        const k = (e as KeyboardEvent).key;
        if (k === "Escape" || k === "Tab") stopTour();
        return;
      }
      // Clicks on the tour's own controls are theirs to handle.
      if ((e.target as HTMLElement)?.closest?.("[data-tour-ui]")) return;
      stopTour();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("pointerdown", stop);
    window.addEventListener("keydown", stop);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [tour, stopTour]);

  const shown = hover ? bySlug[hover] : null;
  const forward = filter ? chipSlugs(filter) : null;
  const tourP = tour ? mainProjects[tour.i] : null;

  return (
    <>
      {load && <BenchCanvas hero={hero} targets={targets} onReady={() => setReady(true)} />}

      {/* Hit areas: one per object, placed by the canvas every frame (mouse only; the rail is the keyboard path). */}
      <div ref={hitsRef} className="bench-hits absolute inset-0 z-[5]" aria-hidden="true" data-ready={ready ? "" : undefined}>
        {projects.map((p) => (
          <ProjectLink
            key={p.slug}
            href={`/projects/${p.slug}`}
            tabIndex={-1}
            ref={(el: HTMLAnchorElement | null) => bindHit(targets, p.slug, el)}
            onPointerEnter={() => point(p.slug)}
            onPointerLeave={() => point(null)}
            onClick={open(p.slug)}
            className="bench-hit absolute left-0 top-0"
          >
            <span className="sr-only">{p.title}</span>
          </ProjectLink>
        ))}
      </div>

      {/* The label over the object you point at */}
      <div ref={labelRef} className="bench-label pointer-events-none absolute left-0 top-0 z-[6]" data-on={shown && !tour ? "" : undefined} aria-hidden="true">
        {shown && (
          <div className="sticker flex-col items-start gap-1 whitespace-nowrap px-4 py-2.5">
            <span className="t-label text-ink/60">
              {shown.index} · {shown.category}
            </span>
            <span className="text-[1.15rem] font-extrabold leading-none tracking-[-0.02em]">{shown.title}</span>
            <span className="t-label text-pop">{shown.status.label}</span>
          </div>
        )}
      </div>

      {/* The index rail: every project, as a real link */}
      <nav data-bench-ui aria-labelledby="bench-title" className="bench-ui absolute left-[var(--gutter)] top-[calc(var(--header-h)+1.25rem)] z-[7] w-[clamp(14rem,19vw,17.5rem)]">
        <div className="chunky max-h-[calc(100svh-var(--header-h)-3rem)] overflow-auto px-5 py-4">
          <h2 id="bench-title" className="t-label text-ink/60">
            On the bench · {projects.length} projects
          </h2>
          <ol className="mt-3 space-y-0.5">
            {projects.map((p) => {
              const out = forward ? !forward.includes(p.slug) : false;
              return (
                <li key={p.slug}>
                  <ProjectLink
                    href={`/projects/${p.slug}`}
                    onPointerEnter={() => point(p.slug)}
                    onPointerLeave={() => point(null)}
                    onFocus={() => point(p.slug)}
                    onBlur={() => point(null)}
                    onClick={open(p.slug)}
                    aria-current={hover === p.slug ? "true" : undefined}
                    className={`bench-rail-item group flex items-baseline gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ink ${out ? "text-ink/35" : "text-ink"}`}
                  >
                    <span className="t-label w-5 shrink-0 text-ink/50">{p.index}</span>
                    <span className="min-w-0">
                      <span className={`block text-[1.02rem] font-bold leading-tight tracking-[-0.01em] ${hover === p.slug ? "hl" : ""}`}>{p.title}</span>
                      <span className="t-label block truncate text-[0.62rem] text-ink/55">{p.status.label}</span>
                    </span>
                  </ProjectLink>
                </li>
              );
            })}
          </ol>
          <PageLink href="/projects" className="t-label mt-3 inline-block text-ink/70 underline-offset-4 hover:underline">
            All as cards →
          </PageLink>
        </div>
      </nav>

      {/* The chips: honest filters, and the tour */}
      <div data-bench-ui role="group" aria-label="Ask the bench" className="bench-ui absolute left-[calc(var(--gutter)+clamp(14rem,19vw,17.5rem)+1.5rem)] right-[var(--gutter)] top-[calc(var(--header-h)+1.25rem)] z-[7] flex flex-wrap items-center justify-center gap-2">
        {CHIPS.map((c) => (
          <button key={c.id} type="button" aria-pressed={filter === c.id} onClick={() => toggleChip(c.id)} className={`t-label rounded-full border-2 border-ink px-3.5 py-2 transition-[background-color,color,translate] duration-150 active:translate-y-[2px] ${filter === c.id ? "bg-ink text-cream" : "bg-cream text-ink hover:bg-ink hover:text-cream"}`}>
            {c.label}
          </button>
        ))}
        <button type="button" data-tour-ui onClick={() => (tour ? stopTour() : setTour({ i: 0 }))} className="pill-ink t-label">
          {tour ? "Stop the tour" : "Show me in 60 s"}
        </button>
        <p className="sr-only" aria-live="polite">
          {forward ? `${forward.length} projects brought forward: ${forward.map((s) => bySlug[s].title).join(", ")}` : ""}
        </p>
      </div>

      {/* The tour's caption */}
      {tourP && (
        <div data-tour-ui role="status" className="absolute bottom-[clamp(1.5rem,5svh,3rem)] left-1/2 z-[7] w-[min(34rem,calc(100%-2*var(--gutter)))] -translate-x-1/2">
          <div className="chunky flex items-end justify-between gap-6 px-6 py-5">
            <div>
              <p className="t-label text-ink/60">
                {String(tour!.i + 1).padStart(2, "0")} / {String(mainProjects.length).padStart(2, "0")} · {tourP.category}
              </p>
              <p className="mt-1 text-[1.5rem] font-extrabold leading-none tracking-[-0.03em]">{tourP.title}</p>
              <p className="mt-2 text-[0.98rem] leading-snug text-ink/80">{tourP.oneLine}</p>
            </div>
            <ProjectLink href={`/projects/${tourP.slug}`} onClick={() => stopTour()} className="pill-ink t-label shrink-0">
              Open →
            </ProjectLink>
          </div>
        </div>
      )}
    </>
  );
}

/** Where "See the work" should take you in bench mode: the end of the crane. */
export const craneEnd = () => ScrollTrigger.getById("crane")?.end ?? null;
