import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { PageShell } from "@/components/chrome/PageShell";
import { PageLink } from "@/components/chrome/Links";
import { Reveal } from "@/components/ui/Reveal";
import { IdBadge } from "@/components/about/IdBadge";
import { site } from "@/content/site";
import { bom, experience, recognition, type BomGroup } from "@/content/profile";

export const metadata: Metadata = {
  title: "About",
  description: `${site.name}: ${site.role} at ${site.current.company}, ${site.education.short} student at ${site.education.schoolShort}. How I work, where I've worked, what I work with.`,
  alternates: { canonical: "/about" },
};

const GROUPS: BomGroup[] = ["Programming", "AI", "Software & 3D", "Embedded & IoT"];

const APPROACH: { k: string; t: ReactNode }[] = [
  {
    k: "Understand the problem",
    t: (
      <>
        Before choosing any tool, I work out what actually has to work, and <span className="hl">for whom</span>.
      </>
    ),
  },
  { k: "Combine the right tools", t: "Interfaces, servers, data, hardware and AI, chosen for the job rather than out of habit." },
  { k: "Then make it work", t: "Not a mock-up of an idea: something that runs, end to end, with the rough edges written down." },
];

/** Resting tilts for the chunky cards and stickers (degrees), cycled. */
const TILT = [-1.6, 1.2, -1, 1.4, -1.3, 1];
const tilt = (i: number) => ({ ["--tilt" as string]: `${TILT[i % TILT.length]}deg` }) as CSSProperties;

/** A section label: the number in a small outlined pill, then the words. */
function Eyebrow({ n, children, tone = "light" }: { n: string; children: ReactNode; tone?: "dark" | "light" }) {
  return (
    <p className={`t-label flex items-center gap-3 ${tone === "dark" ? "text-cream/65" : "text-ink/70"}`}>
      <span className={`rounded-full border-2 px-2 py-px font-bold ${tone === "dark" ? "border-pop text-pop" : "border-ink text-ink"}`}>{n}</span>
      <span>{children}</span>
    </p>
  );
}

const H2 = "t-name mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.98] tracking-[-0.04em]";
/** Each section after the hero is a sheet laid over the one before (as on the home page). */
const SHEET = "section relative -mt-10 rounded-t-[40px]";

/** ABOUT (bold colour): the name and the badge on orange, then sheets of cream, ink, orange and cream. */
export default function AboutPage() {
  const [first, ...rest] = site.name.split(" ");
  return (
    <PageShell ground="light" className="bg-pop text-ink">
      {/* ── Hero: the name in cream, the badge on its strand */}
      <section data-ground="light" aria-labelledby="about-title" className="section relative grid min-h-[100svh] gap-y-14 bg-pop pb-[clamp(5.5rem,13svh,8.5rem)] text-ink lg:grid-cols-12 lg:gap-x-8">
        <div className="flex min-w-0 flex-col justify-end pt-[calc(var(--header-h)+clamp(3rem,10svh,6rem))] lg:col-span-7 lg:pt-[calc(var(--header-h)+4rem)]">
          <p className="t-label text-ink/75">About</p>
          <h1 id="about-title" className="t-name mt-6 text-[clamp(3rem,14vw,9.5rem)] leading-[0.86] tracking-[-0.055em] text-cream lg:text-[clamp(5rem,9.2vw,9.5rem)]">
            {first}
            <br />
            {rest.join(" ")}
          </h1>
          <p className="mt-8 max-w-[34rem] text-[clamp(1.2rem,1.9vw,1.6rem)] font-semibold leading-[1.25] tracking-[-0.02em]">
            {site.role} at {site.current.company}, {site.education.short} student at {site.education.schoolShort}. I build software products, AI assistants, automation and hardware-connected apps,{" "}
            <span className="whitespace-nowrap rounded-[0.3em] border-2 border-ink bg-cream px-[0.25em]">end to end</span>.
          </p>
          <p className="t-label mt-7 text-ink/75">
            {site.fullName} · {site.location}
          </p>
        </div>
        <div
          className="flex justify-center lg:col-span-5 lg:items-start lg:justify-end lg:pr-[4%] lg:pt-[var(--header-h)]"
          style={{ ["--strand" as string]: "clamp(2.5rem, 8vw, 3.5rem)" } as CSSProperties}
        >
          <div className="lg:[--strand:clamp(2.5rem,7svh,4.5rem)]">
            <IdBadge />
          </div>
        </div>
      </section>

      {/* ── Approach (cream): three chunky cards */}
      <section data-ground="light" aria-labelledby="approach-title" className={`${SHEET} bg-cream py-[clamp(5.5rem,14svh,9rem)] text-ink`}>
        <Eyebrow n="01">The person behind the ideas</Eyebrow>
        <Reveal as="h2" id="approach-title" className={H2}>
          Understand it. Combine it. <span className="hl">Make it work.</span>
        </Reveal>
        <ol className="mt-14 grid gap-x-7 gap-y-10 md:grid-cols-3">
          {APPROACH.map((a, i) => (
            <li key={a.k} style={tilt(i)} className="card-tilt">
              <div className="chunky h-full p-6">
                <p className="t-label inline-flex size-9 items-center justify-center rounded-full border-2 border-ink bg-pop font-bold">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 text-[1.5rem] font-bold leading-[1.1] tracking-[-0.03em]">{a.k}</h3>
                <p className="t-body mt-3 text-ink/80">{a.t}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-16 max-w-[44rem] text-[1.15rem] font-medium leading-[1.55] tracking-[-0.01em] text-ink/85">
          I use {site.aiTools.slice(0, -1).join(", ")} and {site.aiTools.at(-1)} every day. They write code against my specs, and I decide what gets built, review every change and own the result.
        </p>
      </section>

      {/* ── Experience (ink) */}
      <section data-ground="dark" aria-labelledby="exp-title" className={`${SHEET} bg-ink py-[clamp(5.5rem,14svh,9rem)] text-cream`}>
        <Eyebrow n="02" tone="dark">
          Experience
        </Eyebrow>
        <h2 id="exp-title" className={H2}>
          Where I’ve worked
        </h2>
        <ol className="mt-12 grid">
          {experience.map((r) => (
            <li key={r.company} className="grid gap-5 border-t-2 border-cream/15 py-10 md:grid-cols-12">
              <div className="md:col-span-5">
                <h3 className="t-name text-[clamp(1.9rem,3.2vw,2.9rem)] leading-[0.95] tracking-[-0.04em]">{r.company}</h3>
                <p className="t-label mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-cream/65">
                  {r.current && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream bg-pop px-2.5 py-0.5 font-bold text-ink">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" />
                      Now
                    </span>
                  )}
                  <span>
                    {r.role}
                    {r.period ? ` · ${r.period}` : ""}
                  </span>
                </p>
              </div>
              <ul className="grid gap-3 md:col-span-7 md:col-start-6">
                {r.notes.map((n) => (
                  <li key={n} className="t-body relative pl-6 text-cream/85">
                    <span aria-hidden="true" className="absolute left-0 top-[0.62em] size-2 rounded-[2px] bg-pop" />
                    {n}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* ── What I work with (orange): each part a sticker, with where it shows up */}
      <section data-ground="light" aria-labelledby="skills-title" className={`${SHEET} bg-pop py-[clamp(5.5rem,14svh,9rem)] text-ink`}>
        <Eyebrow n="03">Skills, and where each one shows up</Eyebrow>
        <h2 id="skills-title" className={H2}>
          What I work with
        </h2>
        <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((g) => {
            const parts = bom.filter((b) => b.group === g);
            return (
              <div key={g}>
                <h3 className="flex items-center justify-between gap-3 border-b-2 border-ink pb-3">
                  <span className="text-[1.35rem] font-bold tracking-[-0.03em]">{g}</span>
                  <span className="t-label rounded-full bg-ink px-2 py-px font-bold text-cream">{String(parts.length).padStart(2, "0")}</span>
                </h3>
                <ul className="mt-6 grid gap-5">
                  {parts.map((b, i) => (
                    <li key={b.part}>
                      <p className="sticker px-3 py-1.5 text-[1rem] leading-tight tracking-[-0.01em] shadow-[0_4px_0_var(--color-ink)]" style={{ rotate: `${[-2, 1.5, -1, 2][i % 4]}deg` }}>
                        {b.part}
                      </p>
                      <p className="mt-2 pl-1 font-mono text-[0.74rem] leading-snug text-ink/80">{b.usedIn}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Education & recognition (cream) */}
      <section data-ground="light" aria-labelledby="edu-title" className={`${SHEET} grid gap-14 bg-cream py-[clamp(5.5rem,14svh,9rem)] text-ink md:grid-cols-2 md:gap-x-16`}>
        <div>
          <Eyebrow n="04">Education</Eyebrow>
          <div style={tilt(0)} className="card-tilt mt-8">
            <div className="chunky p-7">
              <h2 id="edu-title" className="t-name text-[clamp(1.9rem,3.2vw,3rem)] leading-[0.98] tracking-[-0.04em]">
                {site.education.degree}
              </h2>
              <p className="t-body mt-4 text-ink/75">
                {site.education.school} · <span className="whitespace-nowrap">{site.education.years}</span>
              </p>
            </div>
          </div>
        </div>
        <div>
          <Eyebrow n="05">Leadership &amp; recognition</Eyebrow>
          <h2 className="sr-only">Leadership and recognition</h2>
          <ul className="mt-8 grid gap-6">
            {recognition.map((r, i) => (
              <li key={r.title} style={tilt(i + 1)} className="card-tilt">
                <div className="chunky px-6 py-5 shadow-[0_8px_0_var(--color-ink)]">
                  <p className="text-[1.1rem] font-bold leading-snug tracking-[-0.015em]">{r.title}</p>
                  <p className="t-label mt-1.5 text-ink/65">
                    {r.org} · {r.period}
                  </p>
                  {r.note && <p className="t-body mt-1.5 text-[0.95rem] text-ink/75">{r.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t-2 border-ink/15 pt-10 md:col-span-2">
          <PageLink href="/projects" className="pill-ink t-label transition-transform duration-300 hover:-translate-y-0.5">
            See the work <span aria-hidden="true" className="text-pop">→</span>
          </PageLink>
          <p className="t-label text-ink/65">Every project, with what I built and how it works</p>
        </div>
      </section>
    </PageShell>
  );
}
