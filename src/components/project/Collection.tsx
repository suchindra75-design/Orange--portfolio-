import { ViewTransition } from "react";
import { alsoBuilt, mainProjects } from "@/content/projects";
import { worldFor } from "@/components/worlds/registry";
import { PageShell } from "@/components/chrome/PageShell";
import { ProjectLink } from "@/components/chrome/Links";
import { CardGrid } from "./CardGrid";

/** /projects: the six main projects as chunky cards on orange, then the side builds on cream. */
export function Collection() {
  return (
    <PageShell ground="light" className="bg-pop text-ink">
      <header className="section pb-14 pt-[calc(var(--header-h)+clamp(3rem,10svh,7rem))]" data-ground="light">
        <p className="t-label text-ink/70">The work · {mainProjects.length + alsoBuilt.length} projects</p>
        <h1 className="t-name mt-6 text-[clamp(3.4rem,11vw,10rem)] leading-[0.84] text-cream">
          Stuff I made
        </h1>
        <p className="mt-8 max-w-[38rem] text-[clamp(1.1rem,1.6vw,1.35rem)] leading-[1.4] text-ink/85">
          Software products, an AI assistant that acts on my computer, hardware-connected apps and the sites that explain them. Each one opens into its own world.
        </p>
      </header>
      <div className="section pb-[clamp(5rem,12svh,8rem)]" data-ground="light">
        <CardGrid projects={mainProjects} />
      </div>
      <section data-ground="light" className="section rounded-t-[40px] bg-cream pb-[clamp(6rem,16svh,11rem)] pt-[clamp(3rem,8svh,5rem)]" aria-labelledby="also-title">
        <h2 id="also-title" className="t-name text-[clamp(2rem,4vw,3.4rem)]">
          Also built
        </h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {alsoBuilt.map((p) => {
            const w = worldFor(p.slug);
            return (
              <li key={p.slug}>
                <ProjectLink href={`/projects/${p.slug}`} className="group grid grid-cols-[8rem_1fr] items-center gap-5 sm:grid-cols-[11rem_1fr]">
                  <ViewTransition name={`visual-${p.slug}`} share="morph" default="none">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] border-2 border-ink shadow-[0_6px_0_var(--color-ink)]">
                      <w.Mini project={p} />
                    </div>
                  </ViewTransition>
                  <div>
                    <ViewTransition name={`title-${p.slug}`} share="morph" default="none">
                      <h3 className="t-name w-fit text-[clamp(1.6rem,2.6vw,2.2rem)] tracking-[-0.035em] group-hover:text-pop">{p.title}</h3>
                    </ViewTransition>
                    <p className="t-label mt-2 text-ink/60">{p.category}</p>
                  </div>
                </ProjectLink>
              </li>
            );
          })}
        </ul>
      </section>
    </PageShell>
  );
}
