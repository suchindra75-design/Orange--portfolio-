"use client";

import { useEffect, useRef } from "react";
import type { WorldProps } from "../types";
import { useReducedMotion } from "@/lib/hooks";
import { Area, C, Grid, PATHS, Trace } from "./Plot";
import { WorldStyles } from "./styles";
import { useInView } from "./useInView";
import { ALERT_INDEX, COLD_MAX, DAY_LABELS, F2_DIP, FIELDS, N, ROWS, Y_TICKS, f1d, fmtClock, fmtDay, xAt, yAt } from "./data";

/** One pass of the scanning cursor across all 365 readings. */
const SCAN_MS = 42000;
const REST_MS = 2600;
/** Wait for the intro sweep before the cursor starts. */
const INTRO_MS = 1200;

/**
 * Hero: the recorded traces sweep in (≤ 1.2 s), then a slow cursor scans them, reading out the
 * real values under it. Interest sits top and right; the bottom-left stays calm for the title.
 */
export function HeroVisual({ project }: WorldProps) {
  const root = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const dot1 = useRef<HTMLSpanElement>(null);
  const dot2 = useRef<HTMLSpanElement>(null);
  const v1 = useRef<HTMLSpanElement>(null);
  const v2 = useRef<HTMLSpanElement>(null);
  const when = useRef<HTMLSpanElement>(null);
  const tag = useRef<HTMLSpanElement>(null);
  const inView = useInView(root);
  const reduced = useReducedMotion();

  /** Where the scan is (ms into its cycle) and the last placed reading, kept across pauses. */
  const phase = useRef<number | null>(null);
  const last = useRef(-1);

  useEffect(() => {
    const el = plot.current;
    const cur = cursor.current;
    if (!el || !cur) return;
    let w = el.clientWidth;
    let h = el.clientHeight;
    let shown = -1;

    function place(at: number) {
      if (!cur) return;
      const t = Math.max(0, Math.min(N - 1, at));
      last.current = t;
      cur.style.transform = `translate3d(${(xAt(t) * w).toFixed(1)}px,0,0)`;
      const i = Math.round(t);
      const r = ROWS[i];
      if (dot1.current) dot1.current.style.transform = `translate3d(-50%,${(yAt(r.f1) * h).toFixed(1)}px,0)`;
      if (dot2.current) dot2.current.style.transform = `translate3d(-50%,${(yAt(r.f2) * h).toFixed(1)}px,0)`;
      if (i === shown) return;
      shown = i;
      if (v1.current) v1.current.textContent = f1d(r.f1);
      if (v2.current) v2.current.textContent = f1d(r.f2);
      if (when.current) when.current.textContent = `${fmtDay(r.ts)} · ${fmtClock(r.ts, true)} UTC`;
      if (tag.current) tag.current.textContent = `${String(i + 1).padStart(3, "0")} / ${N}`;
    }

    const ro = new ResizeObserver(() => {
      w = el.clientWidth;
      h = el.clientHeight;
      place(last.current < 0 ? F2_DIP.i : last.current);
    });
    ro.observe(el);

    // Reduced motion (or not started yet): the cursor rests on the Field 2 dip, 17 Sep 04:56 UTC.
    place(last.current < 0 ? F2_DIP.i : last.current);
    if (reduced || !inView) return () => ro.disconnect();

    const CYCLE = INTRO_MS + SCAN_MS + REST_MS;
    let start = performance.now() - (phase.current ?? 0);
    let raf = 0;
    const tick = (now: number) => {
      let e = now - start;
      if (e >= CYCLE) {
        start = now - INTRO_MS;
        e = INTRO_MS;
      }
      phase.current = e;
      if (e < INTRO_MS) {
        if (last.current !== 0) place(0);
      } else if (e < INTRO_MS + SCAN_MS) {
        place(((e - INTRO_MS) / SCAN_MS) * (N - 1));
        cur.style.opacity = "1";
      } else {
        cur.style.opacity = String(Math.max(0, 1 - (e - INTRO_MS - SCAN_MS) / 900));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [inView, reduced]);

  const ty = yAt(COLD_MAX) * 100;

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" style={{ background: project.world.bg }}>
      <WorldStyles />
      {/* depth: a low warm falloff behind the instrument, no glow */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(80% 70% at 72% 30%, rgba(90,30,36,0.38), transparent 70%), radial-gradient(60% 50% at 100% 0%, rgba(43,22,32,0.9), transparent 70%)" }} />

      {/* Top-right: the honest badge, and the real values under the cursor */}
      <div className="absolute right-[var(--gutter)] top-[calc(var(--header-h)+0.9rem)] z-[3] flex flex-col items-end gap-4 text-right md:flex-row md:items-center md:gap-8">
        <div className="inf-late order-2 flex items-end gap-5 md:order-1 md:gap-7" aria-hidden="true">
          <p className="t-label hidden text-left leading-snug text-[var(--w-muted)] sm:block">
            <span ref={when}>{`${fmtDay(F2_DIP.ts)} · ${fmtClock(F2_DIP.ts, true)} UTC`}</span>
            <br />
            reading <span ref={tag}>{`${String(F2_DIP.i + 1).padStart(3, "0")} / ${N}`}</span>
          </p>
          <p className="flex items-baseline gap-2">
            <span className="t-label" style={{ color: C.one }}>
              {FIELDS[0]}
            </span>
            <span ref={v1} className="inline-block min-w-[2.4ch] font-display text-[clamp(1.6rem,2.6vw,2.6rem)] font-light leading-none tabular-nums tracking-[-0.03em]">
              {f1d(F2_DIP.f1)}
            </span>
          </p>
          <p className="flex items-baseline gap-2">
            <span className="t-label" style={{ color: C.two }}>
              {FIELDS[1]}
            </span>
            <span ref={v2} className="inline-block min-w-[2.4ch] font-display text-[clamp(1.6rem,2.6vw,2.6rem)] font-light leading-none tabular-nums tracking-[-0.03em]" style={{ color: C.two }}>
              {f1d(F2_DIP.f2)}
            </span>
          </p>
        </div>
        <span className="sim order-1 md:order-2">Recorded data · replayed</span>
      </div>

      {/* The instrument */}
      <div aria-hidden="true" className="absolute left-[var(--gutter)] right-[calc(var(--gutter)+1.6rem)] top-[calc(var(--header-h)+8rem)] h-[15svh] sm:h-[24svh] md:left-[34%] md:top-[calc(var(--header-h)+7.5rem)] md:h-[clamp(7rem,calc(100svh-36rem),30svh)]">
        <div ref={plot} className="absolute inset-0">
          <Grid cols={28} />
          {/* recording days along the top */}
          {DAY_LABELS.map((l) => (
            <span key={l.text} className={`t-label absolute -top-7 whitespace-nowrap text-[0.6rem] text-[var(--w-muted)] ${l.center ? "-translate-x-1/2" : ""}`} style={{ left: `${l.x * 100}%` }}>
              {l.text}
            </span>
          ))}
          {/* y ticks, right edge */}
          {Y_TICKS.map((t) => (
            <span key={t} className="t-label absolute -right-7 -translate-y-1/2 text-[0.58rem] tabular-nums text-[var(--w-muted)] opacity-70" style={{ top: `${yAt(t) * 100}%` }}>
              {t}
            </span>
          ))}
          <span className="t-label absolute left-0 -translate-y-[135%] text-[0.58rem] text-apricot/85" style={{ top: `${ty}%` }}>
            {COLD_MAX.toFixed(1)} · cold max (app default)
          </span>
          {/* the alert opened on the very first reading */}
          <span className="absolute top-0 h-full w-px" style={{ left: `${xAt(ALERT_INDEX) * 100}%`, background: `linear-gradient(${C.hot}, transparent 80%)`, opacity: 0.8 }} />

          <div className="inf-sweep absolute inset-0">
            <Area d={PATHS.f2Area} color={C.two} opacity={0.1} />
            <Trace d={PATHS.f1} color={C.one} width={1.3} opacity={0.75} />
            <Trace d={PATHS.f2} color={C.two} width={1.8} />
          </div>

          {/* the scanning cursor */}
          <div className="inf-late absolute inset-0">
          <div ref={cursor} className="absolute inset-y-0 left-0 w-0" style={{ willChange: "transform" }}>
            <span className="absolute -top-2 bottom-0 left-0 w-px" style={{ background: "linear-gradient(transparent, rgba(242,233,221,0.55) 12%, rgba(242,233,221,0.55) 88%, transparent)" }} />
            <span ref={dot1} className="absolute left-0 top-0 -mt-[3px] size-[7px] rounded-full" style={{ background: C.one }} />
            <span ref={dot2} className="absolute left-0 top-0 -mt-[4px] size-[9px] rounded-full border-2" style={{ borderColor: C.two, background: project.world.bg }} />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
