"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { site } from "@/content/site";

const STEPS = [
  { k: "Idea", t: "Start from a problem worth solving, and who it’s for." },
  { k: "Think", t: "Decide what must work, and what must never break." },
  { k: "Build", t: "Architecture first, then the parts: interface, server, data, hardware." },
  { k: "Collaborate", t: "AI tools implement modules against my specs. I review every change." },
  { k: "Refine", t: "Test, measure, fix, until it holds up." },
  { k: "Realise", t: "Ship it, verify it end to end, and write down what isn’t done yet." },
];

/** Six words on one line of light. A point of light travels it as you scroll past. One screen, no pin. */
export function HowIBuild() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const st = { trigger: root.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 };
      gsap.fromTo("[data-line]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: st });
      gsap.fromTo("[data-spark]", { left: "0%" }, { left: "100%", ease: "none", scrollTrigger: st });
      gsap.from("[data-step]", { opacity: 0.15, stagger: 0.12, ease: "none", scrollTrigger: st });
    },
    { scope: root },
  );
  return (
    <section ref={root} data-ground="light" aria-labelledby="how-title" className="section bg-pop py-[clamp(6rem,16svh,10rem)] text-ink">
      <p className="t-label text-ink/70">How I build</p>
      <h2 id="how-title" className="t-name mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.98] tracking-[-0.04em]">
        I direct the process. AI is a <span className="text-cream">powerful partner</span> in it.
      </h2>
      <div className="relative mt-16 hidden md:block" aria-hidden="true">
        <div data-line className="h-px origin-left bg-gradient-to-r from-ink/40 via-ink/70 to-ink" />
        <span data-spark className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream border-2 border-ink" />
      </div>
      <ol className="mt-8 grid gap-8 md:grid-cols-6 md:gap-6">
        {STEPS.map((s, i) => (
          <li key={s.k} data-step className="border-t border-ink/20 pt-5 md:border-0 md:pt-0">
            <p className="t-label text-ink/60">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mt-2 text-[1.6rem] font-bold tracking-[-0.03em]">{s.k}</h3>
            <p className="t-body mt-2 text-[0.95rem] text-ink/80">{s.t}</p>
          </li>
        ))}
      </ol>
      <div className="mt-16 flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <span className="t-label text-ink/70">Tools I direct</span>
        {site.aiTools.map((t, i) => (
          <span key={t} className="sticker text-[clamp(1rem,1.4vw,1.2rem)]" style={{ rotate: `${[-3, 2, -2, 3][i % 4]}deg` }}>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
