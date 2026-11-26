import { site } from "@/content/site";
import { PageLink } from "@/components/chrome/Links";
import { Reveal } from "@/components/ui/Reveal";

/** Hello: a paper band, one paragraph with the human words highlighted, and the facts a reader scans for first. */
export function Intro() {
  const facts = [
    { k: "Now", v: `${site.current.role}, ${site.current.company}` },
    { k: "Before", v: `${site.previous[0].role}, ${site.previous[0].company}` },
    { k: "Studying", v: `${site.education.short}, ${site.education.schoolShort} · ${site.education.years}` },
    { k: "Builds", v: "AI assistants · full-stack apps · hardware-connected software" },
  ];
  return (
    <section id="intro" data-ground="dark" aria-labelledby="intro-title" className="relative bg-ink text-cream">
      <div className="section grid gap-12 py-[clamp(6rem,16svh,10rem)] lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="t-label text-cream/60">Hello, I’m {site.name.split(" ")[0]}</p>
          <Reveal as="h2" id="intro-title" className="t-name mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.98] tracking-[-0.04em]">
            I build what goes between an idea and a product that works.
          </Reveal>
          <p className="mt-8 max-w-[38rem] text-[1.1rem] leading-[1.6] text-cream/80">
            I think in whole systems: the <span className="hl">interface</span> someone touches, the <span className="hl">server and data</span> behind it, and sometimes the{" "}
            <span className="hl">circuit</span> under it. AI tools are part of how I build. I direct them, review every change, and own the result.
          </p>
          <PageLink href="/about" className="sticker t-label mt-8 !text-ink">
            More about me →
          </PageLink>
        </div>
        <dl className="grid content-end gap-0 border-t border-cream/15 lg:col-span-4 lg:border-t-0">
          {facts.map((f) => (
            <div key={f.k} className="grid grid-cols-[6rem_1fr] gap-3 border-b border-cream/12 py-3.5">
              <dt className="t-label pt-0.5 text-cream/50">{f.k}</dt>
              <dd className="text-[0.98rem] leading-snug">{f.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
