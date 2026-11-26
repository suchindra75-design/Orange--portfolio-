import type { Devices } from "@/lib/store";

/**
 * Stand-in for RAYA's language understanding, for the in-browser demo only: a tiny rule parser
 * that finds the device(s) and the state in a plain sentence.
 */
export type DeviceId = keyof Devices;
export type Intent = { targets: DeviceId[]; all: boolean; on: boolean };

export const DEVICES: DeviceId[] = ["lights", "fan", "tv"];
export const NAMES: Record<DeviceId, string> = { lights: "Lights", fan: "Fan", tv: "Television" };
export const SHORT: Record<DeviceId, string> = { lights: "Lights", fan: "Fan", tv: "TV" };

const WORDS: Record<DeviceId, RegExp> = {
  lights: /\b(light|lights|lamp|lamps)\b/,
  fan: /\bfan\b/,
  tv: /\b(tv|television|telly|screen)\b/,
};

export function parse(text: string, current: Devices): Intent | null {
  const t = text.toLowerCase();
  const named = DEVICES.filter((d) => WORDS[d].test(t));
  const all = !named.length && /\b(everything|all)\b/.test(t);
  if (!named.length && !all) return null;
  const targets = all ? DEVICES : named;
  const off = /\b(off|shut|stop|kill|disable)\b/.test(t);
  const on = /\b(on|start|enable|open)\b/.test(t);
  // No state word ("the fan, please"): toggle, as a person would mean it.
  const isOn = off ? false : on ? true : !targets.some((d) => current[d]);
  return { targets, all, on: isOn };
}
