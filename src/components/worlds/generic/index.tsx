import Image from "next/image";
import type { WorldParts, WorldProps } from "../types";

/** Fallback world: the project's real cover image, slowly drifting. */
function Cover({ project, sizes }: WorldProps & { sizes: string }) {
  if (!project.cover)
    return (
      <div className="absolute inset-0 grid place-items-center" style={{ background: project.world.bg }}>
        <span className="font-display text-[clamp(3rem,10vw,9rem)] font-medium" style={{ color: project.world.accent }}>
          {project.title}
        </span>
      </div>
    );
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: project.world.bg }}>
      <Image src={project.cover.src} alt="" fill sizes={sizes} className="world-drift object-cover" style={{ objectPosition: `50% ${project.cover.focus * 100}%` }} />
    </div>
  );
}

function GenericMini(p: WorldProps) {
  return <Cover {...p} sizes="(max-width: 768px) 100vw, 60vw" />;
}
function GenericHero(p: WorldProps) {
  return <Cover {...p} sizes="100vw" />;
}

export const generic: WorldParts = { Mini: GenericMini, HeroVisual: GenericHero };
