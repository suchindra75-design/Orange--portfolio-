"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { scrollToTarget } from "@/lib/scroll";
import { site } from "@/content/site";

const NAME = "SUCHINDRA";

/** Small line icons for the stickers (no emoji, no logos). */
const ICONS = {
  mic: <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-6 8a6 6 0 0 0 12 0M12 17v4" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  wave: <path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5" />,
};

function Sticker({ icon, children, className, rot }: { icon: keyof typeof ICONS; children: string; className: string; rot: number }) {
  return (
    <span data-sticker style={{ ["--rot" as string]: `${rot}deg` }} className={`sticker hero-sticker absolute z-[4] text-[clamp(0.85rem,1.25vw,1.15rem)] ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1em] fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </svg>
      {children}
    </span>
  );
}

/**
 * HOME HERO (bold colour): an orange page, the name set huge in cream, and the owner's real
 * photograph cut out like a sticker in front of it, with a few stickers saying what he builds.
 * The letters drop in, the photo pops up, the stickers slap on. Spider-sense: a brief tingle
 * beside his head when the cursor comes close.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const fig = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: "back.out(1.6)" } });
      tl.from("[data-letter]", { yPercent: 110, duration: 0.7, stagger: 0.045 }, 0.1)
        .from(fig.current, { yPercent: 18, scale: 0.92, autoAlpha: 0, duration: 0.8, ease: "back.out(1.3)" }, 0.35)
        .from("[data-sticker]", { scale: 0.4, autoAlpha: 0, duration: 0.55, stagger: 0.09 }, 0.75)
        .from("[data-lead]", { y: 24, autoAlpha: 0, duration: 0.6, ease: "power3.out" }, 0.8);
      // Leaving: the stickers drift a little faster than the page (a touch of depth, nothing more).
      gsap.to("[data-sticker]", { yPercent: -60, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 } });
    },
    { scope: root },
  );

  // Spider-sense near his head (mouse only, only while the hero is on screen).
  useEffect(() => {
    const wrap = fig.current!;
    if (prefersReducedMotion()) return;
    let on = false;
    let last = 0;
    let off = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = wrap.getBoundingClientRect();
      const cx = r.left + r.width * 0.505;
      const cy = r.top + r.height * 0.25;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < r.height * 0.18 && performance.now() - last > 3800) {
        last = performance.now();
        wrap.dataset.sense = "on";
        window.clearTimeout(off);
        off = window.setTimeout(() => (wrap.dataset.sense = "off"), 700);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting === on) return;
      on = e.isIntersecting;
      if (on) window.addEventListener("pointermove", onMove, { passive: true });
      else window.removeEventListener("pointermove", onMove);
    });
    io.observe(wrap);
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.clearTimeout(off);
    };
  }, []);

  return (
    <section ref={root} id="hero" data-ground="light" aria-labelledby="hero-name" className="relative h-[100svh] min-h-[600px] overflow-hidden bg-pop text-ink">
      {/* The name, huge, in cream */}
      <h1 id="hero-name" aria-label={site.name} className="t-name absolute inset-x-0 top-[calc(var(--header-h)+3svh)] z-[1] flex justify-center overflow-hidden whitespace-nowrap text-[min(19.6vw,40svh)] leading-[0.86] text-cream">
        {NAME.split("").map((c, i) => (
          <span key={i} aria-hidden="true" data-letter className="inline-block">
            {c}
          </span>
        ))}
      </h1>

      {/* His photograph, cut out like a sticker */}
      <div ref={fig} data-sense="off" className="absolute bottom-0 left-1/2 z-[3] aspect-[904/1431] h-[66svh] -translate-x-1/2 md:h-[80svh]">
        <Image src="/me/hero.png" alt={`${site.name}, smiling`} fill priority sizes="(max-width: 768px) 70vw, 34vw" className="sticker-cut object-contain object-bottom" />
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="sense-lines absolute left-1/2 top-[8%] h-[30%] w-[70%] -translate-x-1/2 overflow-visible">
          <g fill="none" stroke="var(--color-ink)" strokeLinecap="round">
            {[20, 38].map((y) => (
              <g key={y}>
                <path d={`M4 ${y} q-3 2.4 0 4.8 q3 2.4 0 4.8 q-3 2.4 0 4.8`} vectorEffect="non-scaling-stroke" strokeWidth="2.4" />
                <path d={`M96 ${y} q3 2.4 0 4.8 q-3 2.4 0 4.8 q3 2.4 0 4.8`} vectorEffect="non-scaling-stroke" strokeWidth="2.4" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* What he builds, as stickers */}
      <Sticker icon="mic" rot={-8} className="left-[18%] top-[47%] max-md:left-[4%] max-md:top-[44%]">
        AI assistants
      </Sticker>
      <Sticker icon="bolt" rot={7} className="right-[19%] top-[40%] max-md:right-[4%] max-md:top-[37%]">
        ESP32 + hardware
      </Sticker>
      <Sticker icon="wave" rot={-4} className="right-[14%] top-[62%] max-md:right-[3%] max-md:top-[56%]">
        EEG over Bluetooth
      </Sticker>

      {/* The line */}
      <div data-lead className="absolute bottom-[clamp(1.5rem,6svh,3.5rem)] left-[var(--gutter)] z-[5] max-w-[24rem] max-md:hidden">
        <p className="text-[clamp(1.3rem,1.9vw,1.75rem)] font-semibold leading-[1.18] tracking-[-0.02em]">Full stack dev who builds things that talk, sense and ship.</p>
        <p className="t-label mt-4">
          {site.location.split(",")[0]} · {site.current.company}
        </p>
      </div>
      <button type="button" onClick={() => scrollToTarget("#worlds", { duration: 1.4 })} className="pill-ink t-label absolute bottom-[clamp(1.5rem,6svh,3.5rem)] right-[var(--gutter)] z-[5] max-md:hidden">
        See the work ↓
      </button>
    </section>
  );
}
