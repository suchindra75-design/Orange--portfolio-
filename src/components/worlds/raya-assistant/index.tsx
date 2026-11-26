import type { WorldParts } from "../types";
import { Mini } from "./Mini";
import { HeroVisual } from "./HeroVisual";
import { Demo } from "./Demo";
import { Extra } from "./Extra";

/**
 * WORLD: raya-assistant — "Graphite & Silver" with an apricot voice ribbon.
 *   Mini        the voice ribbon cycling through the app's real states (2D canvas)
 *   HeroVisual  the ribbon draws itself out of a slit of light, then breathes
 *   Extra       "Up close": voice gate, approval gate, audio engine (from the source)
 *   Demo        "Command console": a labelled simulation of the real pipeline
 */
export const world: WorldParts = { Mini, HeroVisual, Demo, Extra };
