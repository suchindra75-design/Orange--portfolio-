"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { site } from "@/content/site";
import { mainProjects } from "@/content/projects";
import { scrollToTarget } from "@/lib/scroll";
import { PageLink, ProjectLink } from "@/components/chrome/Links";
import { Crowd } from "./Crowd";

/** Local time in Hyderabad. Ticks only while the footer is on screen. */
function useHydTime(ref: RefObject<HTMLElement | null>) {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
    const tick = () => setT(fmt.format(new Date()));
    let id = 0;
    const io = new IntersectionObserver(([entry]) => {
      window.clearInterval(id);
      id = 0;
      if (!entry.isIntersecting) return;
      tick();
      id = window.setInterval(tick, 15000);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [ref]);
  return t;
}

/**
 * The footer, on every page, in two layers.
 *   1. An ink information band: "See you around.", back to top, and three columns:
 *      how to reach me, the work, and where I am right now.
 *   2. The signature: an orange panorama, a drawn crowd, and the one real face at its centre.
 */
export function Footer() {
  const root = useRef<HTMLElement>(null);
  const time = useHydTime(root);
  const email = site.links.find((l) => l.label === "Email");
  const elsewhere = site.links.filter((l) => l.label !== "Email" && l.href);
  const first = site.name.split(" ")[0];

  return (
    <footer ref={root} id="site-footer" data-ground="dark" aria-labelledby="footer-title" className="relative z-[3] text-paper">
      {/* ── Layer 1: information */}
      <div className="-mt-10 rounded-t-[40px] bg-ink px-[var(--gutter)] pb-8 pt-[clamp(4rem,12svh,8rem)]">
        <div className="relative grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <h2 id="footer-title" className="t-name text-[clamp(3.4rem,9vw,8.5rem)] leading-[0.86] tracking-[-0.05em] text-paper">
            See you <span className="text-pop">around.</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              scrollToTarget(0, { duration: 2.2 });
              document.getElementById("main")?.focus({ preventScroll: true });
            }}
            className="group flex items-center gap-4 justify-self-start text-paper/80 transition-colors hover:text-paper md:mb-[1.2vw] md:flex-col md:justify-self-end"
          >
            <span className="relative grid size-[4.5rem] place-items-center rounded-full border-2 border-cream bg-cream text-ink shadow-[0_6px_0_var(--color-pop)] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_10px_0_var(--color-pop)] md:size-24">
              <svg aria-hidden="true" viewBox="0 0 16 28" className="h-7 w-4 overflow-visible text-ink transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5">
                <path d="M8 27 V2 M1.5 8.5 L8 2 L14.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="t-label">Back to top</span>
          </button>
        </div>

        <div className="mt-[8svh] grid gap-x-10 gap-y-12 border-t border-paper/12 pt-8 md:grid-cols-3 md:pt-10">
          <div>
            <p className="t-label text-paper/45">Say hello</p>
            {email?.href && (
              <a href={email.href} className="group mt-4 inline-flex items-baseline gap-2 font-display text-[clamp(1.35rem,2.1vw,1.9rem)] font-semibold leading-tight tracking-[-0.02em] text-paper hover:text-signal">
                <span className="link-u pb-0.5">{email.display}</span>
                <span aria-hidden="true" className="text-signal transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </a>
            )}
            <ul className="mt-5 grid gap-2">
              {elsewhere.map((l) => (
                <li key={l.label}>
                  <a href={l.href!} target="_blank" rel="noreferrer" className="group inline-flex items-baseline gap-3 text-[1.02rem] text-paper/80 hover:text-paper">
                    <span className="t-label w-[5.5rem] text-paper/40">{l.label}</span>
                    <span className="link-u">{l.display}</span>
                    <span aria-hidden="true" className="text-paper/40 group-hover:text-signal">
                      ↗
                    </span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="The work">
            <p className="t-label text-paper/45">The work</p>
            <ol className="mt-4 grid gap-1.5">
              {mainProjects.map((p) => (
                <li key={p.slug}>
                  <ProjectLink href={`/projects/${p.slug}`} className="group flex items-baseline gap-4 text-[1.02rem] text-paper/80 hover:text-paper">
                    <span className="t-label w-6 shrink-0 text-paper/35 group-hover:text-signal">{p.index}</span>
                    <span className="link-u">{p.title}</span>
                    <span className="t-label hidden text-paper/35 lg:inline">{p.subtitle}</span>
                  </ProjectLink>
                </li>
              ))}
            </ol>
            <p className="t-label mt-5 flex gap-5 text-paper/60">
              <PageLink href="/projects" className="link-u hover:text-paper">
                All projects
              </PageLink>
              <PageLink href="/about" className="link-u hover:text-paper">
                About
              </PageLink>
              <PageLink href="/contact" className="link-u hover:text-paper">
                Contact
              </PageLink>
            </p>
          </nav>

          <div>
            <p className="t-label text-paper/45">Right now</p>
            <p className="mt-4 text-[1.02rem] text-paper/85">
              {site.role} at {site.current.company}
            </p>
            <p className="mt-1 text-[1.02rem] text-paper/60">
              {site.education.short} · {site.education.schoolShort}
            </p>
            <p className="mt-5 flex items-center gap-3 text-[0.95rem] text-paper/60">
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-signal" />
              <span>
                {site.location} · <span className="tabular-nums">{time ?? "--:--"}</span> IST
              </span>
            </p>
          </div>
        </div>

        <div className="t-label mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-paper/35">
          <span>© {site.fullName}</span>
          <span>Designed &amp; built by me · Next.js, React Three Fiber &amp; GSAP</span>
        </div>
      </div>

      {/* ── Layer 2: the panorama */}
      <div data-ground="light">
        <Crowd name={first} />
      </div>
    </footer>
  );
}
