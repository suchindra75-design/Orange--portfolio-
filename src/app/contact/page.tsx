import type { Metadata } from "next";
import { PageShell } from "@/components/chrome/PageShell";
import { Invitation } from "@/components/home/Invitation";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Write to ${site.name}: new work, collaborations and ideas.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell ground="light" className="bg-cream pt-[var(--header-h)]">
      <Invitation as="h1" id="contact-page-title" />
    </PageShell>
  );
}
