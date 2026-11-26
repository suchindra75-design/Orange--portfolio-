"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { world, type Devices } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/hooks";
import type { ActDef } from "./types";
import { actProgress, isActive } from "../director";
import { P } from "../system/palette";
import { fabric, metal, paint, stone } from "../system/materials";
import { LightCone, useShaftMaterial } from "../system/LightShaft";
import { useQuality } from "../system/quality";

/* ══════════════════════════════════════════════════════════════════════════
   RAYA HOME — the demo room on /projects/raya-smart-home.
   A tall living room at dusk. Low sun pours through a wall of glass; the
   room is beautiful before anything happens. A command typed in the HTML
   layer (worlds/raya-smart-home/Demo.tsx) travels: instruction → interpretation → signal →
   the ESP-based controller on the console → a verdigris pulse along an
   inlaid run in the wall, ceiling or floor → the appliance acts (warm
   light, fan motion, screen glow). The appliance only responds when its
   pulse arrives, so the causality is always legible.
   ══════════════════════════════════════════════════════════════════════════ */

const ORIGIN: [number, number, number] = [400, 0, 0];
/** Time a control pulse takes from the controller to an appliance. Mirrored in worlds/raya-smart-home/Demo.tsx. */
const TRAVEL_MS = 950;

// Room (local space). Interior: x −6…6, z −7…7, floor y 0, ceiling y H.
const H = 5.8;
const WIN = { x0: -3.0, x1: 4.2, y0: 0.45, y1: 5.2, z: -7 };
const MULLIONS = [-1.2, 0.6, 2.4];
const TRANSOM = 4.25;
/** Direction the low sun's light travels: from behind the glass (−z), down, toward +x. */
const SUN = new THREE.Vector3(0.45, -0.36, 1);
/** Occluders that cast sun shadows inside the gobo shader: [min, max] boxes. */
const SOFA_BOX = [new THREE.Vector3(-0.85, 0, -3.95), new THREE.Vector3(0.25, 0.86, -0.85)];
const PLINTH_BOX = [new THREE.Vector3(3.05, 0, -5.95), new THREE.Vector3(3.75, 1.75, -5.25)];

const CTRL = new THREE.Vector3(-5.7, 0.82, -0.74); // the ESP-based controller, on the console
const FAN = new THREE.Vector3(-0.2, H, -1.3);
const FAN_DROP = 1.45; // blades hang this far below the ceiling
const LAMP = new THREE.Vector3(0.62, 0, -4.45);
const TV = { z: -2.6, y: 2.15, w: 2.2, h: 1.24 };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ─────────────────────────────── Camera ─────────────────────────────── */

type Key = { pos: [number, number, number]; tgt: [number, number, number]; fov: number };
// Establishing (one-point, down the room to the glass) → the composed living-room view, held
// while the visitor talks to the room → a slow dolly toward the light.
const DESK: Key[] = [
  { pos: [1.5, 2.15, 6.5], tgt: [-0.3, 2.55, -7], fov: 50 },
  { pos: [3.4, 2.45, 4.7], tgt: [-2.4, 1.55, -2.7], fov: 50 },
  { pos: [3.0, 2.4, 4.0], tgt: [-2.55, 1.55, -2.85], fov: 50 },
  { pos: [2.1, 2.05, -4.5], tgt: [1.5, 2.3, -10], fov: 54 },
];
// Phones: the hold faces the television wall (screen, controller, pendants, fan in one tall frame).
const MOBILE: Key[] = [
  { pos: [0.7, 2.2, 6.6], tgt: [-0.2, 2.9, -7], fov: 66 },
  { pos: [5.4, 1.7, 0.6], tgt: [-6, 2.05, -2.9], fov: 66 },
  { pos: [5.1, 1.7, 0.25], tgt: [-6, 2.05, -3.0], fov: 66 },
  // Ends between two mullions, so the phone frame is all sky.
  { pos: [1.5, 2.05, -4.6], tgt: [1.5, 2.35, -10], fov: 70 },
];

function blendKeys(a: Key, b: Key, t: number, out: { pos: THREE.Vector3; target: THREE.Vector3; fov: number }) {
  out.pos.set(lerp(a.pos[0], b.pos[0], t), lerp(a.pos[1], b.pos[1], t), lerp(a.pos[2], b.pos[2], t));
  out.target.set(lerp(a.tgt[0], b.tgt[0], t), lerp(a.tgt[1], b.tgt[1], t), lerp(a.tgt[2], b.tgt[2], t));
  out.fov = lerp(a.fov, b.fov, t);
}

export const raya: ActDef = {
  id: "raya",
  origin: ORIGIN,
  atmosphere: { background: P.void, fog: [P.dusk, 11, 46], exposure: 1.05 },
  cut: "void",
  camera(p, out, ctx) {
    const K = ctx.mobile ? MOBILE : DESK;
    // Timed for a ~250svh project-page section: a short approach, a long hold while the
    // visitor works the room, then a dolly toward the light as the section hands back.
    if (p < 0.2) blendKeys(K[0], K[1], ease(p / 0.2), out);
    else if (p < 0.86) blendKeys(K[1], K[2], (p - 0.2) / 0.66, out);
    else blendKeys(K[2], K[3], ease((p - 0.86) / 0.14), out);
    // A breath of parallax for mouse users; calmer while the visitor is working the room.
    const hold = p > 0.16 && p < 0.88 ? 0.45 : 1;
    out.pos.x += ctx.pointer.x * 0.28 * hold;
    out.pos.y += ctx.pointer.y * 0.12 * hold;
  },
};

/* ─────────────────────────────── Textures ─────────────────────────────── */

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Seeded random so the room is identical on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Oiled oak boards, running toward the glass. 1024px = 3.6 m. */
function makeTimber() {
  return canvasTexture(1024, 1024, (g) => {
    const r = rng(7);
    const boards = 20;
    const bw = 1024 / boards;
    for (let i = 0; i < boards; i++) {
      let y = -r() * 400;
      while (y < 1024) {
        const len = 330 + r() * 380;
        const l = 30 + r() * 9;
        const hue = 18 + r() * 8;
        g.fillStyle = `hsl(${hue} 42% ${l}%)`;
        g.fillRect(i * bw, y, bw, len);
        // grain
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `rgba(${r() < 0.5 ? "40,18,10" : "120,70,44"},${0.05 + r() * 0.08})`;
          g.lineWidth = 0.6 + r() * 1.4;
          g.beginPath();
          const x0 = i * bw + r() * bw;
          g.moveTo(x0, y);
          for (let s = 0; s <= 8; s++) g.lineTo(x0 + Math.sin(s * 0.9 + r() * 2) * 2.2, y + (len * s) / 8);
          g.stroke();
        }
        // end joint
        g.fillStyle = "rgba(20,8,6,0.55)";
        g.fillRect(i * bw, y, bw, 1.5);
        y += len;
      }
      // long seam
      g.fillStyle = "rgba(18,8,6,0.6)";
      g.fillRect(i * bw, 0, 1.5, 1024);
    }
  });
}

/** Dusk beyond the glass: a low warm horizon, cloud bands, layered hills. */
function makeSky() {
  const W = 1536;
  const Hh = 1024;
  const horizon = Hh * 0.62;
  return canvasTexture(W, Hh, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#1A0C14");
    sky.addColorStop(0.32, "#3A1823");
    sky.addColorStop(0.58, P.oxblood);
    sky.addColorStop(0.8, P.terracotta);
    sky.addColorStop(0.93, P.apricot);
    sky.addColorStop(1, P.gold);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, Hh); // past the horizon too: the ridge tops dip below it in places
    // The sun has just gone behind the left of the frame: the horizon is hotter there.
    const sun = g.createRadialGradient(W * 0.08, horizon, 10, W * 0.08, horizon, W * 0.75);
    sun.addColorStop(0, "rgba(255,236,205,0.95)");
    sun.addColorStop(0.18, "rgba(255,217,160,0.55)");
    sun.addColorStop(0.5, "rgba(255,178,107,0.18)");
    sun.addColorStop(1, "rgba(255,178,107,0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, W, Hh);
    // Long, thin dusk clouds catching the last light.
    const r = rng(3);
    for (let i = 0; i < 12; i++) {
      const y = horizon * (0.4 + r() * 0.5);
      const warm = y / horizon > 0.75 ? "255,206,160" : "196,98,72";
      const cx = r() * W;
      const rx = 200 + r() * 420;
      const ry = 5 + r() * 10;
      g.save();
      g.translate(cx, y);
      g.scale(1, ry / rx);
      const cl = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      cl.addColorStop(0, `rgba(${warm},${0.12 + r() * 0.16})`);
      cl.addColorStop(1, `rgba(${warm},0)`);
      g.fillStyle = cl;
      g.fillRect(-rx, -rx, rx * 2, rx * 2);
      g.restore();
    }
    // Hills: far (hazy), mid, near.
    const ridge = (base: number, amp: number, freq: number, color: string, seed: number) => {
      const rr = rng(seed);
      const ph = [rr() * 6, rr() * 6, rr() * 6];
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, Hh);
      for (let x = 0; x <= W; x += 2) {
        const u = x / W;
        const y = base - amp * (0.55 * Math.sin(u * freq + ph[0]) + 0.3 * Math.sin(u * freq * 2.3 + ph[1]) + 0.15 * Math.sin(u * freq * 5.1 + ph[2]));
        g.lineTo(x, y);
      }
      g.lineTo(W, Hh);
      g.fill();
    };
    ridge(horizon + 6, 26, 7, "#8A4436", 11);
    ridge(horizon + 40, 22, 5, "#4A2026", 12);
    ridge(horizon + 80, 30, 3.4, "#24101A", 13);
    g.fillStyle = "#170A10";
    g.fillRect(0, horizon + 150, W, Hh);
  });
}

/** What the television shows when on: an abstract warm field — not a UI, not a real screen. */
function makeScreen() {
  return canvasTexture(1024, 576, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 576);
    bg.addColorStop(0, "#3A1823");
    bg.addColorStop(0.6, P.terracotta);
    bg.addColorStop(1, "#4A1E1E");
    g.fillStyle = bg;
    g.fillRect(0, 0, 1024, 576);
    const sun = g.createRadialGradient(640, 330, 4, 640, 330, 420);
    sun.addColorStop(0, "#FFF1DC");
    sun.addColorStop(0.12, P.gold);
    sun.addColorStop(0.45, "rgba(255,178,107,0.45)");
    sun.addColorStop(1, "rgba(255,178,107,0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, 1024, 576);
    g.fillStyle = "rgba(26,12,18,0.85)";
    g.beginPath();
    g.moveTo(0, 576);
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, 420 - 40 * Math.sin(x / 210) - 18 * Math.sin(x / 70 + 1));
    g.lineTo(1024, 576);
    g.fill();
  });
}

/** Soft contact shadow (alpha). */
function makeBlob() {
  return canvasTexture(
    128,
    128,
    (g) => {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, "rgba(0,0,0,1)");
      r.addColorStop(0.55, "rgba(0,0,0,0.55)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    },
    false,
  );
}

/* ─────────────────────────────── Shaders ─────────────────────────────── */

const WORLD_VERT = /* glsl */ `
uniform vec3 uOrigin;
varying vec3 vP;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz - uOrigin;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/** Shared GLSL: the window as a soft-edged aperture with mullion and transom bars. */
const APERTURE = /* glsl */ `
uniform vec3 uSun;
uniform vec4 uWin;      // x0, x1, y0, y1
uniform float uWinZ;
uniform vec3 uMull;     // mullion x positions
uniform float uTransom;
float bar(float d, float w, float e) { return smoothstep(w, w + e, abs(d)); }
float aperture(vec2 h, float e) {
  float r = smoothstep(uWin.x - e, uWin.x + e, h.x) * (1.0 - smoothstep(uWin.y - e, uWin.y + e, h.x))
          * smoothstep(uWin.z - e, uWin.z + e, h.y) * (1.0 - smoothstep(uWin.w - e, uWin.w + e, h.y));
  r *= bar(h.x - uMull.x, 0.04, e) * bar(h.x - uMull.y, 0.04, e) * bar(h.x - uMull.z, 0.04, e);
  r *= bar(h.y - uTransom, 0.05, e);
  return r;
}
`;

/** Sunlight falling through the glass onto a surface (floor, wall), with sofa/plinth shadows. */
const GOBO_FRAG = /* glsl */ `
${APERTURE}
uniform vec3 uColor;
uniform float uIntensity;
uniform vec3 uBoxMin[2];
uniform vec3 uBoxMax[2];
varying vec3 vP;
float hitsBox(vec3 o, vec3 d, vec3 bmin, vec3 bmax, float tmax) {
  vec3 inv = 1.0 / d;
  vec3 t0 = (bmin - o) * inv;
  vec3 t1 = (bmax - o) * inv;
  vec3 lo = min(t0, t1);
  vec3 hi = max(t0, t1);
  float a = max(max(lo.x, lo.y), lo.z);
  float b = min(min(hi.x, hi.y), hi.z);
  return (b > max(a, 0.02) && a < tmax) ? 1.0 : 0.0;
}
void main() {
  float t = (vP.z - uWinZ) / uSun.z;          // how far back along the light to the glass
  if (t <= 0.0) discard;
  vec2 h = vP.xy - uSun.xy * t;               // where that light came through the window
  float e = 0.025 + t * 0.012;                 // penumbra grows with distance
  float lit = aperture(h, e);
  if (lit <= 0.001) discard;
  vec3 toSun = -normalize(uSun);
  float tl = t * length(uSun);
  float sh = max(hitsBox(vP, toSun, uBoxMin[0], uBoxMax[0], tl), hitsBox(vP, toSun, uBoxMin[1], uBoxMax[1], tl));
  float fall = 0.45 + 0.55 * exp(-t * 0.09);
  float a = lit * fall * (1.0 - 0.85 * sh) * uIntensity;
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

/** Analytic light shafts: the ray's path length through the sunlit prism behind the glass. */
const HAZE_FRAG = /* glsl */ `
${APERTURE}
uniform vec3 uColor;
uniform float uDensity;
uniform float uS;
uniform vec3 uRoomMin;
uniform vec3 uRoomMax;
uniform vec3 uOrigin;
varying vec3 vP;
void slab(float o, float dv, float lo, float hi, inout float t0, inout float t1) {
  if (abs(dv) < 1e-5) { if (o < lo || o > hi) { t0 = 1.0; t1 = 0.0; } return; }
  float a = (lo - o) / dv;
  float b = (hi - o) / dv;
  t0 = max(t0, min(a, b));
  t1 = min(t1, max(a, b));
}
void main() {
  vec3 c = cameraPosition - uOrigin;
  vec3 v = normalize(vP - c);
  float s0 = (c.z - uWinZ) / uSun.z, sv = v.z / uSun.z;
  float a0 = c.x - uSun.x * s0, av = v.x - uSun.x * sv;
  float b0 = c.y - uSun.y * s0, bv = v.y - uSun.y * sv;
  bool inside = s0 > 0.0 && s0 < uS && a0 > uWin.x && a0 < uWin.y && b0 > uWin.z && b0 < uWin.w;
  if (inside == gl_FrontFacing) discard;      // outside: front faces only; inside: back faces only
  float t0 = 0.0, t1 = 1e4;
  slab(s0, sv, 0.0, uS, t0, t1);
  slab(a0, av, uWin.x, uWin.y, t0, t1);
  slab(b0, bv, uWin.z, uWin.w, t0, t1);
  slab(c.x, v.x, uRoomMin.x, uRoomMax.x, t0, t1);
  slab(c.y, v.y, uRoomMin.y, uRoomMax.y, t0, t1);
  slab(c.z, v.z, uRoomMin.z, uRoomMax.z, t0, t1);
  if (t1 <= t0) discard;
  float L = t1 - t0;
  float tm = 0.5 * (t0 + t1);
  vec2 hm = vec2(a0 + av * tm, b0 + bv * tm);
  float sm = s0 + sv * tm;
  float soft = aperture(hm, 0.35);
  float d = L * uDensity * exp(-sm * 0.11) * (0.35 + 0.65 * soft);
  float a = 1.0 - exp(-d);
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

const PULSE_VERT = /* glsl */ `
varying float vX;
void main() {
  vX = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
/** A verdigris pulse travelling along an inlaid run; uv.x runs controller (0) → appliance (1). */
const PULSE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uHead;    // 0…1 along the run
uniform float uLen;     // metres
uniform float uTravel;  // 1 while a pulse is in flight
uniform float uLive;    // faint glow while the circuit is on
varying float vX;
void main() {
  float d = (uHead - vX) * uLen;               // metres behind the head
  float head = smoothstep(0.09, 0.0, abs(d));
  float tail = d > 0.0 ? exp(-d / 1.3) : 0.0;
  float a = (head * 5.0 + tail * 2.0) * uTravel + uLive;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

function useGobo(quality: string, mode: "add" | "multiply") {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WORLD_VERT,
        fragmentShader: GOBO_FRAG,
        uniforms: {
          uOrigin: { value: new THREE.Vector3(...ORIGIN) },
          uSun: { value: SUN.clone() },
          uWin: { value: new THREE.Vector4(WIN.x0, WIN.x1, WIN.y0, WIN.y1) },
          uWinZ: { value: WIN.z },
          uMull: { value: new THREE.Vector3(...MULLIONS) },
          uTransom: { value: TRANSOM },
          uColor: { value: new THREE.Color(P.apricot) },
          uIntensity: { value: mode === "add" ? 0.42 : quality === "low" ? 2.2 : 2.6 },
          uBoxMin: { value: [SOFA_BOX[0], PLINTH_BOX[0]] },
          uBoxMax: { value: [SOFA_BOX[1], PLINTH_BOX[1]] },
        },
        transparent: true,
        depthWrite: false,
        // On plaster the light multiplies what is there (it takes the wall's colour); on the dark
        // oiled boards it is added, so the patches read even where the timber is nearly black.
        ...(mode === "multiply"
          ? { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.OneFactor }
          : { blending: THREE.AdditiveBlending }),
        toneMapped: false,
        fog: false,
      }),
    [quality, mode],
  );
}

function sunPrism() {
  // The window rectangle extruded along the sun direction to the front of the room.
  const S = (7 - WIN.z) / SUN.z;
  const g = new THREE.BoxGeometry(1, 1, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = lerp(WIN.x0, WIN.x1, pos.getX(i) + 0.5);
    const b = lerp(WIN.y0, WIN.y1, pos.getY(i) + 0.5);
    const s = (pos.getZ(i) + 0.5) * S;
    pos.setXYZ(i, a + SUN.x * s, b + SUN.y * s, WIN.z + SUN.z * s);
  }
  pos.needsUpdate = true;
  g.computeBoundingSphere();
  return { geometry: g, S };
}

/* ─────────────────────────────── Signal runs ─────────────────────────────── */

type RunDef = { device: keyof Devices; pts: [number, number, number][] };
const WX = -5.993; // just proud of the left wall's plaster
const RUNS: RunDef[] = [
  // To the television: up the wall from the console, along, and up behind the screen.
  { device: "tv", pts: [[WX, 0.83, -0.72], [WX, 1.22, -0.72], [WX, 1.22, TV.z + 0.45], [WX, TV.y - TV.h / 2 - 0.02, TV.z + 0.45]] },
  // To the fan: straight up the wall, across the ceiling to its canopy.
  { device: "fan", pts: [[WX, 0.83, -0.66], [WX, H - 0.006, -0.66], [FAN.x, H - 0.006, -0.66], [FAN.x, H - 0.006, FAN.z]] },
  // To the lights: down behind the console, along the skirting, across the boards under the glass to the lamp.
  {
    device: "lights",
    pts: [[WX, 0.83, -0.78], [WX, 0.004, -0.78], [WX, 0.004, -5.55], [LAMP.x - 0.22, 0.004, -5.55], [LAMP.x - 0.22, 0.004, LAMP.z - 0.05]],
  },
];

function useRun(def: RunDef, quality: string) {
  const run = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < def.pts.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...def.pts[i - 1]), new THREE.Vector3(...def.pts[i])));
    const len = path.getLength();
    const seg = Math.ceil(len * (quality === "low" ? 18 : 30));
    const inlay = new THREE.TubeGeometry(path, seg, 0.007, 5, false);
    const glow = new THREE.TubeGeometry(path, seg, 0.024, 6, false);
    const mat = new THREE.ShaderMaterial({
      vertexShader: PULSE_VERT,
      fragmentShader: PULSE_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color(P.verdigris).multiplyScalar(1.4) },
        uHead: { value: 0 },
        uLen: { value: len },
        uTravel: { value: 0 },
        uLive: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
    // The pulse's head: one soft glow that rides the run and blooms where it arrives.
    const dot = canvasTexture(
      64,
      64,
      (g) => {
        const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        r.addColorStop(0, "rgba(255,255,255,1)");
        r.addColorStop(0.25, "rgba(255,255,255,0.55)");
        r.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = r;
        g.fillRect(0, 0, 64, 64);
      },
      false,
    );
    const head = new THREE.SpriteMaterial({
      map: dot,
      color: new THREE.Color(P.verdigris).multiplyScalar(1.6),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
      fog: false,
    });
    return { inlay, glow, mat, len, path, dot, head };
  }, [def, quality]);
  useEffect(
    () => () => {
      run.inlay.dispose();
      run.glow.dispose();
      run.mat.dispose();
      run.head.dispose();
      run.dot.dispose();
    },
    [run],
  );
  return run;
}

/* ─────────────────────────────── Furniture ─────────────────────────────── */

const rbox = (w: number, h: number, d: number, r = 0.04, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);

function Sofa({ quality }: { quality: string }) {
  const seg = quality === "low" ? 2 : 4;
  const body = fabric("#7A3A2B", P.apricot);
  const cushion = fabric("#8E4A36", P.gold);
  const pillow = fabric(P.travertine, P.bone);
  const g = useMemo(
    () => ({
      base: rbox(1.05, 0.36, 3.1, 0.06, seg),
      back: rbox(0.26, 0.46, 3.1, 0.08, seg),
      arm: rbox(1.05, 0.22, 0.24, 0.07, seg),
      seat: rbox(0.8, 0.16, 1.3, 0.07, seg),
      backCushion: rbox(0.22, 0.42, 1.3, 0.09, seg),
      pillow: rbox(0.14, 0.42, 0.46, 0.1, seg),
    }),
    [seg],
  );
  // Faces −x (toward the television). Local origin: centre of the footprint, floor level.
  return (
    <group position={[-0.3, 0, -2.4]}>
      <mesh geometry={g.base} material={body} position={[0, 0.25, 0]} />
      <mesh geometry={g.back} material={body} position={[0.4, 0.62, 0]} />
      <mesh geometry={g.arm} material={body} position={[0, 0.5, -1.43]} />
      <mesh geometry={g.arm} material={body} position={[0, 0.5, 1.43]} />
      <mesh geometry={g.seat} material={cushion} position={[-0.1, 0.5, -0.66]} />
      <mesh geometry={g.seat} material={cushion} position={[-0.1, 0.5, 0.66]} />
      <mesh geometry={g.backCushion} material={cushion} position={[0.2, 0.78, -0.66]} rotation-z={-0.12} />
      <mesh geometry={g.backCushion} material={cushion} position={[0.2, 0.78, 0.66]} rotation-z={-0.12} />
      <mesh geometry={g.pillow} material={pillow} position={[0.08, 0.8, -1.1]} rotation={[0.1, 0.25, -0.15]} />
      {/* plinth legs */}
      <mesh material={metal("#2A1A16", 0.5)} position={[0, 0.035, 0]}>
        <boxGeometry args={[0.9, 0.07, 2.9]} />
      </mesh>
    </group>
  );
}

function Vessel() {
  const geo = useMemo(() => {
    const pts = [
      [0.0, 0],
      [0.12, 0],
      [0.17, 0.05],
      [0.24, 0.22],
      [0.26, 0.36],
      [0.2, 0.52],
      [0.1, 0.62],
      [0.08, 0.72],
      [0.11, 0.78],
      [0.0, 0.78],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  return (
    <group position={[3.4, 0, -5.6]}>
      <mesh material={stone(P.travertine, { repeat: 1, bump: 0.02 })} position={[0, 0.48, 0]}>
        <boxGeometry args={[0.62, 0.96, 0.62]} />
      </mesh>
      <mesh geometry={geo} material={stone("#9A4A31", { roughness: 0.75, repeat: 1, bump: 0.015 })} position={[0, 0.96, 0]} />
      {/* a dry branch: a few thin strokes against the glass */}
      {[
        [0.0, 0.2, 0.05],
        [0.18, -0.25, 0.1],
        [-0.22, 0.05, -0.18],
      ].map(([rz, rx, ry], i) => (
        <mesh key={i} material={paint("#24120E", 0.8)} position={[Math.sin(rz) * -0.3, 1.74 + i * 0.03, Math.sin(rx) * 0.3]} rotation={[rx, ry, rz]}>
          <cylinderGeometry args={[0.004, 0.009, 1.0, 5]} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────── The scene ─────────────────────────────── */

type Pulse = { set: number; at: number };
type Ramp = { from: number; to: number; t0: number };
const RAMP_MS: Record<keyof Devices, number> = { lights: 900, fan: 300, tv: 520 };
const rampAt = (r: Ramp, now: number, ms: number) => {
  const k = clamp01((now - r.t0) / ms);
  return r.from + (r.to - r.from) * k;
};

export function RayaScene() {
  const quality = useQuality();
  const invalidate = useThree((s) => s.invalidate);

  // Materials ---------------------------------------------------------------
  const timber = useMemo(() => {
    const t = makeTimber();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12 / 3.6, 14 / 3.6);
    return t;
  }, []);
  const sky = useMemo(() => {
    const t = makeSky();
    return new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false, color: new THREE.Color(1.08, 1.04, 1.0) });
  }, []);
  const screenTex = useMemo(() => makeScreen(), []);
  const screen = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0B0709",
        roughness: 0.5,
        metalness: 0.05,
        emissive: new THREE.Color(1, 1, 1),
        emissiveMap: screenTex,
        emissiveIntensity: 0,
        envMapIntensity: 0.25,
      }),
    [screenTex],
  );
  const blobTex = useMemo(() => makeBlob(), []);
  const blob = useMemo(() => new THREE.MeshBasicMaterial({ color: "#000000", alphaMap: blobTex, transparent: true, depthWrite: false, opacity: 0.6 }), [blobTex]);
  const shade = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#E8D9C2", roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(P.gold), emissiveIntensity: 0 }),
    [],
  );
  const opal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#EADBC6", roughness: 0.35, emissive: new THREE.Color(P.apricot), emissiveIntensity: 0 }), []);
  const bulb = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(P.gold), toneMapped: false }), []);
  const led = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(P.verdigris), toneMapped: false }), []);
  const ledHalo = useShaftMaterial(P.verdigris, 0, 1);
  const coneMat = useShaftMaterial(P.gold, 0, 1.6);
  const fanBlur = useMemo(() => new THREE.MeshBasicMaterial({ color: "#7A4A34", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), []);
  const gobo = useGobo(quality, "multiply");
  const goboFloor = useGobo(quality, "add");
  const haze = useMemo(() => {
    const { geometry, S } = sunPrism();
    const mat = new THREE.ShaderMaterial({
      vertexShader: WORLD_VERT,
      fragmentShader: HAZE_FRAG,
      uniforms: {
        uOrigin: { value: new THREE.Vector3(...ORIGIN) },
        uSun: { value: SUN.clone() },
        uWin: { value: new THREE.Vector4(WIN.x0, WIN.x1, WIN.y0, WIN.y1) },
        uWinZ: { value: WIN.z },
        uMull: { value: new THREE.Vector3(...MULLIONS) },
        uTransom: { value: TRANSOM },
        uColor: { value: new THREE.Color(P.apricot) },
        uDensity: { value: quality === "low" ? 0.05 : 0.06 },
        uS: { value: S },
        uRoomMin: { value: new THREE.Vector3(-6, 0, WIN.z) },
        uRoomMax: { value: new THREE.Vector3(6, H, 7) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });
    return { geometry, mat };
  }, [quality]);

  const runTv = useRun(RUNS[0], quality);
  const runFan = useRun(RUNS[1], quality);
  const runLights = useRun(RUNS[2], quality);
  const runs = useMemo(() => ({ tv: runTv, fan: runFan, lights: runLights }), [runTv, runFan, runLights]);

  const fanGeo = useMemo(() => ({ blade: rbox(0.78, 0.014, 0.15, 0.006, 2) }), []);

  // Dispose what this scene creates imperatively (cached system materials are shared and stay).
  // One effect per resource group, so a runtime quality change (PerformanceMonitor) only
  // replaces the quality-dependent ones instead of tearing down textures still in use.
  useEffect(() => () => timber.dispose(), [timber]);
  useEffect(
    () => () => {
      sky.map?.dispose();
      sky.dispose();
    },
    [sky],
  );
  useEffect(() => () => screenTex.dispose(), [screenTex]);
  useEffect(() => () => screen.dispose(), [screen]);
  useEffect(() => () => blobTex.dispose(), [blobTex]);
  useEffect(() => () => blob.dispose(), [blob]);
  useEffect(() => () => [shade, opal, bulb, led, fanBlur].forEach((m) => m.dispose()), [shade, opal, bulb, led, fanBlur]);
  useEffect(() => () => [ledHalo, coneMat].forEach((m) => m.dispose()), [ledHalo, coneMat]);
  useEffect(() => () => gobo.dispose(), [gobo]);
  useEffect(() => () => goboFloor.dispose(), [goboFloor]);
  useEffect(
    () => () => {
      haze.mat.dispose();
      haze.geometry.dispose();
    },
    [haze],
  );
  useEffect(() => () => fanGeo.blade.dispose(), [fanGeo]);

  // Lights ------------------------------------------------------------------
  const sun = useRef<THREE.DirectionalLight>(null);
  const lampLight = useRef<THREE.PointLight>(null);
  const tvLight = useRef<THREE.PointLight>(null);
  const blades = useRef<THREE.Group>(null);
  const heads = useRef<Partial<Record<keyof Devices, THREE.Sprite | null>>>({});
  const sunTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, 0);
    return o;
  }, []);

  // Simulation state (refs, never React state) -------------------------------
  const sim = useRef<{
    level: Record<keyof Devices, number>;
    ramps: Record<keyof Devices | "spin", Ramp>;
    pulses: Record<keyof Devices, Pulse>;
    fanSpeed: number;
    fanAngle: number;
    labelsShown: boolean;
    lastKey: string;
    labels: Partial<Record<string, HTMLElement | null>>;
  } | null>(null);
  if (sim.current == null) {
    const d = world.get().devices;
    sim.current = {
      level: { lights: d.lights ? 1 : 0, fan: d.fan ? 1 : 0, tv: d.tv ? 1 : 0 },
      ramps: {
        lights: { from: 0, to: d.lights ? 1 : 0, t0: -1e9 },
        fan: { from: 0, to: d.fan ? 1 : 0, t0: -1e9 },
        tv: { from: 0, to: d.tv ? 1 : 0, t0: -1e9 },
        spin: { from: 0, to: d.fan ? 1 : 0, t0: -1e9 },
      },
      pulses: { lights: { set: -1e9, at: -1e9 }, fan: { set: -1e9, at: -1e9 }, tv: { set: -1e9, at: -1e9 } },
      fanSpeed: d.fan ? 1 : 0,
      fanAngle: 0,
      labelsShown: true,
      lastKey: "",
      labels: {},
    };
  }

  // Every pulse the HTML layer emits is recorded per device (the store keeps only the latest).
  useEffect(() => {
    let last = world.get().pulse.at;
    return world.subscribe(() => {
      const p = world.get().pulse;
      if (p.device && p.at !== last) sim.current!.pulses[p.device] = { set: performance.now(), at: p.at };
      last = p.at;
      invalidate();
    });
  }, [invalidate]);

  const proj = useMemo(() => new THREE.Vector3(), []);
  const anchors = useMemo(
    () =>
      [
        // The lamp when it is in frame, otherwise the nearer pendant.
        { key: "lights", at: new THREE.Vector3(LAMP.x, 1.98, LAMP.z), alt: new THREE.Vector3(-3.25, 3.6, -2.85) },
        { key: "fan", at: new THREE.Vector3(FAN.x, H - FAN_DROP - 0.16, FAN.z) }, // label hangs below
        { key: "tv", at: new THREE.Vector3(-5.9, TV.y + TV.h / 2 + 0.12, TV.z) },
        { key: "controller", at: new THREE.Vector3(CTRL.x + 0.05, CTRL.y + 0.05, CTRL.z) },
      ] as const,
    [],
  );

  useFrame((state, delta) => {
    const s = sim.current!;
    const active = isActive("raya");
    if (!active) {
      if (s.labelsShown) {
        anchors.forEach((a) => {
          const el = s.labels[a.key];
          if (el) {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
          }
        });
        s.labelsShown = false;
      }
      return;
    }
    const dt = Math.min(0.05, delta);
    const now = performance.now();
    const reduced = prefersReducedMotion();
    const devices = world.get().devices;
    let moving = false;

    // Devices respond only once their pulse has arrived.
    (["lights", "fan", "tv"] as const).forEach((d) => {
      const pulse = s.pulses[d];
      const arrive = pulse.at + TRAVEL_MS;
      const inFlight = now < arrive && now >= pulse.set - 1;
      if (inFlight) {
        moving = true;
        return;
      }
      // Time-based ramps: the same wall-clock duration on a fast GPU or a slow one.
      const target = devices[d] ? 1 : 0;
      const r = s.ramps[d];
      if (r.to !== target) {
        r.from = s.level[d];
        r.to = target;
        r.t0 = now;
      }
      s.level[d] = rampAt(r, now, reduced ? 1 : RAMP_MS[d]);
      if (s.level[d] !== r.to) moving = true;
    });

    // Pulses along the runs, and the controller's LED.
    let ledLevel = 0.55;
    (["lights", "fan", "tv"] as const).forEach((d) => {
      const r = runs[d];
      const pulse = s.pulses[d];
      const u = r.mat.uniforms;
      const t = (now - pulse.at) / TRAVEL_MS;
      if (now >= pulse.set && now < pulse.at) {
        // The instruction is arriving at the controller: it blinks while it receives.
        ledLevel = Math.max(ledLevel, Math.floor(now / 70) % 2 ? 2.6 : 0.6);
        moving = true;
      }
      if (t >= 0 && t < 1.6) {
        u.uHead.value = Math.min(1.08, ease(Math.min(1, t)) * 1.08);
        u.uTravel.value = t < 1 ? 1 : Math.max(0, 1 - (t - 1) / 0.6);
        if (t < 1) ledLevel = Math.max(ledLevel, 3.2 * (1 - t) + 0.6);
        moving = true;
      } else u.uTravel.value = 0;
      const spr = heads.current[d];
      if (spr) {
        const along = ease(Math.min(1, t)) * 1.08;
        spr.visible = t >= 0 && t < 1.35;
        if (spr.visible) {
          r.path.getPointAt(Math.min(1, along), spr.position);
          const bloom = clamp01((along - 1) / 0.08) * clamp01((t - 0.75) / 0.6);
          spr.scale.setScalar(0.38 + bloom * 0.7);
          r.head.opacity = t < 0.95 ? 1 : Math.max(0, 1 - (t - 0.95) / 0.4);
        }
      }
      // A faint trace stays on the run while its appliance is on.
      u.uLive.value = 0.07 * s.level[d];
    });
    led.color.set(P.verdigris).multiplyScalar(ledLevel);
    ledHalo.uniforms.uIntensity.value = 0.035 + Math.max(0, (ledLevel - 0.6) * 0.18);

    // Lights: lamp, pendants, their warm light.
    const L = s.level.lights;
    const Le = L * L * (3 - 2 * L);
    shade.emissiveIntensity = Le * 1.5;
    opal.emissiveIntensity = Le * 1.7;
    bulb.color.set(P.gold).multiplyScalar(0.06 + Le * 3.2);
    coneMat.uniforms.uIntensity.value = Le * 0.16;
    if (lampLight.current) lampLight.current.intensity = Le * (quality === "low" ? 19 : 30);

    // Television.
    const T = s.level.tv;
    screen.emissiveIntensity = T * T * 1.35;
    if (tvLight.current) tvLight.current.intensity = T * T * 9;

    // Fan: spins up slowly, coasts down longer.
    const spin = s.ramps.spin;
    const fanTarget = s.level.fan > 0.5 ? 1 : 0;
    if (spin.to !== fanTarget) {
      spin.from = s.fanSpeed;
      spin.to = fanTarget;
      spin.t0 = now;
    }
    s.fanSpeed = rampAt(spin, now, fanTarget ? 2600 : 5200);
    if (s.fanSpeed > 0.001) {
      s.fanAngle += s.fanSpeed * (reduced ? 2 : 7.5) * dt;
      if (blades.current) blades.current.rotation.y = s.fanAngle;
      moving = true;
    }
    fanBlur.opacity = reduced ? 0 : Math.max(0, s.fanSpeed - 0.3) * 0.32;

    // Labels in the HTML layer, pinned to the appliances in the room.
    const p = actProgress("raya");
    const show = clamp01((p - 0.14) / 0.06) * (1 - clamp01((p - 0.86) / 0.05));
    const { width, height } = state.size;
    state.camera.updateMatrixWorld();
    // Read every tag's width before writing any style, so the browser lays out once, not per tag.
    const widths = anchors.map((a) => {
      let el = s.labels[a.key];
      if (!el || !el.isConnected) {
        el = document.querySelector<HTMLElement>(`[data-raya-anchor="${a.key}"]`);
        s.labels[a.key] = el;
      }
      return el ? el.offsetWidth : 0;
    });
    anchors.forEach((a, i) => {
      const el = s.labels[a.key];
      if (!el) return;
      const place = (v: THREE.Vector3) => {
        proj.set(v.x + ORIGIN[0], v.y + ORIGIN[1], v.z + ORIGIN[2]).project(state.camera);
        const px = (proj.x * 0.5 + 0.5) * width;
        const py = (-proj.y * 0.5 + 0.5) * height;
        // Above the command line, below the header.
        return { px, py, ok: proj.z < 1 && px > 12 && px < width - 12 && py > 60 && py < height * 0.72 };
      };
      let at = place(a.at);
      if (!at.ok && "alt" in a) at = place(a.alt);
      const { px: x, py: y, ok: inView } = at;
      const o = inView ? show : 0;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // Keep the tag itself on screen; its leader still points at the object.
      const half = widths[i] / 2;
      const dx = Math.min(Math.max(x, half + 10), width - half - 10) - x;
      el.style.setProperty("--dx", `${dx.toFixed(1)}px`);
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o > 0.02 ? "visible" : "hidden";
    });
    s.labelsShown = true;
    // Scenes run before the director in a frame, so the camera/progress read here can be one frame
    // old. If they changed since the last frame, ask for one more so the labels land exactly.
    const cam = state.camera as THREE.PerspectiveCamera;
    const key = `${p.toFixed(4)}|${cam.position.x.toFixed(3)},${cam.position.y.toFixed(3)},${cam.position.z.toFixed(3)}|${cam.quaternion.x.toFixed(4)},${cam.quaternion.y.toFixed(4)}|${cam.fov.toFixed(2)}`;
    if (key !== s.lastKey) {
      s.lastKey = key;
      moving = true;
    }

    if (moving) invalidate();
  });

  const low = quality === "low";
  const frameMat = metal("#2A1C17", 0.42);
  const plaster = stone("#B49A84", { roughness: 0.96, repeat: 3, bump: 0.025 });
  const concrete = stone("#77625A", { roughness: 0.92, repeat: 2, bump: 0.045 });
  const walnut = paint("#3E2016", 0.5);
  const travertine = stone(P.travertine, { roughness: 0.7, repeat: 1, bump: 0.02 });

  return (
    <group>
      {/* ── Floor: oiled oak, softly reflective on capable GPUs ── */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[12, 14]} />
        {low ? (
          <meshStandardMaterial map={timber} roughness={0.55} metalness={0} />
        ) : (
          <MeshReflectorMaterial
            map={timber}
            roughness={0.6}
            metalness={0}
            mirror={0.32}
            blur={[420, 120]}
            resolution={512}
            mixBlur={1}
            mixStrength={2.2}
            depthScale={0.5}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
          />
        )}
      </mesh>
      {/* Sunlight through the glass on the boards and the right-hand wall */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} material={goboFloor} renderOrder={5}>
        <planeGeometry args={[12, 14]} />
      </mesh>
      <mesh rotation-y={-Math.PI / 2} position={[5.996, H / 2, 0]} material={gobo} renderOrder={5}>
        <planeGeometry args={[14, H]} />
      </mesh>

      {/* ── Shell: plaster walls, board-formed concrete around the glass, beams ── */}
      <mesh material={plaster} position={[-6.15, H / 2, 0]}>
        <boxGeometry args={[0.3, H, 14]} />
      </mesh>
      <mesh material={plaster} position={[6.15, H / 2, 0]}>
        <boxGeometry args={[0.3, H, 14]} />
      </mesh>
      <mesh material={plaster} position={[0, H + 0.15, 0]}>
        <boxGeometry args={[12.6, 0.3, 14]} />
      </mesh>
      <mesh material={concrete} position={[-4.65, H / 2, -7.15]}>
        <boxGeometry args={[3.3, H, 0.3]} />
      </mesh>
      <mesh material={concrete} position={[5.25, H / 2, -7.15]}>
        <boxGeometry args={[2.1, H, 0.3]} />
      </mesh>
      <mesh material={concrete} position={[0.6, (WIN.y1 + H) / 2, -7.15]}>
        <boxGeometry args={[WIN.x1 - WIN.x0, H - WIN.y1, 0.3]} />
      </mesh>
      <mesh material={concrete} position={[0.6, WIN.y0 / 2, -7.15]}>
        <boxGeometry args={[WIN.x1 - WIN.x0, WIN.y0, 0.3]} />
      </mesh>
      {[-3.6, 2.4].map((z) => (
        <mesh key={z} material={concrete} position={[0, H - 0.24, z]}>
          <boxGeometry args={[12, 0.48, 0.34]} />
        </mesh>
      ))}

      {/* ── The glass wall: bronze frame, mullions, transom ── */}
      <group position={[0, 0, WIN.z + 0.02]}>
        {[WIN.x0, ...MULLIONS, WIN.x1].map((x, i) => (
          <mesh key={i} material={frameMat} position={[x, (WIN.y0 + WIN.y1) / 2, 0]}>
            <boxGeometry args={[i === 0 || i === 4 ? 0.12 : 0.07, WIN.y1 - WIN.y0, 0.16]} />
          </mesh>
        ))}
        {[WIN.y0, TRANSOM, WIN.y1].map((y, i) => (
          <mesh key={i} material={frameMat} position={[0.6, y, 0]}>
            <boxGeometry args={[WIN.x1 - WIN.x0, i === 1 ? 0.08 : 0.12, 0.16]} />
          </mesh>
        ))}
      </group>
      {/* Beyond the glass: dusk */}
      <mesh position={[0.6, 8, -45]} material={sky}>
        <planeGeometry args={[96, 52]} />
      </mesh>
      {/* Light shafts through the glass */}
      <mesh geometry={haze.geometry} material={haze.mat} renderOrder={12} />

      {/* ── Living area ── */}
      <mesh position={[-3.0, 0.006, -2.4]} material={fabric("#3A1E22", P.terracotta)}>
        <boxGeometry args={[4.2, 0.012, 3.5]} />
      </mesh>
      <Sofa quality={quality} />
      <mesh rotation-x={-Math.PI / 2} position={[-0.3, 0.014, -2.4]} material={blob} scale={[1.6, 3.8, 1]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Travertine table */}
      <mesh material={travertine} position={[-3.0, 0.19, -2.4]}>
        <boxGeometry args={[0.8, 0.38, 1.4]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-3.0, 0.015, -2.4]} material={blob} scale={[1.3, 2.0, 1]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* A few objects on it */}
      <mesh material={paint("#2A1712", 0.4)} position={[-2.95, 0.43, -2.0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.1, 24]} />
      </mesh>
      <mesh material={paint(P.bone, 0.85)} position={[-3.05, 0.4, -2.75]} rotation-y={0.3}>
        <boxGeometry args={[0.26, 0.04, 0.34]} />
      </mesh>

      {/* Floating walnut console, the television above it, the controller on top */}
      <mesh material={walnut} position={[-5.75, 0.6, -2.6]}>
        <boxGeometry args={[0.5, 0.44, 4.6]} />
      </mesh>
      <mesh material={paint("#1C0E0B", 0.6)} position={[-5.497, 0.6, -2.6]}>
        <boxGeometry args={[0.006, 0.012, 4.5]} />
      </mesh>
      <group position={[-5.94, TV.y, TV.z]}>
        <mesh material={paint("#140C0E", 0.35)}>
          <boxGeometry args={[0.05, TV.h, TV.w]} />
        </mesh>
        <mesh material={screen} position={[0.026, 0, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[TV.w - 0.04, TV.h - 0.04]} />
        </mesh>
      </group>
      {!low && <pointLight ref={tvLight} position={[-4.9, TV.y, TV.z]} color={P.apricot} intensity={0} distance={7} decay={2} />}

      {/* The ESP-style controller: a small board on a travertine dock, cable into the wall */}
      <group position={CTRL.toArray()} scale={1.35}>
        <mesh material={travertine} position={[0, 0.012, 0]}>
          <boxGeometry args={[0.2, 0.024, 0.28]} />
        </mesh>
        <mesh material={paint("#15100F", 0.45)} position={[0, 0.032, 0]}>
          <boxGeometry args={[0.1, 0.016, 0.2]} />
        </mesh>
        {/* module shield can */}
        <mesh material={metal("#B9A792", 0.3)} position={[0, 0.045, -0.045]}>
          <boxGeometry args={[0.064, 0.01, 0.07]} />
        </mesh>
        {/* pin headers */}
        {[-0.042, 0.042].map((x) => (
          <mesh key={x} material={paint("#0E0A0A", 0.6)} position={[x, 0.047, 0.01]}>
            <boxGeometry args={[0.01, 0.014, 0.17]} />
          </mesh>
        ))}
        {/* usb + cable */}
        <mesh material={metal("#CFC2B2", 0.25)} position={[0, 0.044, 0.1]}>
          <boxGeometry args={[0.03, 0.01, 0.018]} />
        </mesh>
        <mesh material={led} position={[0.022, 0.045, 0.055]}>
          <boxGeometry args={[0.008, 0.006, 0.008]} />
        </mesh>
        <mesh material={paint("#1A1012", 0.6)} position={[-0.17, 0.02, -0.02]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 6]} />
        </mesh>
        <LightCone color={P.verdigris} material={ledHalo} radiusTop={0.01} radiusBottom={0.16} height={0.24} position={[0.022, 0.16, 0.055]} />
      </group>

      {/* Inlaid runs from the controller, and the pulses that travel them */}
      {(["tv", "fan", "lights"] as const).map((d) => (
        <group key={d}>
          <mesh geometry={runs[d].inlay} material={metal("#5B4636", 0.35)} />
          <mesh geometry={runs[d].glow} material={runs[d].mat} renderOrder={14} />
          <sprite
            ref={(o) => {
              heads.current[d] = o;
            }}
            material={runs[d].head}
            visible={false}
            renderOrder={15}
          />
        </group>
      ))}

      {/* Floor lamp beside the sofa */}
      <group position={LAMP.toArray()}>
        <mesh material={metal("#2A1C17", 0.35)} position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.17, 0.19, 0.024, 32]} />
        </mesh>
        <mesh material={metal("#2A1C17", 0.35)} position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.62, 8]} />
        </mesh>
        <mesh material={shade} position={[0, 1.7, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.34, 40, 1, true]} />
        </mesh>
        <mesh material={bulb} position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.05, 16, 12]} />
        </mesh>
        <LightCone color={P.gold} material={coneMat} radiusTop={0.24} radiusBottom={0.7} height={1.5} position={[0, 0.78, 0]} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[LAMP.x, 0.013, LAMP.z]} material={blob} scale={[0.6, 0.6, 1]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Pendants over the table, on long cords from the high ceiling */}
      {[
        [-2.75, 2.5, -2.0],
        [-3.25, 2.85, -2.85],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh material={opal}>
            <sphereGeometry args={[0.17, low ? 16 : 32, low ? 12 : 24]} />
          </mesh>
          <mesh material={metal("#2A1C17", 0.4)} position={[0, 0.19, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.05, 16]} />
          </mesh>
          <mesh material={paint("#1A1012", 0.7)} position={[0, (H - y) / 2 + 0.1, 0]}>
            <cylinderGeometry args={[0.004, 0.004, H - y - 0.2, 4]} />
          </mesh>
        </group>
      ))}
      <LightCone color={P.gold} material={coneMat} radiusTop={0.15} radiusBottom={1.05} height={2.3} position={[-3.0, 1.3, -2.4]} />
      <pointLight ref={lampLight} position={[-1.4, 2.2, -3.4]} color={P.apricot} intensity={0} distance={14} decay={1.5} />

      {/* Ceiling fan on a long downrod */}
      <group position={FAN.toArray()}>
        <mesh material={metal("#3A2A22", 0.35)} position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.08, 24]} />
        </mesh>
        <mesh material={metal("#3A2A22", 0.35)} position={[0, -FAN_DROP / 2, 0]}>
          <cylinderGeometry args={[0.018, 0.018, FAN_DROP - 0.1, 8]} />
        </mesh>
        <group position={[0, -FAN_DROP, 0]}>
          <mesh material={metal("#3A2A22", 0.3)}>
            <cylinderGeometry args={[0.17, 0.15, 0.16, 32]} />
          </mesh>
          <mesh material={metal("#3A2A22", 0.3)} position={[0, -0.1, 0]} scale={[1, 0.45, 1]}>
            <sphereGeometry args={[0.15, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          </mesh>
          <group ref={blades}>
            {[0, 1, 2].map((i) => (
              <group key={i} rotation-y={(i / 3) * Math.PI * 2}>
                <mesh material={metal("#3A2A22", 0.35)} position={[0.22, 0, 0]}>
                  <boxGeometry args={[0.18, 0.02, 0.04]} />
                </mesh>
                <mesh geometry={fanGeo.blade} material={paint("#5A3122", 0.55)} position={[0.66, -0.01, 0]} rotation-x={0.16} />
              </group>
            ))}
          </group>
          <mesh material={fanBlur} position={[0, -0.01, 0]} renderOrder={6}>
            <cylinderGeometry args={[1.05, 1.05, 0.01, 48, 1, true]} />
          </mesh>
          <mesh material={fanBlur} position={[0, -0.01, 0]} rotation-x={-Math.PI / 2} renderOrder={6}>
            <ringGeometry args={[0.28, 1.05, 48]} />
          </mesh>
        </group>
      </group>

      {/* Vessel on a plinth, silhouetted against the glass */}
      <Vessel />
      <mesh rotation-x={-Math.PI / 2} position={[3.4, 0.012, -5.6]} material={blob} scale={[1.0, 1.0, 1]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Long travertine bench along the right wall, where the light lands */}
      <mesh material={travertine} position={[5.72, 0.21, -0.8]}>
        <boxGeometry args={[0.56, 0.42, 7.6]} />
      </mesh>

      {/* ── Light: low sun from behind the glass, warm ambient ── */}
      <hemisphereLight args={["#9A6A58", "#2A1418", 0.95]} />
      <directionalLight ref={sun} position={[-SUN.x * 20, -SUN.y * 20, -SUN.z * 20]} target={sunTarget} color={P.apricot} intensity={1.1} />
      <primitive object={sunTarget} />
    </group>
  );
}
