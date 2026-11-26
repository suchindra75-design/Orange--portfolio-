"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/hooks";
import { site } from "@/content/site";
import { bom } from "@/content/profile";

/** The skills a recruiter scans for first, looked up in the résumé's bill of materials (never typed here). */
const TOP = ["Python", "JavaScript", "LLM API integration", "FastAPI", "Three.js", "ESP32"];
const SKILLS = TOP.filter((p) => bom.some((b) => b.part === p));

const EMAIL = site.links.find((l) => l.label === "Email")!;
const SOCIAL = site.links.filter((l) => l.label !== "Email" && l.href);

/* Card mechanics live here (not in globals): the 3D flip, and its reduced-motion crossfade.
   The crossfade's !important beats the global reduced-motion reset by specificity. */
const CSS = `
.badge-card{transform-style:preserve-3d;transition:transform .6s var(--ease-cine)}
.badge[data-flipped="true"] .badge-card{transform:rotateY(180deg)}
.badge-face{-webkit-backface-visibility:hidden;backface-visibility:hidden}
.badge-back{transform:rotateY(180deg)}
@media (prefers-reduced-motion: reduce){
  .badge-card,.badge[data-flipped="true"] .badge-card{transform:none;transition:none}
  .badge-back{transform:none}
  .badge-face{transition-property:opacity!important;transition-duration:.35s!important;transition-timing-function:ease!important}
  .badge[data-flipped="false"] .badge-back,.badge[data-flipped="true"] .badge-front{opacity:0}
}`;

/** A slot punched in the card, where the clip goes through. */
function Slot() {
  return <span aria-hidden="true" className="absolute left-1/2 top-3 h-2.5 w-12 -translate-x-1/2 rounded-full border-2 border-ink bg-pop" />;
}

/**
 * THE ID BADGE (bold colour): one chunky cream card hanging from an ink strand. The front is his
 * portrait as an ink print (his real photograph, engraved) with name and role; the back holds the
 * facts a recruiter scans for. Flip with the button, or click / Enter / Space on the card. A flip sets the strand
 * swinging a few degrees and settling (rAF only while it moves). Reduced motion: a crossfade, no swing.
 */
export function IdBadge() {
  const [flipped, setFlipped] = useState(false);
  const pend = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const swing = (dir: number) => {
    const el = pend.current;
    if (!el || prefersReducedMotion()) return;
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      const env = Math.exp(-t / 0.8);
      if (env < 0.02) {
        el.style.transform = "";
        raf.current = 0;
        return;
      }
      el.style.transform = `rotate(${(3.2 * dir * env * Math.sin((2 * Math.PI * t) / 1.3)).toFixed(3)}deg)`;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const flip = () => {
    swing(flipped ? -1 : 1);
    setFlipped((f) => !f);
  };

  const onCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    flip();
  };
  const onCardKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    flip();
  };

  const [first, ...rest] = site.name.split(" ");

  return (
    <div className="flex flex-col items-center">
      <style href="about-id-badge" precedence="default">
        {CSS}
      </style>

      {/* Everything that hangs: the strand, the clip and the card. It swings from the strand's top. */}
      <div ref={pend} className="flex origin-top flex-col items-center will-change-transform">
        <span aria-hidden="true" className="block h-[var(--strand,4rem)] w-[2px] bg-ink" />
        <span aria-hidden="true" className="relative z-[2] -mb-3 block h-6 w-4 rounded-[5px] border-2 border-ink bg-cream" />

        {/* Card group: a focusable stop that flips on Enter/Space (links inside keep their own keys). */}
        <div
          role="group"
          aria-label={`ID badge, ${flipped ? "back" : "front"}. Press Enter to flip.`}
          tabIndex={0}
          data-flipped={flipped}
          onClick={onCardClick}
          onKeyDown={onCardKey}
          className="badge relative w-[min(18.25rem,80vw)] lg:w-[clamp(16.75rem,22vw,19.5rem)] origin-top -rotate-2 cursor-pointer rounded-[22px] [perspective:1100px]"
        >
          <div className="badge-card grid grid-cols-1">
            {/* Sets the card's 5:8 shape; a face with more text grows both faces, so they always match. */}
            <span aria-hidden="true" className="invisible aspect-[5/8] w-full [grid-area:1/1]" />
            {/* ── FRONT */}
            <div inert={flipped} aria-hidden={flipped} className="badge-face badge-front relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border-2 border-ink bg-cream px-4 pt-7 text-ink shadow-[0_10px_0_var(--color-ink)] [grid-area:1/1]">
              <Slot />
              <div className="flex items-baseline justify-between">
                <span className="t-name text-[1.35rem] tracking-[-0.04em]">{site.initials}</span>
                <span className="t-label rounded-full border-2 border-ink px-2 py-px text-[0.6rem] font-bold">{site.current.company}</span>
              </div>
              <div className="relative mt-3 aspect-[4/4.3] overflow-hidden rounded-[12px] border-2 border-ink bg-[#ECE6DA]">
                <div className="absolute left-[-11%] top-[2%] aspect-[1808/2862] w-[118%]">
                  <Image src="/me/footer-ink.png" alt={`${site.name}: an ink print of his photograph`} fill sizes="(max-width: 1023px) 21rem, 23rem" className="object-contain" />
                </div>
              </div>
              <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-ink/60">Ink print · from a photograph</p>
              <p className="t-name mt-3 text-[clamp(1.75rem,2.4vw,2.1rem)] leading-[0.86] tracking-[-0.045em]">
                {first}
                <br />
                {rest.join(" ")}
              </p>
              <p className="t-label mt-2 text-ink/70">{site.role}</p>
              <p className="t-label mb-3.5 mt-auto flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 font-bold text-cream">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-pop" />
                Access: all projects
              </p>
            </div>

            {/* ── BACK: real text, read once it is the side showing */}
            <div inert={!flipped} aria-hidden={!flipped} className="badge-face badge-back relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border-2 border-ink bg-cream px-4 pt-7 text-ink shadow-[0_10px_0_var(--color-ink)] [grid-area:1/1]">
              <Slot />
              <div className="flex items-baseline justify-between">
                <span className="t-label text-ink/70">The facts</span>
                <span className="t-name text-[1.1rem] tracking-[-0.04em]">{site.initials}</span>
              </div>
              <dl className="mt-3 border-t-2 border-ink text-[0.78rem] leading-[1.35]">
                {([
                  ["Now", `${site.current.role}, ${site.current.company}`],
                  ["Before", `${site.previous[0].role}, ${site.previous[0].company}`],
                  [
                    "Studying",
                    <>
                      {site.education.degree}, {site.education.school} · <span className="whitespace-nowrap">{site.education.years}</span>
                    </>,
                  ],
                  ["Based", site.location],
                ] as [string, ReactNode][]).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[4.1rem_1fr] gap-2 border-b border-ink/15 py-[0.4rem]">
                    <dt className="pt-px font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink/60">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <div className="grid grid-cols-[4.1rem_1fr] gap-2 border-b border-ink/15 py-[0.4rem]">
                  <dt className="pt-px font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink/60">Reach</dt>
                  <dd className="grid gap-0.5">
                    <a href={EMAIL.href!} className="link-u w-fit break-all font-semibold">
                      {EMAIL.display}
                    </a>
                    {SOCIAL.map((l) => (
                      <a key={l.label} href={l.href!} target="_blank" rel="noreferrer" className="link-u w-fit">
                        {l.label} ↗<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ))}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink/60">Top skills</p>
              <ul className="mb-3 mt-1.5 flex flex-wrap gap-1.5">
                {SKILLS.map((s) => (
                  <li key={s} className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[0.7rem] font-semibold leading-tight">
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mb-3.5 mt-auto rounded-[12px] bg-ink px-3 py-2.5 font-mono text-[0.55rem] uppercase leading-snug tracking-[0.12em] text-cream/80">
                <span className="sr-only">Full name: </span>
                {site.fullName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <button type="button" onClick={flip} aria-pressed={flipped} aria-label="Flip badge: show the back" className="pill-ink t-label whitespace-nowrap transition-transform duration-300 hover:-translate-y-0.5">
          <span aria-hidden="true">↻</span>
          Flip badge
        </button>
        <span aria-live="polite" className="t-label whitespace-nowrap text-ink/75">
          {flipped ? "Back · the facts" : "Front · the print"}
        </span>
      </div>
    </div>
  );
}
