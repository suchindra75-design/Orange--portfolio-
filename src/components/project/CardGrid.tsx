import { ViewTransition } from "react";
import type { Project, Tone } from "@/content/projects";
import { worldFor } from "@/components/worlds/registry";
import { ProjectLink } from "@/components/chrome/Links";
import { Settle } from "./Settle";

const TONE: Record<Tone, string> = { live: "#2FA36B", dev: "#FF5A1F", concept: "#E8A317", prelaunch: "#B5573A", built: "#8A7A6C" };
const TILT = [-1.6, 1.2, -1, 1.4, -1.3, 1];

/**
 * Projects as chunky, slightly tilted cards (bold-colour style). Each card carries the project's
 * live preview, its name, one line and its status; hover straightens and lifts it, and cards below
 * the fold settle onto their tilt as they scroll in (Settle). The preview and
 * title morph into the project page when it opens.
 */
export function CardGrid({ projects }: { projects: Project[] }) {
  return (
    <Settle className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p, i) => {
        const w = worldFor(p.slug);
        return (
          <li key={p.slug} style={{ ["--tilt" as string]: `${TILT[i % TILT.length]}deg` }} className="card-tilt">
            <ProjectLink href={`/projects/${p.slug}`} className="chunky group block overflow-hidden">
              <ViewTransition name={`visual-${p.slug}`} share="morph" default="none">
                <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-ink" style={{ background: p.world.bg }}>
                  <w.Mini project={p} />
                </div>
              </ViewTransition>
              <div className="p-5">
                <p className="t-label flex items-center justify-between gap-3 text-muted">
                  <span>{p.index} · {p.category}</span>
                </p>
                <ViewTransition name={`title-${p.slug}`} share="morph" default="none">
                  <h3 className="t-name mt-2 w-fit text-[clamp(1.7rem,2.4vw,2.2rem)] leading-none tracking-[-0.04em]">{p.title}</h3>
                </ViewTransition>
                <p className="mt-1 text-[1rem] font-medium text-ink/70">{p.subtitle}</p>
                <p className="mt-3 line-clamp-3 text-[0.95rem] leading-[1.45] text-ink/80">{p.oneLine}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="t-label inline-flex items-center gap-2 rounded-full border-2 border-ink px-2.5 py-1">
                    <i aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: TONE[p.status.tone] }} />
                    {p.status.label}
                  </span>
                  <span className="t-label inline-flex items-center gap-1 font-bold transition-transform duration-300 group-hover:translate-x-1">Open →</span>
                </div>
              </div>
            </ProjectLink>
          </li>
        );
      })}
    </Settle>
  );
}
