"use client";

import { useRef, useState } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { scrollToTarget } from "@/lib/scroll";
import { world, useWorld } from "@/lib/store";
import { SimpleinStage } from "@/components/world/stages";
import { ROLES, SEG, setLinkedTenant, simpleinLink } from "./plan";
import { PlanSvg, type PlanColors } from "./PlanSvg";

/* ═════════════ Sample data for the isolation demo (a reconstruction, not live data) ═════════════ */

const TENANTS = [
  {
    name: "School A",
    rows: [
      ["Class 8-A", "Attendance", "28 / 30"],
      ["Class 8-A", "Homework", "Algebra set 4"],
      ["Class 9-B", "Notice", "Science fair, Friday"],
    ],
  },
  {
    name: "School B",
    rows: [
      ["Grade 5", "Attendance", "22 / 24"],
      ["Grade 6", "Exam", "Unit test 2 marks"],
      ["Grade 5", "Fee record", "Term 2 receipt"],
    ],
  },
] as const;

/* ═════════════ Beat windows (progress across the pinned walk) ═════════════ */

const FADE = 0.018;
const BEATS: { id: string; nav: string; win: [number, number] }[] = [
  { id: "intro", nav: "Plan", win: [-1, 0.085] },
  { id: "wings", nav: "Portals", win: [SEG.wings[0] + 0.03, SEG.wings[1] - 0.005] },
  { id: "api", nav: "API", win: [SEG.api[0] + 0.035, SEG.api[1] + 0.005] },
  { id: "core", nav: "Tenants", win: [SEG.core[0] + 0.05, 2] },
];
const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
/** Fully visible from a to b − FADE; fades in over [a − FADE, a]. a ≤ 0 = shown at the start, b ≥ 1 = holds to the end. */
const visibility = ([a, b]: [number, number], p: number) => (a <= 0 ? 1 : smooth(a - FADE, a, p)) * (b >= 1 ? 1 : 1 - smooth(b - FADE, b, p));
/** Which wing the camera is at (0…3). */
const wingAt = (p: number) => Math.min(3, Math.max(0, Math.floor(((p - SEG.wings[0]) / (SEG.wings[1] - SEG.wings[0])) * 4)));

/**
 * THE WALK: a pinned 300 svh section over the 3D model of the system (SimpleinStage). The copy
 * changes beat by beat as the camera moves: the plan, the four role portals (one wing each),
 * the API passage, and the tenant-sealed core with a working isolation demo, which holds at
 * the end. Visibility is written straight to the DOM from one ScrollTrigger (no React state on
 * scroll). Without WebGL the same walk runs over the 2D plan.
 */
export function Walkthrough({ colors, operations }: { colors: PlanColors; operations?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const plan = useRef<SVGSVGElement>(null);
  const [tenant, setTenant] = useState<0 | 1>(() => simpleinLink.tenant);
  const [probe, setProbe] = useState(false);
  const webgl = useWorld((s) => s.webgl);

  const choose = (t: 0 | 1) => {
    setTenant(t);
    setProbe(false);
    setLinkedTenant(t);
    world.set({}); // wakes the on-demand canvas so the vaults move
  };

  /** Scroll position (px) where a beat is fully shown. */
  const beatTop = (i: number) => {
    const el = root.current;
    if (!el) return 0;
    const [a, b] = BEATS[i].win;
    const p = a <= 0 ? 0 : b >= 1 ? Math.min(1, a + 0.12) : a + (b - FADE - a) * 0.3;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return top + p * Math.max(0, el.offsetHeight - window.innerHeight);
  };

  useGSAP(
    () => {
      const el = root.current!;
      const beats = Array.from(el.querySelectorAll<HTMLElement>("[data-beat]"));
      const navs = Array.from(el.querySelectorAll<HTMLElement>("[data-nav]"));
      const roles = Array.from(el.querySelectorAll<HTMLElement>("[data-role]"));
      const controls = beats.map((b) => Array.from(b.querySelectorAll<HTMLElement>("a,button")));
      const reduced = prefersReducedMotion();
      let last = -1;
      let lastWing = "-";
      const apply = (p: number) => {
        let best = 0;
        let bestV = 0;
        beats.forEach((b, i) => {
          const v = visibility(BEATS[i].win, p);
          b.style.opacity = v.toFixed(3);
          b.style.transform = reduced || v > 0.999 ? "" : `translate3d(0, ${((1 - v) * 18).toFixed(1)}px, 0)`;
          const off = v < 0.06;
          if (off !== b.hasAttribute("data-off")) {
            b.toggleAttribute("data-off", off);
            // Inline, because the unlayered `.act a, .act button { pointer-events: auto }` outranks utilities.
            controls[i].forEach((c) => (c.style.pointerEvents = off ? "none" : ""));
          }
          if (v > bestV + 0.05) {
            bestV = v;
            best = i;
          }
        });
        if (best !== last) {
          last = best;
          navs.forEach((n, i) => (i === best ? n.setAttribute("aria-current", "step") : n.removeAttribute("aria-current")));
        }
        const k = wingAt(p);
        const key = p >= SEG.wings[0] && p < SEG.api[0] ? String(k) : "";
        if (key !== lastWing) {
          lastWing = key;
          roles.forEach((r, i) => r.toggleAttribute("data-active", i === k));
          plan.current?.setAttribute("data-wing", key);
        }
      };
      const st = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: (s) => apply(s.progress), onRefresh: (s) => apply(s.progress) });
      apply(st.progress);

      // Keyboard users tabbing into a beat that isn't on screen are taken to it.
      const onFocus = (e: FocusEvent) => {
        const beat = (e.target as HTMLElement).closest<HTMLElement>("[data-beat]");
        if (!beat || !beat.hasAttribute("data-off")) return;
        scrollToTarget(beatTop(beats.indexOf(beat)), { duration: 1.2 });
      };
      el.addEventListener("focusin", onFocus);
      return () => el.removeEventListener("focusin", onFocus);
    },
    { scope: root },
  );

  const beat = "absolute inset-0 flex px-[var(--gutter)] will-change-[opacity,transform]";
  // Phones: the copy sits low over a soft bone wash; the model frames itself in the top half.
  const wash = "max-md:bg-[linear-gradient(to_top,var(--color-bone)_0%,color-mix(in_oklab,var(--color-bone)_90%,transparent)_64%,transparent_100%)]";
  // Wider screens: soft bone light from the left keeps the copy clear of the walls behind it.
  const dwash =
    "md:bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-bone)_78%,transparent)_0%,color-mix(in_oklab,var(--color-bone)_50%,transparent)_28%,transparent_48%)]";
  const panel = `-mx-[var(--gutter)] w-[calc(100%+2*var(--gutter))] px-[var(--gutter)] md:mx-0 md:w-auto md:p-0 ${wash}`;
  const accent = "t-italic text-rust-ink";
  const other = TENANTS[1 - tenant].name;

  return (
    <div className="relative">
      <SimpleinStage />
      <div ref={root} data-act="simplein" className={`act h-[300svh] text-ink ${webgl ? "" : "bg-bone"}`}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Without WebGL: the same walk over the 2D plan */}
          {!webgl && (
            <PlanSvg
              variant="fallback"
              svgRef={plan}
              colors={colors}
              className="absolute right-[-10vw] top-[4svh] h-[62svh] w-[120vw] md:right-[-4vw] md:top-[8svh] md:h-[84svh] md:w-[64vw]"
            />
          )}
          {/* Soft edges where the model meets the page */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[9svh]"
            style={{ background: `linear-gradient(to bottom, ${colors.bg}, transparent)` }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[7svh]"
            style={{ background: `linear-gradient(to top, ${colors.bg}, transparent)` }}
          />

          {/* ── 1 · The plan ── */}
          <div data-beat className={`${beat} ${dwash} items-end md:items-center`}>
            <div className={`${panel} pb-[9svh] pt-24 md:max-w-[30rem] md:pb-0`}>
              <p className="t-label text-ink/60">Walkthrough · a model of the system, not a screen</p>
              <h3 className="t-h2 mt-5">
                Four wings around a <span className={accent}>sealed</span> core.
              </h3>
              <p className="t-body mt-5 max-w-[34ch] text-ink/75">
                Each role gets a wing, with one room for every module it uses. Every wing reaches the data through the same passage, and the data sits in vaults that open only for
                their own school.
              </p>
              <p className="t-label mt-7 flex items-center gap-3 text-ink/55">
                <span aria-hidden="true" className="inline-block h-6 w-px bg-current" />
                Scroll to walk through
              </p>
            </div>
          </div>

          {/* ── 2 · The four portals (one panel; the camera's wing is the one that's lit) ── */}
          <div data-beat className={`${beat} ${dwash} items-end md:items-center`}>
            <div className={`${panel} pb-[6svh] pt-16 md:max-w-[27rem] md:pb-0`}>
              <p className="t-label text-ink/60">The wings · four portals</p>
              <ol className="mt-5 grid">
                {ROLES.map((r, k) => (
                  <li key={r.name} data-role className="group border-t border-ink/15 py-2.5 md:py-3">
                    <div className="flex items-baseline gap-4">
                      <span className="t-label w-8 text-ink/40 transition-colors duration-500 group-data-[active]:text-rust-ink">{String(k + 1).padStart(2, "0")}</span>
                      <h3 className="font-display text-[clamp(1.6rem,2.6vw,2.4rem)] font-light leading-none tracking-[-0.03em] text-ink/35 transition-colors duration-500 group-data-[active]:text-ink">
                        <span className={k === 0 ? "" : "t-italic"}>{r.name}</span>
                      </h3>
                    </div>
                    <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)] group-data-[active]:grid-rows-[1fr]">
                      <div className="overflow-hidden pl-12">
                        <p className="t-body pt-2 text-ink/80">{r.line}</p>
                        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pb-1" aria-label={`${r.name} modules`}>
                          {r.modules.map((m, i) => (
                            <li key={m} className="t-label text-ink/65">
                              <span className="text-ink/35">
                                {r.code}·{String(i + 1).padStart(2, "0")}
                              </span>{" "}
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* ── 3 · The API passage ── */}
          <div data-beat className={`${beat} ${dwash} items-end md:items-center`}>
            <div className={`${panel} pb-[7svh] pt-16 md:max-w-[27rem] md:pb-0`}>
              <p className="t-label text-ink/60">The passage · /api/v1</p>
              <h3 className="t-h2 mt-4">
                One way to the <span className={accent}>data.</span>
              </h3>
              <p className="t-body mt-4 text-ink/75">
                Every wing reaches the database through one REST API
                {operations ? (
                  <>
                    : <b className="font-semibold text-ink">{operations} operations</b>,
                  </>
                ) : (
                  ","
                )}{" "}
                described by a generated OpenAPI spec. A request meets three gates:
              </p>
              <ol className="t-label mt-5 flex flex-wrap items-center gap-2 text-ink/75">
                {["Auth", "RBAC", "Tenant guard"].map((g, i) => (
                  <li key={g} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true">→</span>}
                    <span className="rounded-full border border-ink/25 px-2.5 py-1">{g}</span>
                  </li>
                ))}
              </ol>
              <p className="t-body mt-5 text-ink/65">
                The school comes only from the session; no endpoint accepts one. Dashboards just shape what each role sees, the API enforces the rules, and shared Zod schemas
                validate the UI and the API alike.
              </p>
            </div>
          </div>

          {/* ── 4 · The core: tenant isolation, as a working demo ── */}
          <div data-beat className={`${beat} ${dwash} items-end md:items-center`}>
            <div className={`${panel} pb-[4svh] pt-10 md:max-w-[29rem] md:pb-0`}>
              <p className="t-label text-ink/60">The core · Postgres row-level security</p>
              <h3 className="t-h2 mt-3">
                Every school, <span className={accent}>sealed.</span>
              </h3>
              <p className="t-body mt-3 max-w-[36ch] text-ink/75 max-md:hidden">
                Each school is a tenant. The wall between them is a policy in the database itself. Sign in to either school and try to reach the other.
              </p>

              <div className="plate-light mt-5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <span className="t-label whitespace-nowrap text-ink/60">Signed in to</span>
                  <span className="sim sim-light">Reconstruction · sample data</span>
                </div>
                <div role="group" aria-label="Signed-in school" className="mt-3 flex gap-2">
                  {TENANTS.map((t, i) => (
                    <button
                      key={t.name}
                      type="button"
                      aria-pressed={tenant === i}
                      onClick={() => choose(i as 0 | 1)}
                      className={`btn px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust-ink ${tenant === i ? "bg-ink text-bone" : "btn-ghost text-ink/75"}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
                <table className="mt-4 w-full table-fixed border-collapse font-mono text-[0.72rem] sm:text-[0.78rem]">
                  <caption className="sr-only">Rows the API returns while signed in to {TENANTS[tenant].name}</caption>
                  <thead>
                    <tr className="t-label text-left text-ink/45">
                      <th scope="col" className="w-[28%] pb-1.5 font-medium">
                        Class
                      </th>
                      <th scope="col" className="w-[30%] pb-1.5 font-medium">
                        Record
                      </th>
                      <th scope="col" className="pb-1.5 font-medium">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TENANTS[tenant].rows.map((row) => (
                      <tr key={row.join()} className="border-t border-ink/10">
                        {row.map((c) => (
                          <td key={c} className="truncate py-1.5 pr-2">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 border-t border-ink/10 pt-3">
                  <button
                    type="button"
                    onClick={() => setProbe(true)}
                    className="t-label link-u text-rust-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rust-ink"
                  >
                    Ask for a {other} student’s attendance →
                  </button>
                  <p aria-live="polite" className="mt-2 min-h-[2.6em] text-[0.82rem] leading-snug text-ink/70">
                    {probe ? (
                      <>
                        <span className="font-mono text-[0.76rem] text-ink">
                          GET /api/v1/attendance/students/… <span className="text-rust-ink">→ 404 Not found</span>
                        </span>
                        <br />
                        404, not 403: the API won’t even confirm that the record exists.
                      </>
                    ) : (
                      <>{other}’s rows never leave the database: the policy filters them out before the API sees them.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Where you are on the walk (desktop): a quiet index along the foot of the frame ── */}
          <nav aria-label="Walkthrough" className="absolute bottom-6 right-[var(--gutter)] hidden lg:block">
            <ol className="flex gap-5 border-t border-ink/15 pt-3">
              {BEATS.map((b, i) => (
                <li key={b.id}>
                  <button
                    type="button"
                    data-nav
                    onClick={() => scrollToTarget(beatTop(i), { duration: 1.4 })}
                    className="t-label text-ink/45 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rust-ink aria-[current]:text-ink"
                  >
                    {b.nav}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
}
