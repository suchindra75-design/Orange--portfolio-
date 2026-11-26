import { mainProjects } from "@/content/projects";
import { PageLink } from "@/components/chrome/Links";
import { CardGrid } from "@/components/project/CardGrid";

/** "Stuff I made": the six projects as chunky cards on cream. */
export function Worlds() {
  return (
    <section id="worlds" aria-labelledby="worlds-title" data-ground="light" className="section relative -mt-10 rounded-t-[40px] bg-cream pb-[clamp(5rem,14svh,9rem)] pt-[clamp(4rem,10svh,6.5rem)] text-ink">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <h2 id="worlds-title" className="t-name text-[clamp(3.2rem,8vw,7rem)] leading-[0.9]">
          Stuff I made
        </h2>
        <div className="max-w-[22rem]">
          <p className="text-[1.02rem] leading-[1.5] text-ink/75">Six projects, each with its own page: the real screens, the real code, and a demo you can try.</p>
          <PageLink href="/projects" className="pill-ink t-label mt-4">
            All projects →
          </PageLink>
        </div>
      </header>
      <CardGrid projects={mainProjects} />
    </section>
  );
}
