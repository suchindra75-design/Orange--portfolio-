import { site } from "@/content/site";
import { PageLink } from "@/components/chrome/Links";

/** The last word before the footer: a question, and the way to answer it. */
export function Invitation({ as: Tag = "h2", id = "invite-title" }: { as?: "h1" | "h2"; id?: string }) {
  const email = site.links.find((l) => l.label === "Email")!;
  const others = site.links.filter((l) => l.label !== "Email" && l.href);
  return (
    <section data-ground="light" aria-labelledby={id} className="relative overflow-hidden bg-cream text-ink">

      <div className="section relative grid min-h-[90svh] content-center gap-12 py-[clamp(6rem,14svh,10rem)] md:grid-cols-2">
        <Tag id={id} className="t-name self-center text-[clamp(2.8rem,6.4vw,6rem)] leading-[0.92] tracking-[-0.045em] md:pr-[4vw]">
          What should exist <span className="text-pop">next?</span>
        </Tag>
        <div className="self-center md:pl-[6vw]">
          <p className="t-body max-w-[26rem] text-ink/75">Curious ideas, ambitious collaborations, problems that look a little too hard. Bring them through.</p>
          <p className="t-label mt-10 text-ink/60">Write to me</p>
          <a href={email.href!} className="group mt-3 inline-flex items-baseline gap-3 font-display text-[clamp(1.6rem,3vw,2.6rem)] font-semibold tracking-[-0.03em] hover:text-pop">
            <span className="link-u">{email.display}</span>
            <span aria-hidden="true" className="text-pop transition-transform duration-500 group-hover:translate-x-1">
              →
            </span>
          </a>
          <div className="mt-8 flex flex-wrap gap-3">
            {others.map((l) => (
              <a key={l.label} href={l.href!} target="_blank" rel="noreferrer" className="pill-ink t-label">
                {l.label} ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
            {Tag === "h2" && (
              <PageLink href="/contact" className="pill-ink t-label">
                Contact page
              </PageLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
