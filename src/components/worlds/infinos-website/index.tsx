import type { WorldParts } from "../types";
import { Mini } from "./Mini";
import { HeroVisual } from "./HeroVisual";
import { Extra } from "./Extra";
import { Demo } from "./Demo";

/**
 * WORLD: infinos-website — a bright product studio. Bone ground, the bag's red as accent, and the
 * owner's real Cycles renders throughout (© INFINOS Tech): the reveal as the hero intro, the
 * opening sequence scrubbed by scroll, render-vs-photo validation and the product renders.
 */
export const world: WorldParts = { Mini, HeroVisual, Demo, Extra, extraCount: 2 };
