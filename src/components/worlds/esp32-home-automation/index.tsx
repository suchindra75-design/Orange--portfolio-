import type { WorldParts } from "../types";
import { Mini } from "./Mini";
import { HeroVisual } from "./Hero";
import { Demo } from "./Demo";

/**
 * WORLD: esp32-home-automation (ESP32 Home Automation System). A concept demo, separate from RAYA.
 *   Mini        A house at dusk, drawn in section, lit room by room by a typed command (SVG).
 *   HeroVisual  The same house lighting up from the controller outward (≤ 1.2 s), then at rest.
 *   Demo        The 3D dusk living room (world/acts/RayaScene.tsx via RayaStage) and the
 *               instruction → interpretation → signal → ESP controller → appliance pipeline.
 */
export const world: WorldParts = { Mini, HeroVisual, Demo };
