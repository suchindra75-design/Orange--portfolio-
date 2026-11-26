import type { WorldProps } from "../types";
import { PlanSvg } from "./PlanSvg";

/**
 * HERO VISUAL: the whole system plan, top/right, drawing itself in wing by wing (≤ 1.2 s, CSS
 * only, so it starts at first paint) and then resting. Nothing loops.
 */
export function HeroVisual({ project }: WorldProps) {
  const w = project.world;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: w.bg }}>
      {/* Drafting paper */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to right, color-mix(in oklab, ${w.ink} 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, ${w.ink} 6%, transparent) 1px, transparent 1px)`,
          backgroundSize: "clamp(36px, 4.6vw, 64px) clamp(36px, 4.6vw, 64px)",
        }}
      />
      <PlanSvg variant="hero" colors={w} grid={false} className="sps-heroPlan" />
      {/* Daylight over the board from the upper right; the lower left falls quiet for the title */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 60% at 78% 10%, rgba(255,217,160,0.28), transparent 70%)" }} />
    </div>
  );
}
