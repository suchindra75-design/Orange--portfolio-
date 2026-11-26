import type { ComponentType } from "react";
import type { Project } from "@/content/projects";

/**
 * The parts a project "world" provides. Everything else on a project page comes from the
 * shared template (src/components/project/ProjectPage.tsx) and the project's data.
 *
 *   Mini        A live miniature of the project, filling its box (position absolute, inset 0).
 *               Used on the home "Six worlds" plates and on /projects. 2D only (canvas/SVG/CSS),
 *               animates only while visible, static frame under reduced motion, aria-hidden.
 *   HeroVisual  The art in the project page hero, filling its box. Plays the world's short
 *               intro (≤ 1.2 s, never blocking), then rests or idles cheaply.
 *   Demo        Optional. A full section (renders its own <section>) with the interactive or
 *               animated demonstration. Must badge simulations / replays honestly.
 *   Extra       Optional. Additional bespoke section(s) placed after "What I built".
 */
/** `n`: the section number(s) the template assigns to Extra / Demo, in page order (e.g. ["03"]). */
export type WorldProps = { project: Project; n?: string[] };

export type WorldParts = {
  Mini: ComponentType<WorldProps>;
  HeroVisual: ComponentType<WorldProps>;
  Demo?: ComponentType<WorldProps>;
  Extra?: ComponentType<WorldProps>;
  /** How many numbered sections Extra renders (default 1). */
  extraCount?: number;
};
