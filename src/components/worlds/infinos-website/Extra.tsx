"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Label } from "@/components/project/ProjectPage";
import { ScrollTrigger } from "@/lib/gsap";
import { IWStyles, s } from "./styles";
import type { WorldProps } from "../types";

const V = "/work/infinos-website/validation";
const R = "/work/infinos-website/range";

type Img = { src: string; w: number; h: number };
type Pair = { id: string; name: string; aspect: string; render: Img; photo: Img; note: string };

/** Clean pairs only, cropped from the project's validation sheets (no people, no tooling overlays). */
const PAIRS: Pair[] = [
  { id: "front", name: "Front", aspect: "4 / 5", render: { src: `${V}/front-render.webp`, w: 630, h: 500 }, photo: { src: `${V}/front-photo.webp`, w: 480, h: 558 }, note: "The quilted flap, the front panel and the badge." },
  { id: "display", name: "Display side", aspect: "4 / 5", render: { src: `${V}/display-render.webp`, w: 610, h: 500 }, photo: { src: `${V}/display-photo.webp`, w: 450, h: 560 }, note: "The on-board display and the biohazard panel." },
  { id: "left", name: "Left side", aspect: "4 / 5", render: { src: `${V}/left-render.webp`, w: 650, h: 500 }, photo: { src: `${V}/left-photo.webp`, w: 430, h: 560 }, note: "The two stacked chambers, from the left." },
  { id: "flap", name: "Quilted flap", aspect: "2 / 1", render: { src: `${V}/flap-render.webp`, w: 1240, h: 620 }, photo: { src: `${V}/flap-photo.webp`, w: 1304, h: 610 }, note: "Close up: the wave-quilted flap." },
  { id: "open", name: "Open", aspect: "4 / 5", render: { src: `${V}/open-render.webp`, w: 620, h: 620 }, photo: { src: `${V}/open-photo.webp`, w: 398, h: 620 }, note: "Lid up, lower door down, the orange lining inside." },
];

function Validation({ n }: { n?: string[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const pair = PAIRS[active];
  const wide = pair.aspect === "2 / 1";

  // Switching pairs changes this section's height (the wide flap pair is shorter), which moves every
  // scroll trigger below it, the demo's scrub included. Re-measure once the new pair has laid out.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    let next = active;
    if (k === "ArrowRight" || k === "ArrowDown") next = (active + 1) % PAIRS.length;
    else if (k === "ArrowLeft" || k === "ArrowUp") next = (active - 1 + PAIRS.length) % PAIRS.length;
    else if (k === "Home") next = 0;
    else if (k === "End") next = PAIRS.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section data-ground="light" className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="iw-rebuilt-title">
      <Label n={n?.[0] ?? "·"}>Model validation</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="iw-rebuilt-title" className="t-h2 md:col-span-7">
          Rebuilt from{" "}
          <span className="t-italic text-[var(--w-accent)]">13 photographs.</span>
        </h2>
        <p className="t-body max-w-[34rem] opacity-85 md:col-span-5 md:col-start-8">
          There was no manufacturer CAD. A Blender Python generator rebuilt the bag from the photographs, and each view was then checked side by side against them: the reconstruction on the left, the real bag on the right.
        </p>
      </div>

      <div role="tablist" aria-label="Validation views" onKeyDown={onKey} className="mt-12 flex gap-x-1 overflow-x-auto border-b border-current/15 [scrollbar-width:none] md:flex-wrap">
        {PAIRS.map((p, i) => {
          const on = i === active;
          return (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              id={`${uid}-tab-${p.id}`}
              aria-selected={on}
              aria-controls={`${uid}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              className={`t-label relative flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 transition-colors focus-visible:outline-offset-[-3px] ${on ? "border-[var(--w-accent)] text-[var(--w-ink)]" : "border-transparent text-[var(--w-muted)] hover:text-[var(--w-ink)]"}`}
            >
              <span className={on ? "text-[var(--w-accent)]" : ""}>{String(i + 1).padStart(2, "0")}</span>
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Portrait pairs: the diptych on eight columns, the note beside it on wide screens. */}
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${pair.id}`} className={`mt-8 grid gap-x-10 ${wide ? "" : "lg:grid-cols-12 lg:items-end"}`}>
        <div key={pair.id} className={`grid gap-3 sm:gap-5 ${wide ? "md:grid-cols-2" : "grid-cols-2 lg:col-span-8"} ${s.fadeIn}`}>
          {(["render", "photo"] as const).map((kind) => {
            const img = pair[kind];
            return (
              <figure key={kind} className="min-w-0">
                <div className={`relative overflow-hidden rounded-[4px] ${s.mount}`} style={{ aspectRatio: pair.aspect }}>
                  <Image
                    src={img.src}
                    alt={kind === "render" ? `The reconstructed 3D model of the bag, ${pair.name.toLowerCase()} view` : `Photograph of the real INFINOS bag, ${pair.name.toLowerCase()} view`}
                    fill
                    sizes={wide ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 32vw"}
                    className="object-contain p-[4%]"
                  />
                </div>
                <figcaption className="t-label mt-3 flex items-center gap-2 text-[var(--w-muted)]">
                  <span className="text-[var(--w-accent)]">{kind === "render" ? "A" : "B"}</span>
                  {kind === "render" ? "Reconstruction" : "Photograph"}
                  <span className="hidden sm:inline">{kind === "render" ? " · the site’s 3D model" : " · the real bag"}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <div className={`mt-6 grid gap-3 border-t border-current/15 pt-5 md:grid-cols-12 ${wide ? "" : "lg:col-span-4 lg:mb-9 lg:mt-0 lg:grid-cols-1 lg:gap-5"}`}>
          <p className={`font-display text-[clamp(1.15rem,1.6vw,1.45rem)] font-medium leading-snug md:col-span-6 ${wide ? "" : "lg:col-span-1"}`} style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}>
            {pair.note}
          </p>
          <p className={`t-label text-[var(--w-muted)] md:col-span-5 md:col-start-8 md:text-right ${wide ? "" : "lg:col-span-1 lg:col-start-1 lg:text-left"}`}>Real validation sheets from the build, cropped. Product © INFINOS Tech.</p>
        </div>
      </div>
    </section>
  );
}

const COOLANTS = [
  { id: "all", name: "All three", src: `${R}/coolants-fan.webp` },
  { id: "organic", name: "Organic", src: `${R}/coolants-fan-organic.webp` },
  { id: "inorganic", name: "Inorganic", src: `${R}/coolants-fan-inorganic.webp` },
  { id: "eutectic", name: "Eutectic", src: `${R}/coolants-fan-eutectic.webp` },
] as const;

/** Copy quoted from the live site’s product-range section. */
const PRO_POINTS = ["Dual-compartment bag configuration", "Zone 1 in the upper chamber", "Organised sub-compartments and a removable inner box", "PCM-based thermal management"];

function Range({ n }: { n?: string[] }) {
  const [c, setC] = useState(0);
  return (
    <section data-ground="light" className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="iw-range-title">
      <Label n={n?.[1] ?? "·"}>The range, rendered</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="iw-range-title" className="t-h2 md:col-span-7">
          A studio for one bag <span className="t-italic text-[var(--w-accent)]">and its coolants.</span>
        </h2>
        <p className="t-body max-w-[34rem] opacity-85 md:col-span-5 md:col-start-8">Product renders made for the live site, shown with the copy that sits beside them there, quoted as published.</p>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-current/12 bg-current/12 md:grid-cols-12">
        {/* The Pro Dual-Chamber Bag */}
        <article className="grid bg-[var(--w-bg)] md:col-span-5" aria-labelledby="iw-pro-title">
          <div className={`relative aspect-[4/5] overflow-hidden ${s.studio}`}>
            <Image src={`${R}/pro.webp`} alt="Render of the INFINOS Pro Dual-Chamber Bag, closed, three-quarter view" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-contain p-[12%_14%_6%] [mask-image:linear-gradient(to_bottom,#000_72%,transparent_97%)]" />
            <span className="t-label absolute left-5 top-5 text-[var(--w-muted)]">Render · © INFINOS Tech</span>
          </div>
          <div className="p-7 md:p-9">
            <p className="t-label text-[var(--w-accent)]">Product variant</p>
            <h3 id="iw-pro-title" className="mt-3 font-display text-[clamp(1.6rem,2.4vw,2.2rem)] font-light leading-[1.05] tracking-[-0.02em]">
              INFINOS Pro Dual-Chamber Bag
            </h3>
            <p className="t-body mt-3 opacity-80">A dual-compartment bag configuration for organised sample transportation, built on the flexible form factor.</p>
            <ol className="mt-6 grid gap-0 text-[0.95rem]">
              {PRO_POINTS.map((p, i) => (
                <li key={p} className="grid grid-cols-[2.5rem_1fr] border-t border-current/12 py-2.5">
                  <span className="t-label pt-0.5 text-[var(--w-accent)]">{String(i + 1).padStart(2, "0")}</span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        </article>

        {/* The coolant family */}
        <article className="grid content-start bg-[var(--w-bg)] md:col-span-7 md:grid-rows-[1fr_auto] md:content-stretch" aria-labelledby="iw-coolants-title">
          {/* On wide screens the render grows to meet the taller Pro tile, so the panel has no dead space. */}
          <div className={`relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[18rem] ${s.studio}`}>
            {COOLANTS.map((k, i) => (
              <Image
                key={k.id}
                src={k.src}
                alt={i === c ? (k.id === "all" ? "Render of the three INFINOS coolant packs, organic, inorganic and eutectic, fanned out" : `Render of the three INFINOS coolant packs, the ${k.name.toLowerCase()} pack pulled forward`) : ""}
                aria-hidden={i !== c}
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-contain transition-opacity duration-700 ease-[var(--ease-out-expo)]"
                style={{ opacity: i === c ? 1 : 0 }}
              />
            ))}
            <span className="t-label absolute left-5 top-5 text-[var(--w-muted)]">Render · © INFINOS Tech</span>
          </div>
          <div className="p-7 md:p-9">
            <p className="t-label text-[var(--w-accent)]">INFINOS coolants</p>
            <h3 id="iw-coolants-title" className="mt-3 font-display text-[clamp(1.6rem,2.4vw,2.2rem)] font-light leading-[1.05] tracking-[-0.02em]">
              Three coolant variants. One INFINOS coolant family.
            </h3>
            <div role="group" aria-label="Select a coolant" className="mt-6 flex flex-wrap gap-2">
              {COOLANTS.map((k, i) => (
                <button key={k.id} type="button" aria-pressed={i === c} onClick={() => setC(i)} className={`btn ${i === c ? "bg-[var(--w-ink)] text-[var(--w-bg)]" : "btn-ghost"}`}>
                  {k.name}
                </button>
              ))}
            </div>
            <p className="mt-6 border-l-2 border-[var(--w-accent)] pl-4 text-[0.95rem] leading-snug opacity-80">
              INFINOS uses PCM-based thermal management. “Cooling-duration figures will be published once testing is complete.”
            </p>
          </div>
        </article>
      </div>
      <p className="t-label mt-4 text-[var(--w-muted)]">Renders made for the live site · product copy quoted from infinoswebsite.vercel.app</p>
    </section>
  );
}

/** Extra: placed after "What I built". The validation story, then the product renders. */
export function Extra({ n }: WorldProps) {
  return (
    <>
      <IWStyles />
      <Validation n={n} />
      <Range n={n} />
    </>
  );
}
