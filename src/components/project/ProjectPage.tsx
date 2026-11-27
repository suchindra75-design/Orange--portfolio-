import Image from "next/image";
import { ViewTransition, type CSSProperties } from "react";
import { nextProject, type Project, type Tone } from "@/content/projects";
import { worldFor } from "@/components/worlds/registry";
import { PageShell } from "@/components/chrome/PageShell";
import { PageLink, ProjectLink } from "@/components/chrome/Links";
import { Reveal } from "@/components/ui/Reveal";
import { Stack } from "./Stack";

const TONE: Record<Tone, string> = {
  live: "var(--color-verdigris)",
  dev: "var(--color-apricot)",
  concept: "var(--color-gold)",
  prelaunch: "var(--color-terracotta)",
  built: "var(--w-muted)",
};

export function StatusChip({ project }: { project: Project }) {
  const dashed = project.status.tone === "concept";
  return (
    <span className="t-label inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ border: `1px ${dashed ? "dashed" : "solid"} color-mix(in oklab, currentColor 30%, transparent)` }}>
      <span aria-hidden="true" className="inline-block size-1.5 rounded-full" style={{ background: TONE[project.status.tone] }} />
      {project.status.label}
    </span>
  );
}

/** Section heading used throughout the template: small label, hairline. Worlds reuse it. */
export function Label({ n, children }: { n: string; children: string }) {
  return (
    <p className="t-label flex items-center gap-4 text-[var(--w-muted)]">
      <span className="text-[var(--w-accent)]">{n}</span>
      <span>{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-current opacity-25" />
    </p>
  );
}

/**
 * THE PROJECT PAGE. One template; every project is its own "world": its colours come from
 * project.world, and its hero art, intro, demo and extra sections come from the world's parts.
 * Order: intro/hero → overview & idea → what I built → features → real screens → demo →
 * stack, links & notes → next project.
 */
export function ProjectPage({ project }: { project: Project }) {
  const w = worldFor(project.slug);
  const next = nextProject(project.slug);
  const nextW = worldFor(next.slug);
  const vars = {
    "--w-bg": project.world.bg,
    "--w-ink": project.world.ink,
    "--w-muted": project.world.muted,
    "--w-accent": project.world.accent,
    "--w-accent2": project.world.accent2,
    background: project.world.bg,
    color: project.world.ink,
  } as CSSProperties;
  const nextVars = { "--w-bg": next.world.bg, "--w-ink": next.world.ink, "--w-muted": next.world.muted, "--w-accent": next.world.accent, "--w-accent2": next.world.accent2 } as CSSProperties;
  const repo = project.links.find((l) => l.kind === "repo");
  const live = project.links.find((l) => l.kind === "live");
  let n = 0;
  const num = () => String(++n).padStart(2, "0");

  return (
    <PageShell ground={project.world.ground} style={vars} className="project">
      {/* ── Hero */}
      <section data-ground={project.world.ground} className="relative grid min-h-[100svh] grid-rows-[1fr_auto] overflow-hidden" aria-labelledby="project-title">
        <ViewTransition name={`visual-${project.slug}`} share="morph" default="none">
          <div className="absolute inset-0">
            <w.HeroVisual project={project} />
          </div>
        </ViewTransition>
        {/* Legibility scrim, tuned to the ground */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(to top, ${project.world.bg} 4%, color-mix(in oklab, ${project.world.bg} 55%, transparent) 38%, transparent 70%)` }} />
        <div className="relative z-[2] px-[var(--gutter)] pt-[calc(var(--header-h)+1rem)]">
          <PageLink href="/projects" className="t-label link-u text-[var(--w-muted)] hover:text-[var(--w-ink)]">
            ← All projects
          </PageLink>
        </div>
        <div className="relative z-[2] px-[var(--gutter)] pb-[clamp(2rem,6svh,4.5rem)]">
          <p className="t-label mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[var(--w-muted)]">
            <span className="text-[var(--w-accent)]">{project.index}</span>
            <span>{project.category}</span>
            {project.family && <span className="opacity-70">· {project.family}</span>}
          </p>
          <ViewTransition name={`title-${project.slug}`} share="morph" default="none">
            <h1 id="project-title" className={`t-name w-fit max-w-full tracking-[-0.05em] ${project.title.length > 14 ? "text-[clamp(2.8rem,7.2vw,8rem)]" : "text-[clamp(3.2rem,12vw,13rem)]"}`}>
              {project.title}
            </h1>
          </ViewTransition>
          <p className="mt-3 text-[clamp(1.4rem,2.6vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-[var(--w-accent)]">
            {project.subtitle}
          </p>
          <div className="mt-6 grid items-end gap-6 md:grid-cols-[minmax(0,40rem)_1fr]">
            <p className="t-lead max-w-[40rem] opacity-90">{project.oneLine}</p>
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <StatusChip project={project} />
              {live && (
                <a href={live.url} target="_blank" rel="noreferrer" className="btn" style={{ background: project.world.accent, color: project.world.ground === "dark" ? "#120A0F" : "#F2E9DD" }}>
                  {live.label} ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              {repo && (
                <a href={repo.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
                  {repo.label} ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── In 8 seconds: what a reviewer looks for first */}
      <section className="section pt-[clamp(3rem,8svh,5rem)]" aria-labelledby="eight-title">
        <p className="t-label flex items-center gap-4 text-[var(--w-muted)]">
          <span className="text-[var(--w-accent)]">00</span>
          <span id="eight-title">In 8 seconds</span>
          <span aria-hidden="true" className="h-px flex-1 bg-current opacity-25" />
        </p>
        <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["What it is", project.eight.what],
            ["What I did", project.eight.did],
            ["The hard part", project.eight.hard],
            ["What changed", project.eight.changed],
            ["Status", project.status.label],
          ].map(([k, v], i) => (
            <div key={k} className={`chunky-w p-6 md:p-7 ${i === 4 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <dt className="t-label text-[var(--w-muted)]">{k}</dt>
              <dd className="mt-3 text-[0.98rem] leading-[1.5]">{v}</dd>
            </div>
          ))}
        </dl>
        {project.numbers && (
          <ul className="mt-12 flex flex-wrap gap-x-[clamp(2rem,6vw,5rem)] gap-y-8">
            {project.numbers.map((n) => (
              <li key={n.label}>
                <p className="t-name text-[clamp(3.4rem,8vw,7.5rem)] tracking-[-0.05em]">{n.value}</p>
                <p className="t-label mt-3 text-[var(--w-muted)]">{n.label}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Overview: the idea, and why it's interesting */}
      <section className="section py-[clamp(5rem,12svh,9rem)]" aria-labelledby="idea-title">
        <Label n={num()}>The idea</Label>
        <div className="mt-10 grid gap-10 md:grid-cols-12">
          <Reveal as="h2" id="idea-title" className="font-sans text-[clamp(1.6rem,2.8vw,2.6rem)] font-semibold leading-[1.12] tracking-[-0.03em] md:col-span-7">
            {project.idea}
          </Reveal>
          <div className="md:col-span-4 md:col-start-9">
            <p className="t-label text-[var(--w-accent)]">Why it’s interesting</p>
            <p className="mt-3 text-[clamp(1.3rem,2vw,1.8rem)] font-medium leading-snug tracking-[-0.015em]">
              {project.hook}
            </p>
            <dl className="mt-8 grid gap-4 border-t border-current/15 pt-6 text-[0.95rem]">
              <div>
                <dt className="t-label text-[var(--w-muted)]">Role</dt>
                <dd className="mt-1">{project.role}</dd>
              </div>
              <div>
                <dt className="t-label text-[var(--w-muted)]">Status</dt>
                <dd className="mt-1">{project.status.label}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── What I built */}
      <section className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="built-title">
        <Label n={num()}>What I built</Label>
        <h2 id="built-title" className="sr-only">
          What I built
        </h2>
        <ol className="mt-10 grid gap-x-12 md:grid-cols-2">
          {project.built.map((b, i) => (
            <li key={i} className="grid grid-cols-[3rem_1fr] gap-2 border-t border-current/15 py-6">
              <span className="t-label pt-1 text-[var(--w-accent)]">{String(i + 1).padStart(2, "0")}</span>
              <p className="t-body max-w-[38rem] opacity-90">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Take it apart: the system, layer by layer (Explode & probe) */}
      <Stack project={project} n={num()} />

      {w.Extra && <w.Extra project={project} n={Array.from({ length: w.extraCount ?? 1 }, num)} />}

      {/* ── Features */}
      {project.features.length > 0 && (
        <section className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="features-title">
          <Label n={num()}>How it works</Label>
          <h2 id="features-title" className="sr-only">
            How it works
          </h2>
          <div className={`mt-10 grid gap-5 sm:grid-cols-2 ${project.features.length === 4 ? "" : "lg:grid-cols-3"}`}>
            {project.features.map((f, i, all) => {
              // Fill every row: 4 → 2×2; 5 → the first spans two; 1 → full width; odd counts on sm → the last spans.
              const k = all.length;
              const span = [k === 1 ? "sm:col-span-2 lg:col-span-3" : "", k % 3 === 2 && k !== 2 && i === 0 ? "lg:col-span-2" : "", k % 2 === 1 && i === k - 1 ? "sm:col-span-2 lg:col-span-1" : ""].join(" ");
              return (
              <div key={f.title} className={`chunky-w p-7 md:p-9 ${span}`}>
                <h3 className="t-h3">{f.title}</h3>
                <p className="t-body mt-3 opacity-80">{f.body}</p>
              </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Real screens */}
      {project.screens.length > 0 && (
        <section className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="screens-title">
          <Label n={num()}>Real screens</Label>
          <h2 id="screens-title" className="sr-only">
            Real screens
          </h2>
          <div className="mt-10 grid gap-10">
            {project.screens.map((s) => (
              <figure key={s.src}>
                <div className="overflow-hidden rounded-[22px] border-2 border-[var(--w-ink)] shadow-[0_12px_0_var(--w-ink)]">
                  <Image src={s.src} alt={s.alt} width={s.width} height={s.height} sizes="(max-width: 768px) 100vw, 90vw" className="h-auto w-full" />
                </div>
                <figcaption className="t-label mt-4 text-[var(--w-muted)]">{s.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ── The demo */}
      {w.Demo && <w.Demo project={project} n={[num()]} />}

      {/* ── Stack, links, notes */}
      <section className="section py-[clamp(5rem,12svh,9rem)]" aria-labelledby="stack-title">
        <Label n={num()}>Built with</Label>
        <div className="mt-10 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <h2 id="stack-title" className="sr-only">
              Built with
            </h2>
            <ul className="flex flex-wrap gap-2">
              {project.stack.map((s) => (
                <li key={s} className="pill t-label">
                  {s}
                </li>
              ))}
            </ul>
            {project.links.length > 0 && (
              <ul className="mt-10 grid gap-3">
                {project.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noreferrer" className="group inline-flex items-baseline gap-3 text-[1.1rem]">
                      <span className="t-label w-12 text-[var(--w-muted)]">{l.kind === "repo" ? "Code" : "Live"}</span>
                      <span className="link-u">{l.label}</span>
                      <span aria-hidden="true" className="text-[var(--w-accent)]">
                        ↗
                      </span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {project.notes.length > 0 && (
            <aside className="md:col-span-4 md:col-start-9" aria-label="Credits and notes">
              <p className="t-label text-[var(--w-muted)]">Credits &amp; notes</p>
              <ul className="mt-4 grid gap-4 text-[0.95rem] leading-relaxed opacity-80">
                {project.notes.map((t) => (
                  <li key={t} className="border-l border-current/25 pl-4">
                    {t}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </section>

      {/* ── Next project */}
      <section className="relative" style={{ ...nextVars, background: next.world.bg, color: next.world.ink }} data-ground={next.world.ground} aria-label="Next project">
        <ProjectLink href={`/projects/${next.slug}`} className="group relative block min-h-[70svh] overflow-hidden">
          <ViewTransition name={`visual-${next.slug}`} share="morph" default="none">
            <div className="absolute inset-0 opacity-70 transition-opacity duration-700 group-hover:opacity-100">
              <nextW.Mini project={next} />
            </div>
          </ViewTransition>
          <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(to top, ${next.world.bg} 10%, transparent 75%)` }} />
          {/* The next object on the bench, waiting to be picked up */}
          <div aria-hidden="true" className="next-object pointer-events-none absolute bottom-[clamp(1.5rem,6svh,4rem)] right-[var(--gutter)] w-[clamp(7rem,18vw,15rem)]">
            <Image src={`/bench/${next.slug}.webp`} alt="" width={280} height={280} sizes="(max-width: 768px) 30vw, 15rem" className="h-auto w-full" />
          </div>
          <div className="relative flex min-h-[70svh] flex-col justify-end px-[var(--gutter)] pb-[clamp(2rem,7svh,4.5rem)]">
            <p className="t-label opacity-70">Next project · {next.index}</p>
            <ViewTransition name={`title-${next.slug}`} share="morph" default="none">
              <p className="t-display mt-3 w-fit transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3">{next.title} →</p>
            </ViewTransition>
            <p className="t-label mt-3 opacity-70">{next.category}</p>
          </div>
        </ProjectLink>
        <div className="flex justify-between px-[var(--gutter)] py-6">
          <PageLink href="/projects" className="t-label link-u opacity-80">
            ← All projects
          </PageLink>
          <PageLink href="/" className="t-label link-u opacity-80">
            Home
          </PageLink>
        </div>
      </section>
    </PageShell>
  );
}
