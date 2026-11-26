import type { ProjectSlug } from "@/content/projects";
import type { WorldParts } from "./types";
import { generic } from "./generic";
import { world as rayaAssistant } from "./raya-assistant";
import { world as rayaSmartHome } from "./raya-smart-home";
import { world as infinosWebsite } from "./infinos-website";
import { world as infinosApp } from "./infinos-app";
import { world as brainMatrix } from "./brain-matrix";
import { world as simpleinSchool } from "./simplein-school";

/**
 * slug → world. A project without a bespoke world falls back to the generic one (its cover).
 * Each bespoke world lives in its own folder: src/components/worlds/<slug>/index.tsx, exporting `world`.
 */
const worlds: Partial<Record<ProjectSlug, WorldParts>> = {
  "raya-assistant": rayaAssistant,
  "raya-smart-home": rayaSmartHome,
  "infinos-website": infinosWebsite,
  "infinos-app": infinosApp,
  "brain-matrix": brainMatrix,
  "simplein-school": simpleinSchool,
};

export const worldFor = (slug: ProjectSlug): WorldParts => worlds[slug] ?? generic;
