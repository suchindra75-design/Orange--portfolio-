"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { WorldProps } from "../types";
import { Label } from "@/components/project/ProjectPage";
import { C, Grid, PATHS, Trace } from "./Plot";
import {
  ALERT,
  ALERT_AT,
  ALERT_INDEX,
  COLD_MARGIN,
  COLD_MAX,
  F2_DIP,
  FIELDS,
  FIRST,
  GENERATED,
  LAST,
  N,
  REPORT_SUMMARY,
  ROWS,
  DAY_LABELS,
  Y_TICKS,
  f1d,
  fmtClock,
  fmtDay,
  fmtStamp,
  indexAtX,
  statsF1,
  statsF2,
  xAt,
  yAt,
} from "./data";

/** Readings per second while replaying (each was ~20 s apart when it was recorded). */
const RATE = 26;

function FieldCard({ name, color, note, value, s }: { name: string; color: string; note: string; value: number; s: { min: number; max: number; avg: number } }) {
  return (
    <div className="min-w-0">
      <p className="t-label flex items-center gap-2" style={{ color }}>
        <span aria-hidden="true" className="inline-block h-[2px] w-4" style={{ background: color }} />
        {name}
      </p>
      <p className="mt-2 font-display text-[clamp(2.1rem,4.6vw,4rem)] font-light leading-none tabular-nums tracking-[-0.035em]">{f1d(value)}</p>
      <dl className="t-label mt-3 grid grid-cols-3 gap-1 text-[var(--w-muted)] sm:gap-2">
        {(["min", "max", "avg"] as const).map((k) => (
          <div key={k}>
            <dt className="opacity-70">{k}</dt>
            <dd className="mt-0.5 tabular-nums text-[var(--w-ink)]">{f1d(s[k])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[0.78rem] leading-snug text-[var(--w-muted)]">{note}</p>
    </div>
  );
}

/**
 * DEMO: 365 real readings from the app's own PDF audit report, replayed the way the dashboard
 * draws them. Nothing here is live and nothing is invented: values, timestamps and the one alert
 * come from the report; the threshold is the app's default from alert.config.ts.
 */
export function Replay({ project, n }: WorldProps) {
  const [i, setI] = useState(N - 1);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const [status, setStatus] = useState("");
  const chart = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const pos = useRef(N - 1);
  const autoplayed = useRef(false);

  // Watch the instrument; the first time it is properly on screen, the replay starts by itself.
  useEffect(() => {
    const el = chart.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.intersectionRatio >= 0.35 && !autoplayed.current) {
          autoplayed.current = true;
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          pos.current = 0;
          setI(0);
          setPlaying(true);
          setStatus("Replaying the recorded readings.");
        }
      },
      { threshold: [0, 0.35] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The replay loop: runs only while playing and on screen.
  useEffect(() => {
    if (!playing || !inView) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      // rAF time can trail performance.now() on the first frame: never step backwards.
      const dt = Math.max(0, Math.min(0.25, (now - prev) / 1000));
      prev = now;
      pos.current = Math.max(0, Math.min(N - 1, pos.current + dt * RATE));
      const k = Math.floor(pos.current);
      setI((old) => (old === k ? old : k));
      if (pos.current >= N - 1) {
        setPlaying(false);
        setStatus(`Replay finished: all ${N} readings, 11 to 17 September 2026.`);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, inView]);

  const seek = useCallback((k: number) => {
    const c = Math.max(0, Math.min(N - 1, Math.round(k)));
    pos.current = c;
    setI(c);
  }, []);

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      setStatus(`Paused at reading ${i + 1} of ${N}.`);
      return;
    }
    if (pos.current >= N - 1) seek(0);
    setPlaying(true);
    setStatus("Replaying the recorded readings.");
  };
  const restart = () => {
    seek(0);
    setPlaying(true);
    setStatus("Replay restarted from the first reading.");
  };

  // Drag across the chart to scrub (pointer); the slider below is the keyboard path.
  const scrubbing = useRef(false);
  const scrubTo = (e: PointerEvent<HTMLDivElement>) => {
    const r = plot.current?.getBoundingClientRect();
    if (!r) return;
    seek(indexAtX((e.clientX - r.left) / r.width));
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    scrubbing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlaying(false);
    scrubTo(e);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (scrubbing.current) scrubTo(e);
  };
  const onUp = () => {
    scrubbing.current = false;
  };
  const onSliderKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  const r = ROWS[i];
  const x = xAt(i) * 100;
  const s1 = statsF1(i);
  const s2 = statsF2(i);
  const alertOn = i >= ALERT_INDEX;
  const dipShown = i >= F2_DIP.i;
  const ty = yAt(COLD_MAX) * 100;
  const surface = `color-mix(in oklab, ${project.world.bg} 78%, #2B1620)`;

  return (
    <section data-ground="dark" className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="replay-title">
      <Label n={n?.[0] ?? "·"}>The demo</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="replay-title" className="t-h2 md:col-span-7">
          Six days in one bag, <span className="t-italic text-[var(--w-accent)]">replayed</span> the way the app drew them.
        </h2>
        <div className="md:col-span-4 md:col-start-9">
          <span className="sim max-w-full text-[0.55rem] tracking-[0.07em] sm:text-[0.62rem] sm:tracking-[0.12em]">Recorded data · 17 Sep 2026 · replayed — not live</span>
          <p className="t-body mt-4 opacity-80">
            All {N} readings from the PDF audit report the app generated on 17 September 2026, for one bag, 11–17 September. The channel never named its fields, so the app shows them as recorded: {FIELDS[0]} and {FIELDS[1]}.
          </p>
        </div>
      </div>

      <figure className="mt-12 overflow-hidden rounded-2xl border border-current/12" style={{ background: surface }}>
        {/* header strip */}
        <div className="t-label flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-current/10 px-5 py-4 text-[var(--w-muted)] md:px-8">
          <span>Audit report · generated {fmtStamp(GENERATED)} UTC</span>
          <span className="tabular-nums text-[var(--w-ink)]">
            {fmtStamp(r.ts)} UTC <span className="text-[var(--w-muted)]">· reading {String(i + 1).padStart(3, "0")} / {N}</span>
          </span>
        </div>

        {/* the two fields, with running min / max / avg */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 px-5 pt-6 md:grid-cols-[1fr_1fr_1.1fr] md:gap-10 md:px-8 md:pt-8">
          <FieldCard name={FIELDS[0]} color={C.one} value={r.f1} s={s1} note="Read by the worker as the cold compartment: no field mapping, so it falls back to Field 1." />
          <FieldCard name={FIELDS[1]} color={C.two} value={r.f2} s={s2} note="Not mapped to a compartment, so no thresholds are checked against it." />
          <div className="col-span-2 min-w-0 border-t border-current/12 pt-4 md:col-span-1 md:border-0 md:border-l md:pl-10 md:pt-0">
            <p className="t-label text-[var(--w-muted)]">Alerts</p>
            {alertOn ? (
              <div className="mt-3">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="t-label rounded-full px-2.5 py-1 text-[var(--w-bg)]" style={{ background: C.hot }}>
                    {ALERT.severity}
                  </span>
                  <span className="t-label rounded-full border border-current/30 px-2.5 py-1">{ALERT.status}</span>
                </p>
                <p className="mt-3 text-[1.05rem] font-semibold tracking-[-0.01em]">Cold temperature high</p>
                <dl className="t-label mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[var(--w-muted)]">
                  <dt>Triggered</dt>
                  <dd className="tabular-nums text-[var(--w-ink)]">{fmtStamp(ALERT_AT)}</dd>
                  <dt>Resolved</dt>
                  <dd className="text-[var(--w-ink)]">— never</dd>
                </dl>
              </div>
            ) : (
              <p className="mt-3 text-[var(--w-muted)]">None yet.</p>
            )}
          </div>
        </div>

        {/* the chart */}
        <div ref={chart} className="pb-4 pl-5 pr-11 pt-14 md:pl-8 md:pr-14 md:pt-16">
          <div
            ref={plot}
            className="relative h-[clamp(13rem,34svh,21rem)] cursor-ew-resize touch-pan-y select-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-hidden="true"
          >
            <Grid cols={32} />
            {DAY_LABELS.map((l) => (
              <span key={l.text} className={`t-label absolute -top-8 whitespace-nowrap text-[0.6rem] text-[var(--w-muted)] ${l.center ? "-translate-x-1/2" : ""}`} style={{ left: `${l.x * 100}%` }}>
                {l.text}
              </span>
            ))}
            {Y_TICKS.map((t) => (
              <span key={t} className="t-label absolute -right-1 -translate-y-1/2 translate-x-full pl-2 text-[0.58rem] tabular-nums text-[var(--w-muted)]" style={{ top: `${yAt(t) * 100}%` }}>
                {t}
              </span>
            ))}
            <span className="t-label absolute left-2 -translate-y-[135%] text-[0.58rem] text-apricot" style={{ top: `${ty}%` }}>
              {COLD_MAX.toFixed(1)} · cold max (app default)
            </span>

            {/* ghost of the whole record, then the part replayed so far */}
            <div className="absolute inset-0 opacity-[0.14]">
              <Trace d={PATHS.f1} color={C.one} width={1.2} />
              <Trace d={PATHS.f2} color={C.two} width={1.2} />
            </div>
            <div className="absolute inset-0" style={{ clipPath: `inset(-4% ${(100 - x).toFixed(2)}% -4% 0)` }}>
              <Trace d={PATHS.f1} color={C.one} width={1.6} />
              <Trace d={PATHS.f2} color={C.two} width={2.2} />
            </div>

            {/* the alert lane: open from the first reading to the cursor, never resolved */}
            {alertOn && (
              <>
                <span className="absolute -top-[0.7rem] h-[3px] rounded-full" style={{ left: `${xAt(ALERT_INDEX) * 100}%`, width: `${Math.max(0.6, x - xAt(ALERT_INDEX) * 100)}%`, background: C.hot }} />
                <span className="t-label absolute top-[0.45rem] whitespace-nowrap pl-2 text-[0.55rem] text-apricot" style={{ left: `${xAt(ALERT_INDEX) * 100}%` }}>
                  {ALERT.severity} alert · {ALERT.status.toLowerCase()}
                </span>
                <span className="absolute top-0 h-full w-px" style={{ left: `${xAt(ALERT_INDEX) * 100}%`, background: `linear-gradient(${C.hot}, transparent)` }} />
              </>
            )}

            {/* the Field 2 dip, annotated once the replay reaches it */}
            {dipShown && (
              <div className="absolute" style={{ left: `${xAt(F2_DIP.i) * 100}%`, top: `${yAt(F2_DIP.f2) * 100}%` }}>
                <span className="absolute -left-[5px] -top-[5px] size-[10px] rounded-full border" style={{ borderColor: C.two }} />
                <span className="t-label absolute right-3 top-3 w-max max-w-[13rem] text-right text-[0.58rem] leading-relaxed text-[var(--w-muted)]">
                  <span style={{ color: C.two }}>{FIELDS[1]} · {f1d(F2_DIP.f2)}</span> · {fmtDay(F2_DIP.ts)} {fmtClock(F2_DIP.ts)}
                  <br />
                  no alert: not mapped
                </span>
              </div>
            )}

            {/* cursor */}
            <div className="pointer-events-none absolute inset-y-0" style={{ left: `${x}%` }}>
              <span className="absolute -top-3 bottom-0 w-px bg-[var(--w-ink)] opacity-50" />
              <span className="absolute -left-[3.5px] -mt-[3.5px] size-[7px] rounded-full" style={{ top: `${yAt(r.f1) * 100}%`, background: C.one }} />
              <span className="absolute -left-[4.5px] -mt-[4.5px] size-[9px] rounded-full border-2" style={{ top: `${yAt(r.f2) * 100}%`, borderColor: C.two, background: surface }} />
            </div>
          </div>
          <p className="t-label mt-3 flex flex-wrap justify-between gap-2 text-[0.6rem] text-[var(--w-muted)]">
            <span>x · reading order · dashed breaks are gaps between recording sessions</span>
            <span>y · value as recorded</span>
          </p>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-3 border-t border-current/10 px-5 py-4 md:gap-5 md:px-8">
          <button type="button" onClick={toggle} className="btn btn-ghost min-w-[7.5rem] justify-center" aria-pressed={playing}>
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span> {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={restart} className="btn btn-ghost">
            <span aria-hidden="true">↺</span> Restart
          </button>
          <label className="flex min-w-[12rem] flex-1 items-center gap-3">
            <span className="t-label text-[var(--w-muted)]">Reading</span>
            <input
              type="range"
              min={0}
              max={N - 1}
              step={1}
              value={i}
              onChange={(e) => {
                setPlaying(false);
                seek(Number(e.target.value));
              }}
              onKeyDown={onSliderKey}
              aria-valuetext={`Reading ${i + 1} of ${N}, ${fmtStamp(r.ts)} UTC. ${FIELDS[0]} ${f1d(r.f1)}, ${FIELDS[1]} ${f1d(r.f2)}.`}
              className="h-6 w-full cursor-pointer accent-[var(--w-accent)]"
            />
          </label>
          <p className="sr-only" aria-live="polite">
            {status}
          </p>
        </div>
        <figcaption className="sr-only">
          A replay of {N} recorded readings from {fmtStamp(FIRST.ts)} to {fmtStamp(LAST.ts)} UTC. One critical alert, cold temperature high, was triggered on the first reading and never resolved.
        </figcaption>
      </figure>

      {/* what the replay shows, and how to read it */}
      <div className="mt-10 grid gap-8 text-[0.95rem] leading-relaxed md:grid-cols-3 md:gap-12">
        <p className="border-l border-[var(--w-accent2)]/60 pl-4 opacity-85">
          <span className="t-label block text-[var(--w-accent2)]">Why the one alert</span>
          The worker read {FIELDS[0]} as the cold compartment. Against the default 0–{COLD_MAX} range (<code className="font-mono text-[0.85em]">alert.config.ts</code>), the first reading, {f1d(FIRST.f1)}, was past the {COLD_MARGIN}-degree critical margin, so it opened a CRITICAL alert. {FIELDS[0]} never came back to {COLD_MAX} or below, so auto-resolve never fired: the report lists it as active.
        </p>
        <p className="border-l border-current/25 pl-4 opacity-85">
          <span className="t-label block text-[var(--w-muted)]">Why not the dip</span>
          {FIELDS[1]} fell to {f1d(F2_DIP.f2)} on {fmtDay(F2_DIP.ts)} at {fmtClock(F2_DIP.ts)} UTC. It isn’t mapped to a compartment, so the alert engine never checks it. The bag’s own threshold settings aren’t in the report; the line drawn is the app’s default.
        </p>
        <p className="border-l border-current/25 pl-4 opacity-85">
          <span className="t-label block text-[var(--w-muted)]">About the numbers</span>
          Min, max and avg are recounted from the report’s table as the replay runs. The table is rounded to 0.1, so the final {FIELDS[1]} average reads {f1d(statsF2(N - 1).avg)} here; the report’s own summary, computed from the full-precision readings, says {f1d(REPORT_SUMMARY[FIELDS[1]].avg)}.
        </p>
      </div>
    </section>
  );
}
