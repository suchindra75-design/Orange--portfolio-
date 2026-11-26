import type { WorldParts } from "../types";
import { Mini } from "./Mini";
import { HeroVisual } from "./Hero";
import { Demo } from "./Demo";
import { Scale } from "./Scale";

/**
 * WORLD: simplein-school. A white architectural model of a school ERP: travertine board,
 * terracotta core (the row-level-security wall), verdigris request paths.
 *   Mini        the plan drawing itself wing by wing, then one wing at a time lit (2D SVG)
 *   HeroVisual  the whole plan, drawn in ≤ 1.2 s, top/right, then at rest
 *   Extra       "Scale": the audited numbers from projects.ts, with what each means
 *   Demo        the real sign-in gateway, then a 300 svh walk through the 3D model ending at
 *               the tenant-isolation demo (badged as a reconstruction with sample data)
 */
export const world: WorldParts = { Mini, HeroVisual, Demo, Extra: Scale };
