"use client";

import { useState } from "react";
import Image from "next/image";
import { projects, type Project } from "@/content/projects";
import { CHIPS } from "@/content/bench";
import { ProjectLink } from "@/components/chrome/Links";

/**
 * THE TRAY (phones): the bench, handed to you. Every project's object, as a still rendered from
 * the 3D bench (public/bench/<slug>.webp), on a chunky card you swipe through, with the same honest
 * chips as the desktop bench. Tap a card to open it (it lifts as you press). Phones never download
 * three.js for this: the objects are pictures.
 */
export function Tray() {
  const [chip, setChip] = useState<string | null>(null);
  const test = chip ? CHIPS.find((c) => c.id === chip)!.test : null;
  const shown = test ? projects.filter(test) : projects;

  return (
    <div className="tray">
      <div role="group" aria-label="Ask the bench" className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 [scrollbar-width:none]">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={chip === c.id}
            onClick={() => setChip(chip === c.id ? null : c.id)}
            className={`t-label shrink-0 rounded-full border-2 border-ink px-3.5 py-2.5 transition-[background-color,color] duration-150 ${chip === c.id ? "bg-ink text-cream" : "bg-cream text-ink"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {chip ? `${shown.length} projects: ${shown.map((p) => p.title).join(", ")}` : ""}
      </p>

      <ol className="-mx-[var(--gutter)] mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] pb-6 pt-2 [scrollbar-width:none]">
        {shown.map((p) => (
          <li key={p.slug} className="w-[min(78vw,20rem)] shrink-0 snap-start">
            <TrayCard p={p} />
          </li>
        ))}
      </ol>
      <p className="t-label text-ink/55" aria-hidden="true">
        {shown.length} on the bench · swipe →
      </p>
    </div>
  );
}

function TrayCard({ p }: { p: Project }) {
  return (
    <ProjectLink href={`/projects/${p.slug}`} className="tray-card chunky block h-full overflow-hidden">
      <div className="relative aspect-[4/3] bg-pop">
        {/* The project's object from the bench: an illustration, never a photo of the product. */}
        <Image src={`/bench/${p.slug}.webp`} alt="" fill sizes="(max-width: 767px) 78vw, 20rem" className="tray-object object-contain p-5" />
        <span className="t-label absolute left-3 top-3 rounded-full border-2 border-ink bg-cream px-2.5 py-1">{p.index}</span>
      </div>
      <div className="border-t-2 border-ink px-4 pb-5 pt-4">
        <p className="t-label truncate text-ink/60">{p.category}</p>
        <h3 className="t-name mt-1.5 text-[1.7rem] leading-[0.95]">{p.title}</h3>
        <p className="t-label mt-2 text-pop">{p.status.label}</p>
        <p className="mt-3 line-clamp-3 text-[0.98rem] leading-snug text-ink/80">{p.oneLine}</p>
        <span className="t-label mt-4 inline-block">Open →</span>
      </div>
    </ProjectLink>
  );
}
