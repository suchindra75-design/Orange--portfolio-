import { PageShell } from "@/components/chrome/PageShell";
import { PageLink } from "@/components/chrome/Links";

export default function NotFound() {
  return (
    <PageShell ground="light" className="section flex min-h-[100svh] flex-col justify-end bg-pop pb-12 pt-[calc(var(--header-h)+2rem)] text-ink">
      <p className="sticker t-label mb-6 w-fit -rotate-3">404</p>
      <h1 className="t-name text-[clamp(3.4rem,11vw,10rem)] text-cream">
        Not built yet
      </h1>
      <p className="mt-6 max-w-[42ch] text-[1.1rem] leading-[1.5] text-ink/85">Not even spider-sense could find this page. The work is real, though.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <PageLink href="/projects" className="pill-ink t-label">
          See the projects →
        </PageLink>
        <PageLink href="/" className="sticker t-label">
          Home
        </PageLink>
      </div>
    </PageShell>
  );
}
