"use client";

import { createContext, useContext } from "react";

/**
 * Render quality for the whole world. "low" = phones, coarse pointers, or a
 * device that PerformanceMonitor saw struggle: no reflector floors, fewer
 * lights, simpler materials. Scenes must look intentional at both levels.
 */
export type Quality = "high" | "low";
export const QualityContext = createContext<Quality>("high");
export const useQuality = () => useContext(QualityContext);
