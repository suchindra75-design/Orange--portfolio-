"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/project/ProjectPage";
import { useReducedMotion } from "@/lib/hooks";
import { BleChannel, CLOUD_SPEED, CloudChannel, drawBle, drawCloud, type Decimation, type Source } from "./engine";
import { PAPER, monoFamily, runCanvas } from "./signal";
import type { WorldProps } from "../types";

type Readout = { k: string; v: string }[];

const nf = (n: number) => n.toLocaleString("en-US");

function Seg<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <span className="t-label text-[var(--w-muted)]" aria-hidden="true">
        {label}
      </span>
      <div className="inline-flex rounded-full border border-current/20 p-[3px]">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`t-label rounded-full px-3 py-1.5 transition-colors duration-300 ${on ? "bg-[var(--w-ink)] text-[var(--w-bg)]" : "hover:bg-current/[0.06]"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Demo: "Two data rates". One simulated mask, read the two ways the app reads it.
 * Bluetooth streams in real time into a 30 s buffer; the cloud sends a packet about every
 * 17–20 s (shown 20× faster). Drop the link to see a gap kept as a gap; switch the drawing
 * to every n-th sample to see why the app draws min-max columns.
 */
export function Demo({ n }: WorldProps) {
  const reduced = useReducedMotion();
  const [source, setSource] = useState<Source>("bluetooth");
  const [bleWin, setBleWin] = useState(10);
  const [cloudWin, setCloudWin] = useState(10);
  const [decim, setDecim] = useState<Decimation>("minmax");
  const [playOverride, setPlayOverride] = useState<boolean | null>(null);
  const playing = playOverride ?? !reduced;
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("");
  const [readout, setReadout] = useState<Readout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eng = useRef<{ ble: BleChannel; cloud: CloudChannel } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!eng.current) eng.current = { ble: new BleChannel(), cloud: new CloudChannel() };
    const { ble, cloud } = eng.current;
    const font = monoFamily(canvas);
    let lastStats = -1e9;
    return runCanvas(canvas, {
      animate: playing,
      fps: 60,
      draw: ({ ctx, w, h, now, dt }) => {
        let r: Readout;
        if (source === "bluetooth") {
          ble.advance(dt);
          const st = drawBle(ctx, w, h, ble, bleWin, decim, font);
          if (now - lastStats < 250 && dt > 0) return;
          r = [
            { k: "Receive rate", v: `${ble.receivedHz().toFixed(1)} Hz measured` },
            { k: "In the window", v: `${nf(st.inWindow)} samples` },
            { k: "Drawn as", v: decim === "minmax" ? `${nf(st.drawn)} min–max columns` : `${nf(st.drawn)} points · n = ${Math.max(1, Math.ceil(st.inWindow / st.columns))}` },
            { k: "Gaps", v: ble.dropping ? `${ble.gapCount} · link down` : String(ble.gapCount) },
          ];
        } else {
          cloud.advance(dt * CLOUD_SPEED);
          const st = drawCloud(ctx, w, h, cloud, cloudWin, font, now);
          if (now - lastStats < 250 && dt > 0) return;
          const last = cloud.packets[cloud.packets.length - 1];
          r = [
            { k: "Latest packet", v: last ? `#${nf(last.seq)}` : "—" },
            { k: "Next packet", v: `in ~${Math.max(1, Math.round(cloud.wait().left))} s` },
            { k: "In the window", v: `${nf(st.inWindow)} packets` },
            { k: "Gaps", v: String(cloud.gapCount) },
          ];
        }
        lastStats = now;
        setReadout(r);
      },
    });
  }, [source, bleWin, cloudWin, decim, playing, version]);

  const isBle = source === "bluetooth";

  const pickSource = (s: Source) => {
    setSource(s);
    setStatus(s === "bluetooth" ? "Bluetooth: about 250 samples a second, in real time." : `Cloud: one packet about every 17 to 20 seconds, shown ${CLOUD_SPEED} times faster.`);
  };

  const drop = () => {
    const e = eng.current;
    if (!e) return;
    if (isBle) {
      e.ble.drop(1.5);
      if (!playing) e.ble.advance(3);
      setStatus("Bluetooth link dropped for 1.5 seconds. The gap stays visible; nothing is filled in.");
    } else {
      e.cloud.lose();
      if (!playing) e.cloud.catchUp();
      setStatus("One cloud packet lost. The trace breaks where it is missing instead of joining across.");
    }
    setVersion((v) => v + 1);
  };

  return (
    <section data-ground="light" className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="bm-demo-title">
      <Label n={n?.[0] ?? "·"}>The demo</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="bm-demo-title" className="t-h2 md:col-span-7">
          Two data rates, <span className="t-italic text-[var(--w-accent)]">one</span> view.
        </h2>
        <p className="t-body opacity-80 md:col-span-4 md:col-start-9">
          The Live EEG view reads either channel. Switch between them, drop the link and watch what happens to the gap, then draw thirty seconds the naive way and see the spikes go missing.
        </p>
      </div>

      <figure className="mt-12 overflow-hidden rounded-[6px] border border-current/15" style={{ background: PAPER.sheet }}>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-current/12 px-4 py-4 md:px-6">
          <Seg
            label="Source"
            value={source}
            onChange={pickSource}
            options={[
              { value: "bluetooth", label: "Bluetooth" },
              { value: "cloud", label: "Cloud" },
            ]}
          />
          {isBle ? (
            <Seg label="Window" value={bleWin} onChange={setBleWin} options={[5, 10, 30].map((v) => ({ value: v, label: `${v} s` }))} />
          ) : (
            <Seg label="Window" value={cloudWin} onChange={setCloudWin} options={[5, 10, 30].map((v) => ({ value: v, label: `${v} min` }))} />
          )}
          {isBle && (
            <Seg
              label="Draw"
              value={decim}
              onChange={setDecim}
              options={[
                { value: "minmax", label: "Min–max" },
                { value: "nth", label: "Every n-th" },
              ]}
            />
          )}
          <div className="flex items-center gap-2 md:ml-auto">
            <button type="button" onClick={drop} className="btn btn-ghost !px-4 !py-2.5">
              {isBle ? "Drop the link · 1.5 s" : "Lose a packet"}
            </button>
            <button type="button" onClick={() => setPlayOverride(!playing)} className="btn btn-ghost !px-4 !py-2.5">
              {playing ? "Pause" : "Play"}
            </button>
          </div>
        </div>

        <div className="relative h-[clamp(17rem,36vw,27rem)]">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block size-full"
            role="img"
            aria-label={
              isBle
                ? `Simulated Bluetooth oscilloscope: EEG and EOG traces over the last ${bleWin} seconds, streaming in real time.`
                : `Simulated cloud channel: one EEG and EOG value per packet over the last ${cloudWin} minutes, shown ${CLOUD_SPEED} times faster.`
            }
          />
        </div>

        <dl className="grid grid-cols-2 gap-px border-t border-current/12 md:grid-cols-5" style={{ background: "rgba(26,18,22,0.12)" }}>
          {[{ k: "Clock", v: isBle ? "Real time" : `Shown ${CLOUD_SPEED}× faster` }, ...(readout ?? [0, 1, 2, 3].map(() => ({ k: "·", v: "—" })))].map((r, i) => (
            <div key={i} className={`px-4 py-3 md:px-6 ${i === 4 ? "col-span-2 md:col-span-1" : ""}`} style={{ background: PAPER.sheet }}>
              <dt className="t-label text-[var(--w-muted)]">{r.k}</dt>
              <dd className="mt-1 font-mono text-[0.85rem] tabular-nums">{r.v}</dd>
            </div>
          ))}
        </dl>

        <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-current/12 px-4 py-4 md:px-6">
          <span className="sim sim-light max-w-full whitespace-normal">Simulated signal · illustrates the two data rates</span>
          <span className="text-[0.85rem] leading-snug text-[var(--w-muted)]">
            A synthetic EEG/EOG-like signal, not a recording. The rates, the 30 s buffer and the 100 ms gap rule are the app’s.
          </span>
        </figcaption>
      </figure>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      {/* The same thirty seconds, at the two rates. */}
      <div className="mt-14 grid gap-6 md:grid-cols-12">
        <p className="t-label text-[var(--w-muted)] md:col-span-3">The same thirty seconds</p>
        <div className="grid gap-5 md:col-span-9">
          <div className="grid grid-cols-[6.5rem_1fr] items-center gap-4 sm:grid-cols-[7rem_1fr_11rem]">
            <span className="t-label" style={{ color: PAPER.verdigris }}>
              Bluetooth
            </span>
            <span aria-hidden="true" className="h-5" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${PAPER.verdigris} 0 1px, transparent 1px 3px)` }} />
            <span className="col-start-2 font-mono text-[0.85rem] sm:col-start-auto">about 7,400 samples</span>
          </div>
          <div className="grid grid-cols-[6.5rem_1fr] items-center gap-4 sm:grid-cols-[7rem_1fr_11rem]">
            <span className="t-label">Cloud</span>
            <span aria-hidden="true" className="relative h-5">
              <span className="absolute inset-x-0 top-1/2 h-px bg-current opacity-25" />
              <span className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-current" style={{ left: "22%" }} />
              <span className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-current" style={{ left: "83%" }} />
            </span>
            <span className="col-start-2 font-mono text-[0.85rem] sm:col-start-auto">one or two packets</span>
          </div>
        </div>
      </div>
    </section>
  );
}
