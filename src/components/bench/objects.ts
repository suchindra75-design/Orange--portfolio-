import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ProjectSlug } from "@/content/projects";
import recorded from "@/components/worlds/infinos-app/recorded.json";
import { CREAM, INK } from "./toon";

/**
 * THE EIGHT OBJECTS ON THE BENCH, built in code.
 *
 * Each is an iconic illustration of its project, never a model of real hardware: a laptop for
 * RAYA, a dev board and a bulb for the ESP32 home automation, a bag for INFINOS, a display of the
 * recorded readings for INFINOS Telemetry, a headband for Brain Matrix, a printed sheet for
 * SIMPLEIN, a photo becoming a faceted mesh for AI 3D Studio, a framed plate for Nocturne.
 * One accent colour each (from the project's own world palette), plus cream and ink.
 *
 * Screens show only real things: the project's real screenshot, or (INFINOS Telemetry) a plot of
 * its recorded sensor readings.
 *
 * Units: the bench is 12 × 7; objects stand on y = 0 and fit within about 2.2 × 1.8.
 */

export type Part = { geo: THREE.BufferGeometry; color: string; at?: [number, number, number]; rot?: [number, number, number] };
export type Screen = { w: number; h: number; at: [number, number, number]; rot?: [number, number, number]; src: string | (() => HTMLCanvasElement) };
export type ObjectSpec = { parts: Part[]; screens: Screen[]; foot: [number, number]; height: number };

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);

/** A real screenshot, through Next's image optimiser (small WebP, cached). Quality must be 75:
 *  production only serves the configured qualities, and anything else is a 400. */
const shot = (src: string) => `/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`;

/** INFINOS Telemetry's screen: its recorded readings (Field 1 and Field 2), plotted in its own colours. */
function telemetryPlot() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#120A0F";
  g.fillRect(0, 0, c.width, c.height);
  const rows = recorded.rows as [number, number, number][];
  const t1 = rows[rows.length - 1][0];
  const x = (t: number) => 24 + (t / t1) * (c.width - 48);
  const y = (v: number) => c.height - 30 - ((v - 5) / 25) * (c.height - 70);
  g.strokeStyle = "rgba(242,233,221,.12)";
  g.lineWidth = 1;
  for (let v = 5; v <= 30; v += 5) {
    g.beginPath();
    g.moveTo(24, y(v));
    g.lineTo(c.width - 24, y(v));
    g.stroke();
  }
  ([[1, "#5FB8A0"], [2, "#FFB26B"]] as const).forEach(([k, col]) => {
    g.strokeStyle = col;
    g.lineWidth = 5;
    g.lineJoin = "round";
    g.beginPath();
    rows.forEach((r, i) => (i ? g.lineTo(x(r[0]), y(r[k])) : g.moveTo(x(r[0]), y(r[k]))));
    g.stroke();
  });
  g.fillStyle = "#F2E9DD";
  g.font = "600 22px ui-monospace, monospace";
  g.fillText("RECORDED DATA · REPLAYED", 24, 36);
  return c;
}

export const OBJECTS: Record<ProjectSlug, () => ObjectSpec> = {
  // RAYA: a laptop, its screen showing RAYA's real window. Silver from RAYA's world.
  "raya-assistant": () => ({
    parts: [
      { geo: rbox(2.1, 0.12, 1.45, 0.05), color: "#C9C6CC", at: [0, 0.06, 0] },
      { geo: rbox(2.1, 1.38, 0.08, 0.04), color: "#C9C6CC", at: [0, 0.78, -0.82], rot: [-0.22, 0, 0] },
      { geo: box(1.5, 0.02, 0.5), color: INK, at: [0, 0.125, 0.12] },
    ],
    screens: [{ w: 1.9, h: 1.18, at: [0, 0.79, -0.77], rot: [-0.22, 0, 0], src: shot("/work/raya.jpg") }],
    foot: [2.1, 1.6],
    height: 1.55,
  }),

  // ESP32 home automation: a dev board (verdigris), its shielded module, two pin rows, and a bulb.
  "esp32-home-automation": () => ({
    parts: [
      { geo: rbox(1.7, 0.09, 0.95, 0.03), color: "#5FB8A0", at: [0, 0.045, 0] },
      { geo: rbox(0.55, 0.08, 0.5, 0.02), color: CREAM, at: [-0.42, 0.13, 0] },
      { geo: box(1.3, 0.07, 0.06), color: INK, at: [0.1, 0.12, 0.38] },
      { geo: box(1.3, 0.07, 0.06), color: INK, at: [0.1, 0.12, -0.38] },
      { geo: new THREE.SphereGeometry(0.34, 20, 14), color: CREAM, at: [1.35, 0.62, -0.1] },
      { geo: new THREE.CylinderGeometry(0.16, 0.2, 0.32, 16), color: "#5FB8A0", at: [1.35, 0.16, -0.1] },
    ],
    screens: [],
    foot: [2.4, 1.0],
    height: 1.0,
  }),

  // INFINOS: the bag (its world's bag red), with a cream pocket and a handle.
  "infinos-website": () => ({
    parts: [
      { geo: rbox(1.45, 1.75, 0.8, 0.22), color: "#B8322B", at: [0, 0.875, 0] },
      { geo: rbox(1.0, 0.7, 0.14, 0.08), color: CREAM, at: [0, 0.62, 0.43] },
      { geo: new THREE.TorusGeometry(0.36, 0.07, 10, 24, Math.PI), color: INK, at: [0, 1.74, 0] },
    ],
    screens: [],
    foot: [1.5, 0.85],
    height: 2.15,
  }),

  // INFINOS Telemetry: a small display of the recorded readings, and the sensor puck.
  "infinos-app": () => ({
    parts: [
      { geo: rbox(1.9, 1.25, 0.12, 0.05), color: CREAM, at: [0, 0.95, 0], rot: [-0.12, 0, 0] },
      { geo: box(0.18, 0.4, 0.18), color: CREAM, at: [0, 0.2, -0.08] },
      { geo: rbox(0.9, 0.06, 0.5, 0.03), color: CREAM, at: [0, 0.03, -0.05] },
      { geo: new THREE.CylinderGeometry(0.32, 0.32, 0.16, 24), color: "#5FB8A0", at: [1.25, 0.08, 0.35] },
    ],
    screens: [{ w: 1.74, h: 1.08, at: [0, 0.96, 0.07], rot: [-0.12, 0, 0], src: telemetryPlot }],
    foot: [2.2, 1.0],
    height: 1.7,
  }),

  // Brain Matrix: a headband (its world's accent) with three electrodes.
  "brain-matrix": () => ({
    parts: [
      { geo: new THREE.TorusGeometry(0.72, 0.09, 12, 36, Math.PI), color: "#7A2430", at: [0, 0.05, 0] },
      { geo: new THREE.SphereGeometry(0.12, 14, 10), color: CREAM, at: [0, 0.82, 0] },
      { geo: new THREE.SphereGeometry(0.12, 14, 10), color: CREAM, at: [-0.51, 0.56, 0] },
      { geo: new THREE.SphereGeometry(0.12, 14, 10), color: CREAM, at: [0.51, 0.56, 0] },
      { geo: rbox(0.5, 0.16, 0.34, 0.04), color: CREAM, at: [0.95, 0.08, 0.25] },
    ],
    screens: [],
    foot: [1.9, 0.6],
    height: 1.05,
  }),

  // SIMPLEIN School: a printed sheet of its real screen, and a rolled sheet in its accent.
  "simplein-school": () => ({
    parts: [
      { geo: box(2.2, 0.03, 1.45), color: CREAM, at: [0, 0.015, 0] },
      { geo: new THREE.CylinderGeometry(0.13, 0.13, 1.5, 18), color: "#B5573A", at: [1.35, 0.13, 0.1], rot: [Math.PI / 2, 0, 0] },
    ],
    screens: [{ w: 2.0, h: 1.25, at: [0, 0.032, 0], rot: [-Math.PI / 2, 0, 0], src: shot("/work/simplein-school.jpg") }],
    foot: [2.6, 1.5],
    height: 0.4,
  }),

  // AI 3D Studio: a photo of its real screen, and the faceted mesh it becomes (its accent).
  "ai-3d-studio": () => ({
    parts: [
      { geo: box(1.15, 0.025, 0.78), color: CREAM, at: [-0.7, 0.012, 0.1], rot: [0, 0.18, 0] },
      { geo: new THREE.IcosahedronGeometry(0.6, 0), color: "#FFB26B", at: [0.75, 0.6, -0.05], rot: [0.5, 0.4, 0.2] },
    ],
    screens: [{ w: 1.05, h: 0.66, at: [-0.7, 0.027, 0.1], rot: [-Math.PI / 2, 0, 0.18], src: shot("/work/ai-3d-studio.jpg") }],
    foot: [2.4, 1.1],
    height: 1.2,
  }),

  // Nocturne: a framed plate showing the real story, on a small stand in its accent.
  nocturne: () => ({
    parts: [
      { geo: rbox(1.2, 1.6, 0.08, 0.03), color: INK, at: [0, 0.95, 0], rot: [-0.16, 0, 0] },
      { geo: box(0.9, 0.1, 0.5), color: "#F0A868", at: [0, 0.05, 0.02] },
    ],
    screens: [{ w: 1.06, h: 1.46, at: [0, 0.955, 0.047], rot: [-0.16, 0, 0], src: shot("/work/nocturne.jpg") }],
    foot: [1.25, 0.6],
    height: 1.85,
  }),
};
