"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { useWorld, world, type Devices } from "@/lib/store";
import { RayaStage } from "@/components/world/stages";
import { ProjectLink } from "@/components/chrome/Links";
import { Label } from "@/components/project/ProjectPage";
import { FRAMING_DEMO, House, ROOMS, allLit, blinkLed, sendPulse, useInView, type Room } from "./house";
import { DEVICES, NAMES, SHORT, parse, type DeviceId } from "./parse";
import type { WorldProps } from "../types";

/**
 * THE DEMO: a dusk living room in 3D (world/acts/RayaScene.tsx, through the shared Stage) and
 * the instruction pipeline over it: instruction → interpretation → signal → ESP controller →
 * appliance. Each appliance carries its own switch, pinned to it by the scene. Everything runs
 * in the browser and is badged as a concept-demo simulation. Without WebGL the 2D house
 * drawing stands in for the room and still answers every command.
 *
 * Lifecycle: the shared store's devices are reset to "all off" on mount and unmount, so the
 * room always starts dark and clean, and a "Reset" control puts it back at any time.
 */

/** Time the controller spends receiving before it sends, and the pulse's travel time (mirrored in RayaScene.tsx). */
const RECEIVE_MS = 520;
const TRAVEL_MS = 950;
const STAGGER_MS = 140;

const CHIPS = ["Turn on the lights", "Switch on the TV", "Start the fan", "Turn everything off"];
const STEPS = ["Instruction", "Interpretation", "Signal", "ESP controller", "Appliance"] as const;
const OFF: Devices = { lights: false, fan: false, tv: false };
/** In the 2D fallback, which rooms each device lights and which run its pulse takes. */
const RUNS: Record<DeviceId, Room[]> = { lights: ROOMS, fan: ["bedroom"], tv: ["living"] };

const resetStore = () => world.set({ devices: { ...OFF }, pulse: { device: null, at: 0 } });

export function Demo({ n }: WorldProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const flat = useRef<SVGSVGElement>(null);
  const devices = useWorld((s) => s.devices);
  const webgl = useWorld((s) => s.webgl);
  // Gates the fallback drawing's fan spin to while the demo is on screen.
  const onScreen = useInView(wrap);
  const [armed, setArmed] = useState(false);
  const [text, setText] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const [shown, setShown] = useState(0);
  const [pending, setPending] = useState<DeviceId[]>([]);
  const timers = useRef<number[]>([]);
  const touched = useRef(false);
  const autoplayed = useRef(false);
  const ids = useId();

  // A clean room on arrival and on leaving (the store outlives the page).
  useEffect(() => {
    resetStore();
    return resetStore;
  }, []);

  // The 3D stage (three.js) loads only as the demo approaches.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setArmed(true);
        io.disconnect();
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clear, [clear]);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /** Steps 3–5, shared by sentences and the switches in the room. */
  const dispatch = useCallback(
    (targets: DeviceId[], on: boolean, lead: number) => {
      later(lead, () => {
        setShown(3);
        setPending(targets);
        const now = performance.now();
        targets.forEach((d, k) => world.set({ pulse: { device: d, at: now + RECEIVE_MS + k * STAGGER_MS } }));
        blinkLed(flat.current, RECEIVE_MS);
      });
      later(lead + RECEIVE_MS, () => {
        setShown(4);
        // 3D: the store flips now and the room responds as each pulse arrives.
        if (world.get().webgl) {
          world.set((st) => {
            const next = { ...st.devices };
            targets.forEach((d) => (next[d] = on));
            return { devices: next };
          });
          return;
        }
        // 2D: pulse along the drawing's runs, then flip each device as its pulse lands.
        targets.forEach((d, k) => {
          later(k * STAGGER_MS, () => RUNS[d].forEach((r) => sendPulse(flat.current, r, TRAVEL_MS * 0.8)));
          later(k * STAGGER_MS + TRAVEL_MS * 0.8, () => world.set((st) => ({ devices: { ...st.devices, [d]: on } })));
        });
      });
      later(lead + RECEIVE_MS + TRAVEL_MS + (targets.length - 1) * STAGGER_MS, () => {
        setShown(5);
        setPending([]);
      });
    },
    [later],
  );

  const run = useCallback(
    (command: string) => {
      clear();
      const intent = parse(command, world.get().devices);
      if (!intent) {
        setPending([]);
        setDetails([`“${command}”`, "No device recognised. Try lights, fan or TV."]);
        setShown(2);
        return;
      }
      const { targets } = intent;
      const name = intent.all ? "All three" : targets.map((d) => NAMES[d]).join(" and ");
      const device = intent.all ? "all" : targets.join(" + ");
      setDetails([
        `“${command}”`,
        `{ device: ${device}, state: ${intent.on ? "on" : "off"} }`,
        "Control instruction sent to the controller",
        targets.length > 1 ? "Relays switch, one channel at a time" : "Its relay channel switches",
        `${name}: ${intent.on ? "on" : "off"}`,
      ]);
      setShown(1);
      later(450, () => setShown(2));
      dispatch(targets, intent.on, 950);
    },
    [clear, later, dispatch],
  );

  const toggle = useCallback(
    (d: DeviceId) => {
      touched.current = true;
      clear();
      const on = !world.get().devices[d];
      setDetails([
        `Switch: ${NAMES[d]}`,
        "Direct control: no language step",
        "Control instruction sent to the controller",
        "Its relay channel switches",
        `${NAMES[d]}: ${on ? "on" : "off"}`,
      ]);
      setShown(2);
      dispatch([d], on, 120);
    },
    [clear, dispatch],
  );

  const reset = () => {
    touched.current = true;
    clear();
    setText("");
    setDetails([]);
    setShown(0);
    setPending([]);
    world.set({ devices: { ...OFF } });
  };

  const submit = (command: string) => {
    touched.current = true;
    if (command.trim()) run(command.trim());
  };

  // Scroll choreography, plus one quiet demonstration if the visitor hasn't tried it yet.
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const autoplay = () => {
        if (autoplayed.current || touched.current) return;
        autoplayed.current = true;
        const cmd = "Turn on the lights";
        if (reduced) {
          setText(cmd);
          run(cmd);
          return;
        }
        for (let i = 1; i <= cmd.length; i++) later(i * 55, () => !touched.current && setText(cmd.slice(0, i)));
        later(cmd.length * 55 + 380, () => !touched.current && run(cmd));
      };
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          if (self.progress > 0.2 && self.progress < 0.8) autoplay();
        },
      });

      if (reduced) {
        // No choreography: the establishing state and the working state swap instantly.
        let hold: boolean | null = null;
        const apply = (p: number) => {
          const h = p > 0.12;
          if (h === hold) return;
          hold = h;
          gsap.set("[data-intro]", { autoAlpha: h ? 0 : 1 });
          gsap.set("[data-command]", { autoAlpha: h ? 1 : 0 });
          gsap.set("[data-title]", { scale: h ? 0.62 : 1 });
          gsap.set("[data-veil]", { autoAlpha: 0 });
        };
        const swap = ScrollTrigger.create({ trigger: root.current, start: "top top", end: "bottom bottom", onUpdate: (self) => apply(self.progress) });
        apply(swap.progress);
        return () => {
          st.kill();
          swap.kill();
        };
      }

      // The room rises out of the page's ground as the section arrives…
      gsap.fromTo("[data-veil]", { autoAlpha: 1 }, { autoAlpha: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "top 85%", end: "top top", scrub: true } });
      // …and is handed back to it at the end.
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      tl.set({}, {}, 1)
        .to("[data-title]", { scale: 0.62, duration: 0.1 }, 0.1)
        .to("[data-intro]", { autoAlpha: 0, y: -12, duration: 0.05 }, 0.08)
        .fromTo("[data-command]", { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.13)
        .to("[data-title], [data-label], [data-command]", { autoAlpha: 0, y: -16, duration: 0.06 }, 0.88)
        .to("[data-veil-out]", { autoAlpha: 1, duration: 0.1, ease: "none" }, 0.9);
      return () => st.kill();
    },
    { scope: root },
  );

  const ctrlStatus = shown === 3 ? "Receiving" : shown === 4 ? "Sending" : "Ready";
  const failed = details.length === 2;
  const lit = allLit(devices.lights);

  return (
    <div ref={wrap} className="relative" style={{ background: "var(--w-bg)" }}>
      {armed && webgl && <RayaStage />}
      <section ref={root} id="demo" data-act="raya" data-ground="dark" aria-labelledby="demo-title" className="act h-[250svh] text-bone">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Without WebGL, the drawing is the room. */}
          {!webgl && (
            <div className="absolute inset-0">
              <House svgRef={flat} lit={lit} tv={devices.tv} fan={devices.fan} framing={FRAMING_DEMO} fade={700} live={onScreen} />
            </div>
          )}

          {/* Switches pinned to the appliances in the room (positioned every frame by RayaScene). */}
          {webgl && (
            <div className="absolute inset-0">
              {DEVICES.map((d) => {
                const on = devices[d];
                const busy = pending.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${NAMES[d]} power`}
                    data-raya-anchor={d}
                    onClick={() => toggle(d)}
                    className={`group invisible absolute left-0 top-0 -translate-x-1/2 rounded-full opacity-0 will-change-transform ${d === "fan" ? "" : "-translate-y-full"}`}
                  >
                    <span className={`flex items-center ${d === "fan" ? "flex-col-reverse" : "flex-col"}`}>
                      <span style={{ translate: "var(--dx, 0px) 0" }} className="t-label flex items-center gap-2 whitespace-nowrap rounded-full border border-bone/20 bg-void/65 px-2.5 py-1 text-bone/90 transition-colors group-hover:border-bone/50 group-focus-visible:border-verdigris">
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${busy ? "animate-pulse bg-verdigris" : on ? "bg-apricot" : "bg-bone/30"}`} />
                        {SHORT[d]}
                        <span className={busy ? "text-verdigris" : on ? "text-apricot" : "text-bone/50"}>{busy ? "···" : on ? "On" : "Off"}</span>
                      </span>
                      <span aria-hidden="true" className="h-5 w-px bg-bone/30" />
                    </span>
                  </button>
                );
              })}
              <div data-raya-anchor="controller" aria-hidden="true" className="invisible absolute left-0 top-0 opacity-0">
                <span className="flex -translate-x-1/2 -translate-y-full flex-col items-center">
                  <span style={{ translate: "var(--dx, 0px) 0" }} className="t-label flex items-center gap-2 whitespace-nowrap rounded-full bg-void/65 px-2.5 py-1 text-bone/85">
                    ESP32 controller
                    <span className={shown === 3 || shown === 4 ? "text-verdigris" : "text-bone/55"}>{ctrlStatus}</span>
                  </span>
                  <span className="h-6 w-px bg-verdigris/60" />
                </span>
              </div>
            </div>
          )}

          {/* Quiet scrims so type holds over the room without a panel. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-t from-void via-void/70 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-[55%] w-[75%] bg-[radial-gradient(ellipse_at_0%_0%,rgba(18,10,15,0.72),transparent_65%)]" />

          {/* The page's ground, lifting off as the room arrives and returning as it leaves. */}
          <div data-veil aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--w-bg)" }} />

          {/* Title, against the plaster of the left wall. */}
          <div className="absolute left-[var(--gutter)] right-[var(--gutter)] top-[calc(var(--header-h)+1rem)] max-w-[40rem] md:top-[calc(var(--header-h)+2rem)]">
            <div data-label>
              <Label n={n?.[0] ?? "·"}>The demo</Label>
            </div>
            <h2 id="demo-title" data-title className="t-display mt-5 origin-top-left">
              Tell the <span className="t-italic text-[var(--w-accent)]">room.</span>
            </h2>
          </div>

          {/* Establishing: one idea, low in the frame, before the command line takes its place. */}
          <div data-intro className="absolute bottom-8 left-[var(--gutter)] right-[var(--gutter)] max-w-[34rem] md:bottom-10">
            <p className="t-lead text-bone/85">Type an instruction or flip a switch. The controller {webgl ? "on the console" : "on the hall wall"} receives it and a pulse carries it to the appliance, which answers only when the pulse arrives.</p>
            <p className="mt-5 flex flex-wrap items-center gap-3">
              <span className="sim max-w-full whitespace-normal sm:whitespace-nowrap">Concept demo · simulation · no hardware connected</span>
              <span className="t-label text-bone/50">Scroll into the room ↓</span>
            </p>
          </div>

          {/* The command line along the foot of the frame. */}
          <div data-command className="invisible absolute inset-x-0 bottom-0 px-[var(--gutter)] pb-5 opacity-0 md:pb-7">
            {/* Sequence caption: desktop shows all five; phones show the current step. */}
            <ol className="hidden grid-cols-5 gap-x-5 md:grid" aria-label="What happens">
              {STEPS.map((label, i) => {
                const on = i < shown && !!details[i];
                const current = on && i === shown - 1;
                const tone = i >= 2 && i <= 3 ? "bg-verdigris" : i === 4 ? "bg-apricot" : "bg-bone";
                return (
                  <li key={label} className="min-w-0">
                    <span aria-hidden="true" className="relative block h-px bg-bone/15">
                      <span className={`absolute inset-0 origin-left transition-transform duration-700 ease-[var(--ease-out-expo)] ${tone} ${on ? "scale-x-100" : "scale-x-0"}`} />
                    </span>
                    <span className={`t-label mt-2.5 flex items-center gap-2 transition-colors duration-500 ${on ? "text-bone" : "text-bone/40"}`}>
                      <span className={current ? "text-apricot" : ""}>{String(i + 1).padStart(2, "0")}</span>
                      {label}
                      {i < 4 && (
                        <span aria-hidden="true" className="ml-auto text-bone/30">
                          →
                        </span>
                      )}
                    </span>
                    <span className={`mt-1 line-clamp-2 min-h-[2.6em] text-[0.82rem] leading-snug transition-opacity duration-500 ${i === 1 && !failed ? "font-mono text-[0.74rem]" : ""} ${on ? "text-bone/75 opacity-100" : "opacity-0"}`}>
                      {on ? details[i] : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="md:hidden" aria-hidden="true">
              <div className="grid grid-cols-5 gap-1.5">
                {STEPS.map((label, i) => (
                  <span key={label} className={`h-px transition-colors duration-500 ${i < shown ? (i >= 2 && i <= 3 ? "bg-verdigris" : i === 4 ? "bg-apricot" : "bg-bone") : "bg-bone/15"}`} />
                ))}
              </div>
              <p className="t-label mt-2 flex gap-2 text-bone/80">
                <span className="text-apricot">{String(Math.max(1, shown)).padStart(2, "0")}/05</span>
                <span>{STEPS[Math.max(0, shown - 1)]}</span>
              </p>
              <p className={`mt-0.5 line-clamp-2 min-h-[2.5em] text-[0.8rem] text-bone/70 ${shown === 2 && !failed ? "font-mono text-[0.72rem]" : ""}`}>
                {shown ? details[shown - 1] : "Instruction → Interpretation → Signal → ESP controller → Appliance"}
              </p>
            </div>
            <p className="sr-only" aria-live="polite">
              {shown ? `${STEPS[shown - 1]}: ${details[shown - 1]}` : ""}
            </p>

            <div className="mt-4 grid items-end gap-x-10 gap-y-3 md:mt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
              <div className="min-w-0">
                <form
                  className="flex items-center gap-3 border-b border-bone/25 transition-colors focus-within:border-apricot has-[input:focus-visible]:shadow-[0_1px_0_0_var(--color-apricot)]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(text);
                  }}
                >
                  <label htmlFor={`${ids}-cmd`} className="t-label shrink-0 text-apricot">
                    Tell the room
                  </label>
                  <input
                    id={`${ids}-cmd`}
                    value={text}
                    onChange={(e) => {
                      touched.current = true;
                      setText(e.target.value);
                    }}
                    onFocus={() => (touched.current = true)}
                    placeholder="turn on the lights"
                    style={{ outline: "none" }}
                    className="min-w-0 flex-1 bg-transparent py-2 font-display text-[clamp(1.25rem,2.1vw,1.9rem)] font-light tracking-[-0.02em] text-bone outline-none placeholder:text-bone/30"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button type="submit" className="btn btn-light mb-1.5 shrink-0 !px-4 !py-2.5">
                    Send
                  </button>
                </form>
                <div data-interactive className="-mx-[var(--gutter)] mt-3 flex gap-1.5 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        touched.current = true;
                        setText(c);
                        run(c);
                      }}
                      className="t-label shrink-0 rounded-full border border-bone/20 px-2.5 py-1.5 text-bone/70 transition-colors hover:border-bone/60 hover:text-bone"
                    >
                      {c}
                    </button>
                  ))}
                  <button type="button" onClick={reset} className="t-label shrink-0 rounded-full px-2.5 py-1.5 text-bone/50 underline-offset-4 transition-colors hover:text-bone hover:underline">
                    ↺ Reset
                  </button>
                </div>
                {!webgl && (
                  <div className="mt-3 flex flex-wrap gap-4">
                    {DEVICES.map((d) => (
                      <span key={d} className="flex items-center gap-2 text-[0.85rem] text-bone/80">
                        {SHORT[d]}
                        <button type="button" role="switch" aria-checked={devices[d]} aria-label={`${NAMES[d]} power`} className="switch" onClick={() => toggle(d)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="min-w-0 md:pb-1">
                <span className="sim max-w-full whitespace-normal sm:whitespace-nowrap">Concept demo · simulation · no hardware connected</span>
                <p className="t-label mt-2.5 normal-case tracking-[0.04em] text-bone/70">
                  Runs in your browser: a small rule parser stands in for RAYA’s language understanding.
                </p>
                <p className="t-label mt-1.5 hidden normal-case tracking-[0.04em] text-bone/60 sm:block">
                  The box {webgl ? "on the console" : "on the hall wall"} stands in for an ESP32 relay controller, like my résumé build (Embedded C, two-channel relay). No firmware is public.{" "}
                  <ProjectLink href="/projects/raya-assistant" className="link-u whitespace-nowrap text-apricot">
                    The assistant →
                  </ProjectLink>
                </p>
              </div>
            </div>
          </div>

          {/* Handing back to the page at the end: the foot of the room dissolves into the ground. */}
          <div data-veil-out aria-hidden="true" className="pointer-events-none invisible absolute inset-0 opacity-0" style={{ background: "linear-gradient(to top, var(--w-bg) 0%, color-mix(in oklab, var(--w-bg) 70%, transparent) 30%, transparent 65%)" }} />
        </div>
      </section>
    </div>
  );
}
