import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects, projectBySlug } from "@/content/projects";
import { ProjectPage } from "@/components/project/ProjectPage";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

type Params = PageProps<"/projects/[slug]">["params"];

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = projectBySlug(slug);
  if (!p) return {};
  const title = `${p.title}, ${p.subtitle}`;
  return {
    title,
    description: p.oneLine,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title, description: p.oneLine, url: `/projects/${p.slug}`, ...(p.cover ? { images: [{ url: p.cover.src, width: 1600, height: 1000 }] } : {}) },
  };
}

export default function Page({ params }: PageProps<"/projects/[slug]">) {
  // Every slug is prerendered; the boundary keeps client navigations instant.
  return (
    <Suspense fallback={<main id="main" className="min-h-[100svh] bg-void" aria-busy="true" />}>
      <Project params={params} />
    </Suspense>
  );
}

async function Project({ params }: { params: Params }) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();
  return <ProjectPage project={project} />;
}
