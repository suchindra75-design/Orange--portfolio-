"use client";

import Image from "next/image";
import { Fragment, useRef } from "react";
import type { WorldProps } from "../types";
import { Label } from "@/components/project/ProjectPage";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { C } from "./Plot";
import { COLD_MARGIN, COLD_MAX, FIRST, f1d } from "./data";

/**
 * EXTRA: the signal path, stop by stop, named after the real modules in the INFINOS monorepo
 * (backend Express + Prisma, web React, mobile Flutter). Every line is checked against the code.
 */
const STOPS: { k: string; mod: string; body: string; hot?: boolean }[] = [
  {
    k: "Sensors in the bag",
    mod: "ESP32 · digital temperature sensors",
    body: "Part of my circuit work on the bag. The firmware isn’t in these repositories.",
  },
  {
    k: "ThingSpeak channel",
    mod: "field1 … field8",
    body: "The bag publishes to a private cloud channel. Its read key is stored AES-256-GCM encrypted (utils/crypto.ts).",
  },
  {
    k: "Sync worker",
    mod: "workers/device-sync.worker.ts",
    body: "Every 15 s by default, one cycle at a time: a slow cycle is skipped, never overlapped. thingspeak.service.ts discovers the field labels and normalises each feed.",
  },
  {
    k: "PostgreSQL",
    mod: "Prisma · SensorReading",
    body: "Inserted with skipDuplicates on (device, entry id), so a re-sync never doubles the history.",
  },
  {
    k: "Alert engine",
    mod: "services/alert.service.ts",
    body: "Each reading, in time order, against the bag’s thresholds. If alerting fails, the readings are still stored.",
    hot: true,
  },
  {
    k: "Web and phone",
    mod: "React dashboard · Flutter app",
    body: "One API for both. The dashboard refreshes every 15 s; the phone app adds local alert notifications. Neither talks to ThingSpeak.",
  },
  {
    k: "Audit export",
    mod: "export.service.ts · pdf-builder.ts",
    body: "CSV, or a PDF from a zero-dependency PDF 1.4 generator, with every matching reading in the table.",
  },
];

/** The cold-compartment rule from alert.config.ts, drawn on a number line (−6 … 28). */
function ColdRule() {
  const lo = -6;
  const hi = 28;
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const zones = [
    { a: lo, b: -COLD_MARGIN, c: C.hot, o: 0.9, t: "critical" },
    { a: -COLD_MARGIN, b: 0, c: C.hot, o: 0.35, t: "warning" },
    { a: 0, b: COLD_MAX, c: C.two, o: 0.85, t: "in range" },
    { a: COLD_MAX, b: COLD_MAX + COLD_MARGIN, c: C.hot, o: 0.35, t: "warning" },
    { a: COLD_MAX + COLD_MARGIN, b: hi, c: C.hot, o: 0.9, t: "critical" },
  ];
  return (
    <figure className="flex h-full flex-col rounded-xl border border-current/12 p-5 md:p-6">
      <p className="t-label text-[var(--w-muted)]">Diagram · defaults in alert.config.ts</p>
      <h3 className="t-h3 mt-3">The cold-compartment rule</h3>
      <p className="mt-2 text-[0.92rem] leading-relaxed opacity-80">
        Outside 0–{COLD_MAX} °C is a warning. {COLD_MARGIN} °C further out is critical. Back inside the range, the alert resolves itself; an admin or operator can also resolve it by hand.
      </p>
      <div className="relative mt-8 pt-20 md:mt-10" aria-hidden="true">
        {/* the first reading in the replay below */}
        <div className="absolute top-2 -translate-x-full pr-2 text-right" style={{ left: `${pct(FIRST.f1)}%` }}>
          <p className="t-label whitespace-nowrap text-[0.6rem] text-apricot">first reading · {f1d(FIRST.f1)}</p>
          <p className="t-label whitespace-nowrap text-[0.6rem] text-[var(--w-muted)]">→ critical</p>
        </div>
        <span className="absolute top-2 h-[calc(100%-1.6rem)] w-px bg-apricot" style={{ left: `${pct(FIRST.f1)}%` }} />
        <div className="t-label relative mb-2 h-4 text-[0.58rem]">
          <span className="absolute -translate-x-1/2" style={{ left: `${pct(COLD_MAX / 2)}%`, color: C.two }}>
            in range
          </span>
          <span className="absolute hidden -translate-x-1/2 text-apricot/70 sm:inline" style={{ left: `${pct(COLD_MAX + COLD_MARGIN / 2)}%` }}>
            warn
          </span>
          <span className="absolute text-apricot" style={{ left: `${pct(COLD_MAX + COLD_MARGIN) + 2}%` }}>
            critical
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          {zones.map((z, k) => (
            <span key={k} style={{ width: `${pct(z.b) - pct(z.a)}%`, background: z.c, opacity: z.o }} />
          ))}
        </div>
        <div className="t-label relative mt-2 h-4 text-[0.58rem] tabular-nums text-[var(--w-muted)]">
          {[-COLD_MARGIN, 0, COLD_MAX, COLD_MAX + COLD_MARGIN].map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: `${pct(v)}%` }}>
              {v}
            </span>
          ))}
        </div>
      </div>
      <p className="t-label mt-8 border-t border-current/10 pt-4 text-[0.6rem] leading-relaxed text-[var(--w-muted)] md:mt-auto">Hot compartment 50–70 °C (margin 5) · humidity 20–85 % (margin 10) · per-bag thresholds override these</p>
    </figure>
  );
}

export function Pipeline({ project, n }: WorldProps) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      const st = { trigger: "[data-path]", start: "top 78%", end: "bottom 55%", scrub: 0.6 };
      mm.add("(min-width: 768px)", () => {
        gsap.fromTo("[data-line-h]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: st });
        gsap.fromTo("[data-spark-h]", { left: "0%" }, { left: "100%", ease: "none", scrollTrigger: st });
      });
      mm.add("(max-width: 767px)", () => {
        gsap.fromTo("[data-line-v]", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: st });
        gsap.fromTo("[data-spark-v]", { top: "0%" }, { top: "100%", ease: "none", scrollTrigger: st });
      });
      gsap.from("[data-stop]", { opacity: 0.18, stagger: 0.12, ease: "none", scrollTrigger: st });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} data-ground="dark" className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="path-title">
      <Label n={n?.[0] ?? "·"}>The signal path</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="path-title" className="t-h2 md:col-span-7">
          From a sensor in the bag to a line in the <span className="t-italic text-[var(--w-accent)]">audit</span> report.
        </h2>
        <p className="t-body opacity-80 md:col-span-4 md:col-start-9">
          Seven stops, named after the real modules. The phone and the dashboard only ever read the platform’s own database, never the device.
        </p>
      </div>

      <div data-path className="relative mt-16">
        {/* desktop: one horizontal line of signal */}
        <div aria-hidden="true" className="absolute inset-x-0 top-[0.3rem] hidden md:block">
          <div className="h-px bg-current opacity-15" />
          <div data-line-h className="absolute inset-x-0 top-0 h-px origin-left" style={{ background: `linear-gradient(90deg, ${C.two}, ${C.two} 60%, ${C.hot} 64%, ${C.two} 72%)` }} />
          <span data-spark-h className="absolute top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: "100%", background: C.two }} />
        </div>
        {/* phone: the same line, vertical */}
        <div aria-hidden="true" className="absolute bottom-2 left-[0.3rem] top-2 md:hidden">
          <div className="h-full w-px bg-current opacity-15" />
          <div data-line-v className="absolute inset-y-0 left-0 w-px origin-top" style={{ background: C.two }} />
          <span data-spark-v className="absolute left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ top: "100%", background: C.two }} />
        </div>

        <ol className="grid gap-9 pl-8 md:grid-cols-7 md:gap-5 md:pl-0">
          {STOPS.map((s, i) => (
            <li key={s.k} data-stop className="relative min-w-0">
              <span aria-hidden="true" className="absolute -left-8 top-[0.3rem] size-[0.62rem] -translate-x-[calc(50%-0.3rem-0.5px)] -translate-y-1/2 rounded-full border md:left-0 md:translate-x-0" style={{ borderColor: s.hot ? C.hot : C.two, background: project.world.bg }} />
              <p className="t-label pt-0 text-[var(--w-muted)] md:pt-6">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-1.5 font-display text-[1.35rem] font-light leading-tight tracking-[-0.02em] md:text-[1.25rem] lg:text-[1.45rem]">{s.k}</h3>
              <p className="mt-2 font-mono text-[0.68rem] leading-snug" style={{ color: s.hot ? C.hot : C.two }}>
                {s.mod.split(" · ").map((m) => (
                  <span key={m} className="block break-words">
                    {/* break module paths only after a "/", never inside a file name */}
                    {m.includes("/")
                      ? m.split("/").map((part, k, all) => (
                          <Fragment key={k}>
                            <span className="whitespace-nowrap">{k < all.length - 1 ? `${part}/` : part}</span>
                            {k < all.length - 1 && <wbr />}
                          </Fragment>
                        ))
                      : m}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-[0.88rem] leading-relaxed opacity-75">{s.body}</p>
              {s.hot && (
                <p className="t-label mt-3 flex flex-wrap gap-1.5 text-[0.58rem]">
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: `${C.hot}99`, color: C.hot }}>
                    warning
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[var(--w-bg)]" style={{ background: C.hot }}>
                    critical
                  </span>
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: `${C.two}99`, color: C.two }}>
                    auto-resolve
                  </span>
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* evidence: the object, the rule, the output */}
      <div className="mt-20 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-[1fr_1.35fr_1fr] md:gap-8">
        <figure>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-current/12">
            <Image src="/work/infinos-app/bag.jpg" alt="The INFINOS bag with its insulated cold compartment open and a white rack inside" fill sizes="(max-width: 768px) 50vw, 28vw" className="object-cover object-[50%_65%]" />
          </div>
          <figcaption className="t-label mt-3 text-[var(--w-muted)]">Real photo: the bag.</figcaption>
        </figure>
        <div className="order-last col-span-2 md:order-none md:col-span-1">
          <ColdRule />
        </div>
        <figure>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-current/12 bg-bone">
            <Image
              src="/work/infinos-app/report-page-1.jpg"
              alt="Page 1 of the generated PDF audit report: device information, a summary for Field 1 and Field 2, one critical cold-temperature-high alert, and the first rows of recorded readings"
              fill
              sizes="(max-width: 768px) 50vw, 28vw"
              className="object-cover object-top"
              style={{ filter: "grayscale(1) sepia(0.18) contrast(1.04)" }}
            />
          </div>
          <figcaption className="t-label mt-3 text-[var(--w-muted)]">Real page: the PDF audit report the app generated, 17 Sep 2026 (page 1 of 8, toned).</figcaption>
        </figure>
      </div>
    </section>
  );
}
