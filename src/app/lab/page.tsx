import type { Metadata } from "next";
import { PageShell } from "@/components/chrome/PageShell";
import { PageLink } from "@/components/chrome/Links";
import { PoseGraph } from "@/components/lab/PoseGraph";
import { Turntable } from "@/components/lab/Turntable";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Lab",
  description: `Experiments behind ${site.name}'s portfolio, opened up: the character's pose graph and the bench's printed 3D.`,
  alternates: { canonical: "/lab" },
};

const SHEET = "section relative -mt-10 rounded-t-[40px]";

/** THE LAB: the experiments this site is built on, opened up. Each runs the site's own code. */
export default function LabPage() {
  return (
    <PageShell ground="light" className="bg-pop text-ink">
      <section data-ground="light" aria-labelledby="lab-title" className="section relative bg-pop pb-[clamp(6rem,14svh,9rem)] pt-[calc(var(--header-h)+clamp(3rem,10svh,6rem))]">
        <p className="t-label text-ink/75">Lab</p>
        <h1 id="lab-title" className="t-name mt-6 text-[clamp(3.6rem,13vw,10rem)] leading-[0.86] tracking-[-0.055em] text-cream">
          Opened up
        </h1>
        <p className="mt-8 max-w-[38rem] text-[clamp(1.2rem,1.8vw,1.55rem)] font-semibold leading-snug tracking-[-0.015em]">
          Two experiments this site runs on, with the lid off. Same code, same frames, same materials: here you can poke at them.
        </p>
        <p className="t-label mt-6 text-ink/70">
          Back to <PageLink href="/" className="link-u">the bench</PageLink>
        </p>
      </section>

      <section data-ground="light" aria-labelledby="pose-title" className={`${SHEET} bg-cream py-[clamp(5rem,12svh,8rem)]`}>
        <p className="t-label flex items-center gap-3 text-ink/70">
          <span className="rounded-full border-2 border-ink px-2 py-px font-bold">01</span>
          <span>Pose graph</span>
        </p>
        <h2 id="pose-title" className="t-name mt-6 max-w-[20ch] text-[clamp(2.2rem,4.6vw,4.2rem)] leading-[0.98] tracking-[-0.04em]">
          How the character turns without ever faking a frame.
        </h2>
        <p className="mt-5 max-w-[44rem] text-[1.05rem] leading-relaxed text-ink/80">
          Every dot is a real frame from the video, placed where he looks in it: the angle around the ring, and how far he has turned out from the middle. Point anywhere. He takes the cheapest route there through frames that actually exist, one per screen refresh. The faint spokes are the direct turns from looking at you; the ring is the video&rsquo;s own order.
        </p>
        <div className="mt-12">
          <PoseGraph />
        </div>
      </section>

      <section data-ground="light" aria-labelledby="turn-title" className={`${SHEET} bg-pop py-[clamp(5rem,12svh,8rem)]`}>
        <p className="t-label flex items-center gap-3 text-ink/70">
          <span className="rounded-full border-2 border-ink px-2 py-px font-bold">02</span>
          <span>Turntable</span>
        </p>
        <h2 id="turn-title" className="t-name mt-6 max-w-[20ch] text-[clamp(2.2rem,4.6vw,4.2rem)] leading-[0.98] tracking-[-0.04em] text-cream">
          Pick anything up off the bench.
        </h2>
        <p className="mt-5 max-w-[44rem] text-[1.05rem] leading-relaxed">
          The same objects, builder and shader as the bench on the home page. Turn one over, then switch off what makes it look printed and see what&rsquo;s left. The objects are illustrations built in code; their screens show the projects&rsquo; real screenshots.
        </p>
        <div className="mt-12">
          <Turntable />
        </div>
      </section>
    </PageShell>
  );
}
