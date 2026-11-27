import { mainProjects, projects } from "@/content/projects";
import { PageLink } from "@/components/chrome/Links";
import { CardGrid } from "@/components/project/CardGrid";
import { Tray } from "./Tray";

/**
 * "Stuff I made". Phones get the tray (every project's object from the bench, swiped); tablets and
 * desktops without the bench get the six main projects as chunky cards. Where the 3D bench shows
 * (desktop with a mouse), this section is hidden: the bench is the project list.
 */
export function Worlds() {
  return (
    <section id="worlds" aria-labelledby="worlds-title" data-ground="light" className="section relative -mt-10 rounded-t-[40px] bg-cream pb-[clamp(5rem,14svh,9rem)] pt-[clamp(4rem,10svh,6.5rem)] text-ink">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6 max-md:mb-7">
        <h2 id="worlds-title" className="t-name text-[clamp(3.2rem,8vw,7rem)] leading-[0.9]">
          Stuff I made
        </h2>
        <div className="max-w-[22rem]">
          <p className="text-[1.02rem] leading-[1.5] text-ink/75">
            <span className="md:hidden">{projects.length} projects on my bench, each with its own page: the real screens, the real code, and a demo you can try.</span>
            <span className="max-md:hidden">Six projects, each with its own page: the real screens, the real code, and a demo you can try.</span>
          </p>
          <PageLink href="/projects" className="pill-ink t-label mt-4">
            All projects →
          </PageLink>
        </div>
      </header>
      <div className="md:hidden">
        <Tray />
      </div>
      <div className="max-md:hidden">
        <CardGrid projects={mainProjects} />
      </div>
    </section>
  );
}
