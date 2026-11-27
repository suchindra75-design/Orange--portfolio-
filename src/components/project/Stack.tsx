"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import Image from "next/image";
import type { Project } from "@/content/projects";
import { STACKS, type Trace } from "@/content/stacks";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { Label } from "./ProjectPage";

/**
 * EXPLODE & PROBE (every project page; DESIGN.md v8, "Take it apart").
 *
 * The project's object from the bench sits on top of its system, drawn as a stack of real
 * layers (content/stacks.ts) in CSS 3D: no WebGL, so it costs nothing and works on every phone.
 *   - Pull apart: drag the stack (or use the slider or arrow keys) to open the gaps.
 *   - Probe: pick a layer to read what it does. Every line restates a fact from the page.
 *   - Send a signal: a pulse climbs the layers in the project's own shape (a voice, an EEG burst,
 *     a reading). RAYA's stops at the approval layer and waits for you: allow it, deny it, or let
 *     it time out, and nothing runs. Badged as a simulation; nothing real happens.
 * Reduced motion: the stack rests open, and the signal steps without moving.
 */

const TRACE: Record<Trace, string> = {
  voice: "M0 10 q5 -9 10 0 t10 0 t10 0 t10 0",
  eeg: "M0 10 l4 -3 l3 6 l4 -9 l3 12 l4 -7 l3 3 l4 -2 l3 4 l4 -4 l4 2",
  steps: "M0 15 h8 v-6 h8 v3 h8 v-9 h8 v5 h8",
  square: "M0 15 h8 v-11 h10 v11 h10 v-11 h12",
  mesh: "M0 17 L10 3 L20 17 Z M10 3 L30 3 L20 17 M30 3 L40 17 L20 17",
  ink: "M0 13 C9 -1 19 21 40 6",
  rows: "M0 4 h40 M0 10 h40 M0 16 h40",
  frames: "M1 4 h11 v11 h-11 Z M15 4 h11 v11 h-11 Z M29 4 h11 v11 h-11 Z",
};

const STEP_MS = 420;
const HOLD_MS = 950;
const GATE_MS = 8000;

type Run = { at: number; state: "idle" | "running" | "waiting" | "done" | "denied" | "timeout" };

export function Stack({ project, n }: { project: Project; n: string }) {
  const stack = STACKS[project.slug];
  const layers = stack.layers;
  const [sel, setSel] = useState(0);
  const [run, setRun] = useState<Run>({ at: -1, state: "idle" });
  const worldRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(0.18);
  const dragRef = useRef<{ x: number; y: number; v: number } | null>(null);
  const gate = layers.findIndex((l) => l.gate);

  /** How far apart the layers are, 0…1 (written straight to the scene and the slider). */
  const apply = useCallback((v: number) => {
    const o = Math.min(1, Math.max(0, v));
    openRef.current = o;
    worldRef.current?.style.setProperty("--open", o.toFixed(3));
    if (sliderRef.current) sliderRef.current.value = String(Math.round(o * 100));
  }, []);

  // It opens a little as it arrives on screen (once), then it's yours to pull.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (prefersReducedMotion()) {
      apply(0.62);
      return;
    }
    apply(0.18);
    const p = { v: 0.18 };
    const st = ScrollTrigger.create({
      trigger: scene,
      start: "top 72%",
      once: true,
      onEnter: () => gsap.to(p, { v: 0.6, duration: 1.2, ease: "expo.out", onUpdate: () => apply(p.v) }),
    });
    return () => st.kill();
  }, [apply]);

  // The signal: one layer at a time, with a stop at the gate (if any).
  useEffect(() => {
    if (run.state !== "running") return;
    const reduced = prefersReducedMotion();
    const t = window.setTimeout(
      () => {
        const next = run.at + 1;
        if (next >= layers.length) return setRun({ at: layers.length - 1, state: "done" });
        setSel(next);
        if (next === gate) return setRun({ at: next, state: "waiting" });
        setRun({ at: next, state: "running" });
      },
      run.at < 0 ? 60 : reduced ? HOLD_MS : STEP_MS + HOLD_MS,
    );
    return () => window.clearTimeout(t);
  }, [run, layers.length, gate]);

  // The gate times out the way RAYA's does: no answer, no action.
  useEffect(() => {
    if (run.state !== "waiting") return;
    const t = window.setTimeout(() => setRun((r) => ({ ...r, state: "timeout" })), GATE_MS);
    return () => window.clearTimeout(t);
  }, [run.state]);

  const send = () => {
    setSel(0);
    setRun({ at: -1, state: "running" });
  };
  const answer = (allow: boolean) => setRun((r) => (allow ? { at: r.at, state: "running" } : { at: r.at, state: "denied" }));

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, v: openRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    apply(d.v + (e.clientX - d.x - (e.clientY - d.y)) / 320);
  };
  const onUp = () => {
    dragRef.current = null;
  };

  const status =
    run.state === "running" && run.at >= 0
      ? `The signal reached ${layers[run.at].title}.`
      : run.state === "waiting"
        ? `Stopped at ${layers[gate].title}: waiting for your answer.`
        : run.state === "done"
          ? `The signal came through all ${layers.length} layers.`
          : run.state === "denied"
            ? "Denied. The action doesn’t run, and nothing above this layer happens."
            : run.state === "timeout"
              ? "No answer, so the action doesn’t run."
              : "";
  const stopped = run.state === "denied" || run.state === "timeout";
  const reached = (i: number) => run.state !== "idle" && i <= run.at && !(stopped && i > run.at);

  return (
    <section className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby={`apart-${project.slug}`}>
      <Label n={n}>Take it apart</Label>
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <h2 id={`apart-${project.slug}`} className="text-[clamp(1.6rem,2.8vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
            What’s inside {project.title}, layer by layer.
          </h2>
          <p className="t-body mt-4 max-w-[34rem] opacity-80">Pull the stack apart, pick a layer to see what it does, then send {stack.signal} through it.</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={send} disabled={run.state === "running" || run.state === "waiting"} className="btn" style={{ background: "var(--w-accent)", color: project.world.ground === "dark" ? "#120A0F" : "#F2E9DD" }}>
              {run.state === "idle" ? "Send a signal" : run.state === "running" || run.state === "waiting" ? "Signal running…" : "Send it again"}
            </button>
            <label className="t-label flex items-center gap-3 text-[var(--w-muted)]">
              Pull apart
              <input ref={sliderRef} type="range" min={0} max={100} defaultValue={18} onChange={(e) => apply(Number(e.currentTarget.value) / 100)} className="stack-range w-28 accent-[var(--w-accent)]" />
            </label>
          </div>
          <p className="mt-4">
            <span className={`sim ${project.world.ground === "light" ? "sim-light" : ""} max-w-full whitespace-normal`}>Simulation · a picture of the flow, nothing runs</span>
          </p>

          <ol className="mt-8 grid gap-1.5" aria-label={`${project.title}, from input to output`}>
            {layers.map((l, i) => (
              <li key={l.title}>
                <button
                  type="button"
                  aria-pressed={sel === i}
                  onClick={() => setSel(i)}
                  className={`grid w-full grid-cols-[2.2rem_1fr] items-baseline gap-2 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${sel === i ? "bg-[color-mix(in_oklab,var(--w-accent)_22%,transparent)]" : "hover:bg-current/[0.06]"}`}
                >
                  <span className={`t-label ${reached(i) ? "text-[var(--w-accent)]" : "text-[var(--w-muted)]"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-semibold tracking-[-0.01em]">
                    {l.title}
                    {l.gate && <span className="t-label ml-2 text-[var(--w-accent)]">· gate</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="chunky-w mt-6 p-6" aria-live="polite">
            <p className="t-label text-[var(--w-accent)]">
              {String(sel + 1).padStart(2, "0")} · {layers[sel].title}
            </p>
            <p className="t-body mt-2.5">{layers[sel].what}</p>
            {status && <p className="t-label mt-4 text-[var(--w-muted)]">{status}</p>}
            {run.state === "waiting" && (
              <div className="mt-5 rounded-2xl border-2 border-[var(--w-ink)] p-4">
                <p className="font-semibold">Allow this action?</p>
                <p className="mt-1 text-[0.92rem] opacity-80">An example risky action, like moving a file to the Trash. This card waits {GATE_MS / 1000} seconds; with no answer, nothing runs.</p>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => answer(true)} className="btn !px-5 !py-2.5" style={{ background: "var(--w-accent)", color: project.world.ground === "dark" ? "#120A0F" : "#F2E9DD" }}>
                    Allow
                  </button>
                  <button type="button" onClick={() => answer(false)} className="btn btn-ghost !px-5 !py-2.5">
                    Deny
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <div
            ref={sceneRef}
            aria-hidden="true"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="stack-scene relative aspect-[1/1] w-full cursor-grab touch-pan-y select-none active:cursor-grabbing sm:aspect-[5/4]"
          >
            <div ref={worldRef} className="stack-world" style={{ "--n": layers.length, "--open": 0.18 } as CSSProperties}>
              {/* The signal's path, straight up through the layers */}
              <div className="stack-wire" />
              {layers.map((l, i) => (
                <div
                  key={l.title}
                  className="stack-plate"
                  data-on={sel === i ? "" : undefined}
                  data-hit={reached(i) ? "" : undefined}
                  data-gate={l.gate ? "" : undefined}
                  data-stop={stopped && i === run.at ? "" : undefined}
                  style={{ "--i": i } as CSSProperties}
                  onClick={() => setSel(i)}
                >
                  <span className="t-label">{String(i + 1).padStart(2, "0")}</span>
                  <span className="stack-plate-title">{l.title}</span>
                  <svg viewBox="-2 -2 44 24" className="stack-trace">
                    <path d={TRACE[stack.trace]} />
                  </svg>
                </div>
              ))}
              {run.state !== "idle" && <div className="stack-pulse" style={{ "--i": Math.max(0, run.at) } as CSSProperties} data-wait={run.state === "waiting" ? "" : undefined} />}
              {/* The object itself, lifted off the top of its own system */}
              <div className="stack-object">
                <Image src={`/bench/${project.slug}.webp`} alt="" width={280} height={280} sizes="14rem" className="h-auto w-full" />
              </div>
            </div>
          </div>
          <p className="t-label mt-3 text-center text-[var(--w-muted)]">Drag to pull it apart</p>
        </div>
      </div>
    </section>
  );
}
