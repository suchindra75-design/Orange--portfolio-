import type { WorldProps } from "../types";
import { Label } from "@/components/project/ProjectPage";
import { factsOf } from "./facts";

const italic = { fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' } as const;

/**
 * EXTRA, "Scale": the audited numbers set as a typographic panel, each with what it means.
 * Every number comes from projects.ts (see facts.ts).
 */
export function Scale({ project, n }: WorldProps) {
  const f = factsOf(project);
  const pg = f.tests.find((t) => t.name === "pgTAP")?.value;
  const items = [
    f.operations && {
      n: f.operations,
      unit: "API operations",
      body: "Every portal reaches the data through one versioned REST API under /api/v1, described by a generated OpenAPI spec.",
    },
    f.tables && { n: f.tables, unit: "tables", body: "Every table that holds a school’s data carries that school, and row-level security is switched on for all of them." },
    f.policies && {
      n: f.policies,
      unit: "policies",
      body: "The rules live in Postgres itself: which role may read or write which rows. The database refuses what the app should never ask for.",
      wall: true,
    },
    pg && { n: pg, unit: "pgTAP assertions", body: "Database tests that act as users of two schools and try to cross the wall. The recorded run passed every one." },
  ].filter(Boolean) as { n: string; unit: string; body: string; wall?: boolean }[];

  return (
    <section className="section pb-[clamp(5rem,12svh,9rem)]" aria-labelledby="simplein-scale-title">
      <Label n={n?.[0] ?? "·"}>Scale</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="simplein-scale-title" className="t-h2 text-balance md:col-span-7">
          Big enough to need rules, and <span className="t-italic text-rust-ink">tested</span> like it.
        </h2>
        <p className="t-body max-w-[30rem] opacity-75 md:col-span-4 md:col-start-9">
          Counted in the codebase and its recorded test runs. One platform, four portals, and a database that keeps each school to itself.
        </p>
      </div>

      <dl className="mt-14 grid border-t border-current/20 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <div
            key={it.unit}
            className={`flex flex-col border-b border-current/15 py-8 sm:pr-8 lg:border-b-0 lg:py-10 ${i > 0 ? "lg:border-l lg:pl-8" : ""} ${i % 2 === 1 ? "sm:border-l sm:pl-8 lg:pl-8" : ""}`}
          >
            <dt className="t-label order-2 mt-5 flex items-center gap-3 text-[var(--w-muted)]">
              {it.wall && <span aria-hidden="true" className="inline-block h-3 w-[3px] bg-[var(--w-accent)]" />}
              {it.unit}
            </dt>
            <dd
              className="order-1 font-display text-[clamp(3.6rem,7.4vw,7.5rem)] font-light leading-[0.82] tracking-[-0.05em]"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
            >
              {it.n.includes("/") ? (
                <>
                  {it.n.split("/")[0]}
                  <span className="t-italic text-[0.42em] tracking-[-0.02em] text-[var(--w-accent2)]" style={italic}>
                    /{it.n.split("/")[1]}
                  </span>
                </>
              ) : (
                it.n
              )}
            </dd>
            <dd className="t-body order-3 mt-3 max-w-[22rem] opacity-80">{it.body}</dd>
          </div>
        ))}
      </dl>

      {f.tests.length > 0 && (
        <div className="mt-12 grid gap-6 md:grid-cols-12 md:items-baseline">
          <p className="t-label text-[var(--w-muted)] md:col-span-3">Recorded test runs · all passed</p>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4 md:col-span-9">
            {f.tests.map((t) => {
              const [a, b] = t.value.split("/");
              return (
                <li key={t.name} className="border-t border-[var(--w-accent2)] pt-3">
                  <p className="t-label text-[var(--w-muted)]">{t.name}</p>
                  <p className="mt-1 font-display text-[clamp(1.6rem,2.4vw,2.2rem)] font-light leading-none tracking-[-0.03em]">
                    {a}
                    <span className="opacity-45">/{b}</span>
                    <span className="sr-only"> passed</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
