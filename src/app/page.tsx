import { PageShell } from "@/components/chrome/PageShell";
import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { Worlds } from "@/components/home/Worlds";
import { HowIBuild } from "@/components/home/HowIBuild";
import { Invitation } from "@/components/home/Invitation";
import { HashScroll } from "@/components/chrome/HashScroll";
import { site } from "@/content/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.fullName,
  alternateName: site.name,
  jobTitle: site.role,
  url: site.url,
  worksFor: { "@type": "Organization", name: site.current.company },
  address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressCountry: "IN" },
  sameAs: site.links.filter((l) => l.href?.startsWith("http")).map((l) => l.href),
  knowsAbout: ["Full-stack development", "AI assistants", "AI-assisted development", "IoT", "ESP32", "Three.js"],
};

/** HOME: the sticker hero, the projects, a hello, how I build, an invitation. (Footer lives in the layout.) */
export default function Home() {
  return (
    <PageShell ground="dark">
      <Hero />
      <Worlds />
      <Intro />
      <HowIBuild />
      <Invitation />
      <HashScroll />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </PageShell>
  );
}
