"use client";

import { useId, useState } from "react";
import { Label } from "@/components/project/ProjectPage";
import { PAPER } from "./signal";
import { runParser, type Pair } from "./parser";
import type { WorldProps } from "../types";

const TRACKS = [
  {
    key: "A",
    name: "Bluetooth LE",
    rate: "about 250 samples a second",
    feeds: "Feeds the Live EEG view only",
    color: PAPER.verdigris,
    rail: "wave" as const,
    stations: [
      { title: "Nordic UART", body: "Text notifications from the mask: EEG,EOG;EEG,EOG;…" },
      { title: "Fragment-safe parser", body: "Split readings are carried over; malformed tokens are counted, never thrown." },
      { title: "30-second ring buffer", body: "Nominal 256 Hz, 7,680 samples. Silences over 100 ms are counted as gaps, never filled." },
      { title: "Live EEG", body: "An oscilloscope with 5, 10 and 30-second windows and a measured receive rate." },
    ],
  },
  {
    key: "B",
    name: "Cloud channel",
    rate: "one packet about every 17\u2060–\u206020\u00a0s",
    feeds: "Feeds history, tables and every report",
    color: PAPER.ink,
    rail: "dots" as const,
    stations: [
      { title: "ThingSpeak", body: "Six fields per packet: EEG, EOG, eye movements, artefacts, sample count, recording time." },
      { title: "Express backend", body: "Pages through the full history, with caching and rate limiting." },
      { title: "Overview · History · Table", body: "Min-max decimation and percentile scaling keep long recordings fast without hiding spikes." },
      { title: "Reports", body: "PDF, CSV and the custom CSB archive, in UTC, with real gaps left visible." },
    ],
  },
];

function Rail({ kind, color }: { kind: "wave" | "dots"; color: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden="true" className="absolute inset-x-0 top-0 hidden h-6 w-full md:block" preserveAspectRatio="none">
      {kind === "wave" ? (
        <>
          <defs>
            <pattern id={`w${id}`} width="22" height="24" patternUnits="userSpaceOnUse">
              <path d="M0 12 C2 4 4 4 5.5 12 S9 19 11 12 S14 6 15.5 12 S18 17 19 12 S21 9 22 12" fill="none" stroke={color} strokeWidth="1.1" />
            </pattern>
          </defs>
          <rect width="100%" height="24" fill={`url(#w${id})`} />
        </>
      ) : (
        <>
          <line x1="0" x2="100%" y1="12" y2="12" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
          {[6, 22, 38, 54, 70, 86].map((x) => (
            <circle key={x} cx={`${x}%`} cy="12" r="2.4" fill={color} />
          ))}
        </>
      )}
    </svg>
  );
}

const PAYLOAD = "12,-3;15,-2;18,1;14,4";

const fmt = (p: Pair) => `(${p.eeg}, ${String(p.eog).replace("-", "−")})`;

function SplitPacket() {
  const [at, setAt] = useState(13);
  const a = PAYLOAD.slice(0, at);
  const b = PAYLOAD.slice(at);
  const steps = runParser([a, b]);
  const total = steps.reduce((n, s) => n + s.pairs.length, 0);
  const bad = steps.reduce((n, s) => n + s.malformed, 0);
  const rangeId = useId();

  return (
    <div className="mt-20 grid gap-10 md:grid-cols-12">
      <div className="md:col-span-4">
        <h3 className="t-h3">A reading split in two</h3>
        <p className="t-body mt-3 max-w-[30rem] opacity-80">
          A Bluetooth notification can end in the middle of a reading. The parser keeps the fragment and finishes it with the next notification. Move the split: the four readings still come out whole.
        </p>
        <p className="t-label mt-5 text-[var(--w-muted)]">The app’s parsing rules, re-run in your browser · example payload</p>
      </div>
      <div className="md:col-span-8">
        <p className="overflow-hidden whitespace-nowrap font-mono text-[clamp(1.05rem,3.6vw,2.2rem)] tracking-tight" aria-hidden="true">
          <span>{a}</span>
          <span className="mx-[0.15em] inline-block h-[1.1em] w-[2px] translate-y-[0.18em]" style={{ background: PAPER.oxblood }} />
          <span className="text-[var(--w-muted)]">{b}</span>
        </p>
        <label htmlFor={rangeId} className="t-label mt-5 block text-[var(--w-muted)]">
          Split the payload after character {at} of {PAYLOAD.length}
        </label>
        <input
          id={rangeId}
          type="range"
          min={1}
          max={PAYLOAD.length - 1}
          value={at}
          onChange={(e) => setAt(Number(e.target.value))}
          className="mt-3 w-full"
          style={{ accentColor: PAPER.oxblood }}
          aria-valuetext={`Notification 1: ${a}. Notification 2: ${b}.`}
        />
        <div className="mt-8 border-t border-current/15">
          <div className="hidden grid-cols-[8rem_1fr_1.3fr_6rem] gap-4 py-3 md:grid">
            {["Notification", "Text received", "Readings emitted", "Kept"].map((h) => (
              <span key={h} className="t-label text-[var(--w-muted)]">
                {h}
              </span>
            ))}
          </div>
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-1 border-t border-current/10 py-4 md:grid-cols-[8rem_1fr_1.3fr_6rem] md:items-baseline">
              <span className="t-label" style={{ color: PAPER.oxblood }}>
                No. {i + 1}
              </span>
              <code className="font-mono text-[0.95rem]">
                {i === 1 && steps[0].carry && <span className="rounded-[3px] px-1 py-0.5" style={{ background: "rgba(122,36,48,0.1)", color: PAPER.oxblood }}>{steps[0].carry}</span>}
                {s.chunk}
              </code>
              <span className="t-label text-[var(--w-muted)] md:hidden">Emitted</span>
              <span className="font-mono text-[0.95rem]" style={{ color: PAPER.verdigris }}>
                {s.pairs.length ? s.pairs.map(fmt).join("  ") : "—"}
              </span>
              <span className="t-label text-[var(--w-muted)] md:hidden">Kept</span>
              <code className="font-mono text-[0.95rem]">{s.carry ? `“${s.carry}”` : "nothing"}</code>
            </div>
          ))}
          <output className="t-label block border-t border-current/15 pt-4" aria-live="polite">
            {total} of 4 readings recovered · {bad} malformed
          </output>
        </div>
      </div>
    </div>
  );
}

/** Extra (after "What I built"): the two data paths, and the parser surviving a split notification. */
export function Paths({ n }: WorldProps) {
  return (
    <section className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="bm-paths-title">
      <Label n={n?.[0] ?? "·"}>Two paths</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="bm-paths-title" className="t-h2 md:col-span-7">
          One mask, <span className="t-italic text-[var(--w-accent)]">two</span> roads to the screen.
        </h2>
        <p className="t-body opacity-80 md:col-span-4 md:col-start-9">
          The sleep mask (BioAmp_Sleep, not my hardware) reaches the app two ways. Bluetooth is fast and passing: it feeds the live view. The cloud is slow and complete: history and reports come from it.
        </p>
      </div>
      <div className="mt-14 border-t border-current/15">
        {TRACKS.map((tr) => (
          <div key={tr.key} className="grid gap-8 border-b border-current/15 py-10 md:grid-cols-12">
            <div className="md:col-span-3">
              <p className="t-label" style={{ color: tr.color }}>
                {tr.key} · {tr.name}
              </p>
              <p className="mt-3 font-display text-[clamp(1.35rem,2vw,1.8rem)] font-medium leading-tight" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}>
                {tr.rate}
              </p>
              <p className="t-label mt-3 text-[var(--w-muted)]">{tr.feeds}</p>
            </div>
            <ol className="relative grid gap-x-8 gap-y-6 sm:grid-cols-2 md:col-span-9 md:grid-cols-4 md:pt-12">
              <Rail kind={tr.rail} color={tr.color} />
              {tr.stations.map((st, i) => (
                <li key={st.title} className="border-l border-current/20 pl-4 md:border-l-0 md:pl-0">
                  <p className="t-label text-[var(--w-muted)]">
                    {tr.key}
                    {i + 1}
                  </p>
                  <h3 className="mt-1 text-[1.05rem] font-semibold leading-snug tracking-[-0.01em]">{st.title}</h3>
                  <p className="mt-2 text-[0.93rem] leading-relaxed opacity-75">{st.body}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <SplitPacket />
    </section>
  );
}
