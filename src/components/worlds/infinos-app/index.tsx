import type { WorldParts } from "../types";
import { Mini } from "./Mini";
import { HeroVisual } from "./Hero";
import { Replay } from "./Replay";
import { Pipeline } from "./Pipeline";

/**
 * WORLD: INFINOS Telemetry, the monitoring platform. A dark instrument: void ground, verdigris
 * data, apricot for out-of-range. Everything drawn from data is the bag's real recorded readings
 * (the app's own PDF audit report, 17 Sep 2026), replayed and labelled as such. Nothing is live.
 */
export const world: WorldParts = { Mini, HeroVisual, Demo: Replay, Extra: Pipeline };
