import type { WorldParts } from "../types";
import { Mini } from "./Mini";
import { HeroVisual } from "./Hero";
import { Demo } from "./Demo";
import { Paths } from "./Paths";

/**
 * WORLD: Brain Matrix, an EEG research workstation. A research-lab "paper" world: ink traces on
 * bone like a polygraph strip, oxblood pens, verdigris for the live Bluetooth signal.
 * Every waveform here is synthetic and badged; the only real image is the screenshot in "Real screens".
 */
export const world: WorldParts = { Mini, HeroVisual, Demo, Extra: Paths };
