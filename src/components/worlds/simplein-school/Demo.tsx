import Image from "next/image";
import type { WorldProps } from "../types";
import { Label } from "@/components/project/ProjectPage";
import { Walkthrough } from "./Walkthrough";
import { factsOf } from "./facts";

/**
 * DEMO: the front door (the real sign-in gateway), then a short pinned walk through a 3D model
 * of the system that ends at the tenant-sealed core, where the isolation demo can be tried.
 */
export function Demo({ project, n }: WorldProps) {
  const live = project.links.find((l) => l.kind === "live");
  const { operations } = factsOf(project);
  return (
    <section data-ground="light" aria-labelledby="simplein-walk-title" className="pb-[clamp(3rem,8svh,6rem)]">
      <div className="section">
        <Label n={n?.[0] ?? "·"}>The demo</Label>
        <div className="mt-10 grid gap-12 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <h2 id="simplein-walk-title" className="t-h2">
              Walk in through the <span className="t-italic text-rust-ink">front door.</span>
            </h2>
            <p className="t-body mt-6 max-w-[34rem] opacity-80">
              Every visit starts at one sign-in gateway. Staff and families say who they are (administrator, faculty, parent or student) and each lands in a portal of their own.
              Below, scroll through a model of what sits behind that door, and try the wall between two schools at the end.
            </p>
            <ol className="mt-8 grid max-w-[30rem] border-t border-current/15">
              {[
                ["00", "The gateway", "Real screenshot"],
                ["01", "Four portals", "Model"],
                ["02", "One API", "Model"],
                ["03", "The sealed core", "Try it"],
              ].map(([n, t, k]) => (
                <li key={n} className="flex items-baseline gap-4 border-b border-current/15 py-2.5">
                  <span className="t-label text-[var(--w-accent)]">{n}</span>
                  <span className="flex-1 text-[1.02rem]">{t}</span>
                  <span className="t-label text-[var(--w-muted)]">{k}</span>
                </li>
              ))}
            </ol>
            {live && (
              <p className="mt-6 text-[0.95rem] opacity-80">
                <a href={live.url} target="_blank" rel="noreferrer" className="link-u text-rust-ink">
                  Try the staging demo yourself ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>{" "}
                · a fictional school, pre-launch.
              </p>
            )}
          </div>
          <figure className="md:col-span-5 md:col-start-8">
            <p className="t-label mb-3 flex items-center gap-3 text-[var(--w-muted)]">
              <span className="text-[var(--w-accent)]">00</span> The front door
            </p>
            <div className="mx-auto max-w-[30rem] overflow-hidden rounded-[10px] border border-current/12 bg-bone shadow-[0_40px_80px_-44px_rgba(26,18,22,0.55)]">
              <Image
                src="/work/simplein-school/gateway.webp"
                alt="The SIMPLEIN School ERP sign-in gateway: a persona picker (Administrator, Faculty, Parent, Student), the selected role, email and password fields and a sign-in button. The test email address is hidden."
                width={566}
                height={638}
                sizes="(max-width: 768px) 92vw, 30rem"
                className="block h-auto w-full"
              />
            </div>
            <figcaption className="t-label mx-auto mt-4 max-w-[30rem] text-[var(--w-muted)]">
              Real screenshot: the staff/family sign-in gateway (demo). Test sign-in address hidden.
            </figcaption>
          </figure>
        </div>
      </div>
      <div className="mt-[clamp(3rem,10svh,7rem)]">
        <Walkthrough colors={project.world} operations={operations} />
      </div>
    </section>
  );
}
