"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny shared store between the HTML demos and their 3D stage (no dependency).
 * The home-automation console flips devices; stages report WebGL support.
 */

export type Devices = { lights: boolean; fan: boolean; tv: boolean };

export type WorldState = {
  devices: Devices;
  /** Last command's target, for the wire pulse animation. */
  pulse: { device: keyof Devices | null; at: number };
  /** True once the 3D scene has rendered its first frame. */
  worldReady: boolean;
  /** False when WebGL is unavailable: sections show image fallbacks. */
  webgl: boolean;
};

let state: WorldState = {
  devices: { lights: false, fan: false, tv: false },
  pulse: { device: null, at: 0 },
  worldReady: false,
  webgl: true,
};

const listeners = new Set<() => void>();

export const world = {
  get: () => state,
  set(patch: Partial<WorldState> | ((s: WorldState) => Partial<WorldState>)) {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useWorld<T>(select: (s: WorldState) => T): T {
  return useSyncExternalStore(world.subscribe, () => select(state), () => select(state));
}

export function setDevice(device: keyof Devices, on: boolean) {
  world.set((s) => ({ devices: { ...s.devices, [device]: on }, pulse: { device, at: performance.now() } }));
}
