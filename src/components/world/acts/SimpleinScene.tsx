"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { ActDef, CamOut } from "./types";
import { actProgress, director, isActive } from "../director";
import { P } from "../system/palette";
import { stone } from "../system/materials";
import { Floor } from "../system/Floor";
import { useQuality } from "../system/quality";
import { prefersReducedMotion } from "@/lib/hooks";
import { ROLES, SEG, simpleinLink } from "@/components/worlds/simplein-school/plan";

/*
 * ACT 03·3 — SIMPLEIN SCHOOL. "Complexity, made simple."
 *
 * An architect's model of the ERP, in travertine, on a plinth in a bright
 * gallery. Four role wings (Admin, Teacher, Parent, Student) — one room per
 * genuine module, engraved in the floor — meet a central core through four
 * passages: the API, each with three gates (auth, RBAC, tenant guard). At the
 * core, the database: two tenant vaults divided by a terracotta wall (the
 * row-level-security policy). Signing in to a school opens its vault; the
 * other stays sealed. Verdigris inlays trace the path of a request.
 *
 * Plan (local units): plinth top at Y0, north = −Z. Wings: Admin S, Teacher W,
 * Parent N, Student E (clockwise from above, so the camera's orbit visits
 * them in reading order).
 */

const Y0 = 0.6; // plinth top
const GAP = 0.16; // height of the recessed base under the plinth
const PL = 28; // plinth half-size
const CORE = 4.5; // courtyard half-size
const W0 = 10; // wing inner end (radius)
const W1 = 25; // wing outer end (radius)
const WH = 3.5; // wing half-width
const GATES = [6.0, 7.6, 9.2] as const;
const GATE_NAMES = ["Tenant guard", "RBAC", "Auth"] as const; // inner → outer; a request meets Auth first
const WING_ANGLE = [0, -Math.PI / 2, -Math.PI, -1.5 * Math.PI];
const KEY = new THREE.Vector3(-26, 34, 18); // key light direction (also bakes the shadows)

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Dir = { dx: number; dz: number; lx: number; lz: number };
const dirOf = (a: number): Dir => ({ dx: Math.round(Math.sin(a)), dz: Math.round(Math.cos(a)), lx: Math.round(Math.cos(a)), lz: Math.round(-Math.sin(a)) });
type Box = { x: number; z: number; sx: number; sz: number; y: number; h: number };

/** A box given in (radial, lateral) coordinates of a direction. */
function seg(out: Box[], D: Dir, r0: number, r1: number, s0: number, s1: number, h: number, y = 0) {
  const r = (r0 + r1) / 2;
  const s = (s0 + s1) / 2;
  const alongX = Math.abs(D.dx) > 0.5;
  out.push({ x: D.dx * r + D.lx * s, z: D.dz * r + D.lz * s, sx: alongX ? r1 - r0 : s1 - s0, sz: alongX ? s1 - s0 : r1 - r0, y, h });
}

/** The whole plan, built once. */
function buildPlan() {
  const walls: Box[] = [];
  const vault: Box[] = [];
  const lines: Box[] = [];
  const rooms: { wing: number; i: number; box: Box }[] = [];
  WING_ANGLE.forEach((a, k) => {
    const D = dirOf(a);
    const n = ROLES[k].modules.length;
    const L = (W1 - W0) / n;
    // Wing shell
    seg(walls, D, W0, W1, WH - 0.3, WH, 1.5);
    seg(walls, D, W0, W1, -WH, -WH + 0.3, 1.5);
    seg(walls, D, W0, W0 + 0.3, -WH + 0.3, -1.25, 1.5);
    seg(walls, D, W0, W0 + 0.3, 1.25, WH - 0.3, 1.5);
    seg(walls, D, W1 - 0.3, W1, -WH + 0.3, -0.85, 1.5); // the portway
    seg(walls, D, W1 - 0.3, W1, 0.85, WH - 0.3, 1.5);
    // One room per module, connected by doorways
    for (let i = 1; i < n; i++) {
      const r = W1 - i * L;
      seg(walls, D, r - 0.1, r + 0.1, -WH + 0.3, -0.65, 0.95);
      seg(walls, D, r - 0.1, r + 0.1, 0.65, WH - 0.3, 0.95);
    }
    for (let i = 0; i < n; i++) {
      const b: Box[] = [];
      const r = W1 - (i + 0.5) * L;
      seg(b, D, r - L / 2 + 0.32, r + L / 2 - 0.32, -WH + 0.55, WH - 0.55, 0.03);
      rooms.push({ wing: k, i, box: b[0] });
    }
    // The passage (API) and its three gates
    seg(walls, D, CORE + 0.3, W0, -1.25, -1.05, 0.7);
    seg(walls, D, CORE + 0.3, W0, 1.05, 1.25, 0.7);
    for (const g of GATES) {
      seg(walls, D, g - 0.16, g + 0.16, -1.42, -1.05, 2.1);
      seg(walls, D, g - 0.16, g + 0.16, 1.05, 1.42, 2.1);
      seg(walls, D, g - 0.2, g + 0.2, -1.42, 1.42, 0.42, 2.1);
    }
    // Courtyard wall on this side, open where the passage arrives
    seg(walls, D, CORE, CORE + 0.3, -CORE - 0.3, -1.1, 1.9);
    seg(walls, D, CORE, CORE + 0.3, 1.1, CORE + 0.3, 1.9);
    // The request's path: portway → passage → the vault block (verdigris inlay)
    const end = Math.abs(D.dz) > 0.5 ? 3.4 : 3.0;
    seg(lines, D, end, W1, -0.035, 0.035, 0.012);
  });
  for (const sgn of [-1, 1]) {
    vault.push({ x: sgn * 2.89, z: 0, sx: 0.22, sz: 4.8, y: 0, h: 2.3 });
    vault.push({ x: sgn * 1.59, z: -2.29, sx: 2.82, sz: 0.22, y: 0, h: 2.3 });
    vault.push({ x: sgn * 1.59, z: 2.29, sx: 2.82, sz: 0.22, y: 0, h: 2.3 });
  }
  const rls: Box = { x: 0, z: 0, sx: 0.36, sz: 6.8, y: 0, h: 3.3 };
  const lids: Box[] = [-1, 1].map((sgn) => ({ x: sgn * 1.59, z: 0, sx: 3.0, sz: 5.0, y: 2.3, h: 0.2 }));
  return { walls, vault, lines, rooms, rls, lids };
}

/* ═════════════ Canvas typography (engraved into the stone) ═════════════ */

const fontVar = (name: string, fallback: string) => {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
};
const fonts = () => ({ mono: fontVar("--font-jetbrains", "ui-monospace, monospace"), serif: fontVar("--font-fraunces", "Georgia, serif") });

/** Letter-spaced text, drawn glyph by glyph (canvas letterSpacing isn't everywhere). */
function tracked(g: CanvasRenderingContext2D, text: string, x: number, y: number, track: number, align: "left" | "center" | "right") {
  const chars = [...text];
  const widths = chars.map((c) => g.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0) + track * (chars.length - 1);
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  g.textAlign = "left";
  chars.forEach((c, i) => {
    g.fillText(c, cx, y);
    cx += widths[i] + track;
  });
  return total;
}

/** Engraved: a dark cut with a faint lit lower lip. */
function engrave(g: CanvasRenderingContext2D, draw: () => void, alpha = 1, lip = 1.5) {
  g.save();
  g.translate(0, lip);
  g.fillStyle = `rgba(255,248,236,${0.55 * alpha})`;
  draw();
  g.restore();
  g.fillStyle = `rgba(26,18,22,${0.8 * alpha})`;
  draw();
}

function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const redraw = () => {
    g.clearRect(0, 0, w, h);
    paint(g);
    t.needsUpdate = true;
  };
  redraw();
  return { tex: t, redraw };
}

/** A label lying on the ground, read by someone looking along `a` (horizontal unit vector). */
function groundQuat(ax: number, az: number) {
  const Y = new THREE.Vector3(ax, 0, az);
  const Z = new THREE.Vector3(0, 1, 0);
  const X = new THREE.Vector3().crossVectors(Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}
/** A label on a vertical face whose outward normal is n (horizontal). */
function faceQuat(nx: number, nz: number) {
  const Z = new THREE.Vector3(nx, 0, nz);
  const Y = new THREE.Vector3(0, 1, 0);
  const X = new THREE.Vector3().crossVectors(Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}

const WING_PX = 80; // layout px per unit on the wing floors (the canvas itself may be smaller)
function paintWing(k: number, px: number) {
  const role = ROLES[k];
  const n = role.modules.length;
  const L = (W1 - W0) / n;
  return (g: CanvasRenderingContext2D) => {
    const { mono, serif } = fonts();
    g.setTransform(px / WING_PX, 0, 0, px / WING_PX, 0, 0);
    const cx = 5 * WING_PX;
    role.modules.forEach((m, i) => {
      const y = (W1 - (i + 0.5) * L - W0) * WING_PX;
      g.font = `500 17px ${mono}`;
      engrave(g, () => tracked(g, `${role.code}·${String(i + 1).padStart(2, "0")}`, cx, y - 80, 4, "center"), 0.6);
      // Long names shrink to stay clear of the partitions.
      const label = m.toUpperCase();
      g.font = `500 33px ${mono}`;
      const wide = [...label].reduce((w, c) => w + g.measureText(c).width + 3, 0);
      g.font = `500 ${Math.min(33, Math.floor((33 * 5.1 * WING_PX) / wide))}px ${mono}`;
      engrave(g, () => tracked(g, label, cx, y - 34, 3, "center"), 1, 2);
    });
    // The wing's name, cut into the plinth beyond its portway.
    g.font = `${k === 0 ? "" : "italic "}300 138px ${serif}`;
    g.textAlign = "center";
    engrave(g, () => g.fillText(role.name, cx, (26.9 - W0) * WING_PX), 0.85, 3);
    g.setTransform(1, 0, 0, 1, 0, 0);
  };
}

/* ═════════════ Camera ═════════════ */

type Shot = { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number };
const mk = (): Shot => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 34 });
const A = mk();
const B = mk();
const set = (s: Shot, p: [number, number, number], t: [number, number, number], fov: number) => {
  s.pos.set(...p);
  s.tgt.set(...t);
  s.fov = fov;
};

function shotIntro(s: Shot, m: boolean, drift: number) {
  if (m) set(s, [44 - drift * 4, 62 - drift * 6, 66 - drift * 6], [-2, -7, 6], 44);
  else set(s, [50 - drift * 5, 50 - drift * 6, 60 - drift * 6], [-13, -1, 12], 32);
}
function shotDoor(s: Shot, m: boolean, drift: number) {
  if (m) set(s, [6, 24 - drift, 58 - drift * 2], [0, -12, 6], 46);
  else set(s, [-3 + drift * 1.5, 15 - drift, 50 - drift * 3], [7.5, -6, 14], 36);
}
/** Beyond a wing's portway, looking down its length toward the core. `k` may be fractional (orbiting). */
function shotWing(s: Shot, m: boolean, k: number, drift: number) {
  const a = -k * (Math.PI / 2);
  const off = 0.24 - drift * 0.06;
  const R = m ? 58 : 44 - drift * 2;
  const H = m ? 36 : 21 - drift;
  s.pos.set(R * Math.sin(a + off), H, R * Math.cos(a + off));
  const dx = Math.sin(a);
  const dz = Math.cos(a);
  const lx = Math.cos(a);
  const lz = -Math.sin(a);
  const shift = m ? 0 : -5;
  s.tgt.set(dx * 17 + lx * shift, m ? -6 : 0, dz * 17 + lz * shift);
  s.fov = m ? 46 : 34;
}
function shotApi(s: Shot, m: boolean, drift: number) {
  if (m) set(s, [18 - drift, 12 - drift * 0.8, 5], [2, -4, 1.5], 50);
  else set(s, [19.5 - drift * 1.5, 8.6 - drift * 0.6, 8.5 - drift * 0.8], [0.4, 0.6, 3.4], 38);
}
function shotCore(s: Shot, m: boolean, drift: number) {
  if (m) set(s, [-0.4, 23 - drift, 18.5], [0, -4.5, 3.5], 46);
  else set(s, [-1.6 + drift * 0.8, 12 - drift * 0.8, 11.5 - drift * 0.6], [-3.4, 0.6, -0.3], 36);
}
function shotPlan(s: Shot, m: boolean, drift: number) {
  if (m) set(s, [0, 100 - drift * 4, 40], [0, 0, 16], 40);
  else set(s, [-16, 102 - drift * 5, 24], [-16, 0, 2.5], 34);
}

function blend(out: CamOut, a: Shot, b: Shot, t: number) {
  const e = ease(clamp01(t));
  out.pos.lerpVectors(a.pos, b.pos, e);
  out.target.lerpVectors(a.tgt, b.tgt, e);
  out.fov = lerp(a.fov, b.fov, e);
}

/** Orbit index between wings: holds on each wing, moves in the first part of each sub-beat. */
const wingParam = (p: number) => {
  const w = clamp01((p - SEG.wings[0]) / (SEG.wings[1] - SEG.wings[0])) * 4;
  const k = Math.min(3, Math.floor(w));
  const f = w - k;
  return { k, f, orbit: k - 1 + smooth(0, 0.3, f) };
};

export const simplein: ActDef = {
  id: "simplein",
  origin: [1200, 0, 0],
  atmosphere: { background: P.bone, fog: [P.bone, 70, 230], exposure: 1 },
  cut: "apricot",
  camera(p, out, ctx) {
    const m = ctx.mobile;
    const span = (r: readonly [number, number]) => clamp01((p - r[0]) / (r[1] - r[0]));
    if (p < SEG.door[0]) {
      shotIntro(A, m, ease(span(SEG.intro)));
      blend(out, A, A, 0);
    } else if (p < SEG.wings[0]) {
      const t = span(SEG.door);
      shotIntro(A, m, 1);
      shotDoor(B, m, smooth(0.35, 1, t));
      blend(out, A, B, t / 0.35);
    } else if (p < SEG.api[0]) {
      const { k, f, orbit } = wingParam(p);
      // Settle in after arriving; unwind while orbiting to the next wing (keeps the path continuous).
      const drift = f < 0.3 && k > 0 ? 1 - smooth(0, 0.3, f) : smooth(0.3, 1, f);
      if (k === 0 && f < 0.3) {
        shotDoor(A, m, 1);
        shotWing(B, m, 0, 0);
        blend(out, A, B, f / 0.3);
      } else {
        shotWing(A, m, Math.max(0, orbit), drift);
        blend(out, A, A, 0);
        // The arc between wings: lift slightly mid-move so the camera clears the plan.
        if (f < 0.3 && k > 0) out.pos.y += Math.sin((f / 0.3) * Math.PI) * 4;
      }
    } else if (p < SEG.core[0]) {
      const t = span(SEG.api);
      shotWing(A, m, 3, 1);
      shotApi(B, m, smooth(0.4, 1, t));
      blend(out, A, B, t / 0.4);
    } else if (p < SEG.plan[0]) {
      const t = span(SEG.core);
      shotApi(A, m, 1);
      shotCore(B, m, smooth(0.25, 1, t));
      blend(out, A, B, t / 0.25);
    } else {
      const t = span(SEG.plan);
      shotCore(A, m, 1);
      shotPlan(B, m, smooth(0.45, 1, t));
      blend(out, A, B, t / 0.45);
    }
    // A breath of parallax for mouse users.
    out.pos.x += ctx.pointer.x * 0.7;
    out.pos.y += ctx.pointer.y * 0.4;
  },
};

/* ═════════════ Scene ═════════════ */

/**
 * This act's progress and whether it is on screen, computed from the director's
 * measured sections with the director's own rules. Scenes run before the
 * director within a frame, so actProgress()/isActive() can be one frame old;
 * after a jump the director may draw only that one frame (the camera snaps), and
 * the vaults would be left in the wrong state. Reading live avoids that.
 */
function live() {
  const s = director.sections.find((x) => x.id === "simplein");
  if (!s) return { p: actProgress("simplein"), active: isActive("simplein") };
  const y = window.scrollY;
  const vh = window.innerHeight;
  const mid = y + vh * 0.5;
  return { p: clamp01((y - s.top) / Math.max(1, s.height - vh)), active: mid >= s.top && mid < s.top + s.height };
}

function Boxes({ boxes, material }: { boxes: Box[]; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    boxes.forEach((b, i) => {
      m.makeScale(b.sx, b.h, b.sz);
      m.setPosition(b.x, Y0 + b.y + b.h / 2, b.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <instancedMesh ref={ref} args={[geo, material, boxes.length]} />;
}

/** Convex hull (monotone chain) of 2D points. */
function hull(pts: [number, number][]) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: [number, number][] = [];
  for (const q of p.reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/**
 * The plinth's top surface: a faint planning grid, the drawing's title block,
 * and every wall's shadow baked from the key light (soft, warm, free at
 * runtime — no shadow maps).
 */
function paintPlinth(boxes: Box[], size: number) {
  const k = size / (PL * 2);
  const X = (x: number) => (x + PL) * k;
  const Z = (z: number) => (z + PL) * k;
  const sx = -KEY.x / KEY.y;
  const sz = -KEY.z / KEY.y;
  return (g: CanvasRenderingContext2D) => {
    const { mono } = fonts();
    // Planning grid
    g.lineWidth = 1;
    for (let u = -PL + 2; u < PL; u += 2) {
      g.strokeStyle = u % 8 === 0 ? "rgba(26,18,22,0.085)" : "rgba(26,18,22,0.045)";
      g.beginPath();
      g.moveTo(X(u), 0);
      g.lineTo(X(u), size);
      g.moveTo(0, Z(u));
      g.lineTo(size, Z(u));
      g.stroke();
    }
    g.strokeStyle = "rgba(26,18,22,0.22)";
    g.strokeRect(X(-PL + 0.9), Z(-PL + 0.9), (PL * 2 - 1.8) * k, (PL * 2 - 1.8) * k);

    // Shadows: drawn solid on their own layer, then laid down once (overlaps don't double up).
    const layer = document.createElement("canvas");
    layer.width = layer.height = size;
    const s = layer.getContext("2d")!;
    const OFF = size * 2;
    s.shadowColor = "rgb(74,42,34)";
    s.shadowBlur = 0.28 * k;
    s.shadowOffsetX = OFF;
    s.fillStyle = "#000";
    for (const b of boxes) {
      const pts: [number, number][] = [];
      for (const hgt of [b.y, b.y + b.h])
        for (const [cx, cz] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ])
          pts.push([X(b.x + (cx * b.sx) / 2 + sx * hgt) - OFF, Z(b.z + (cz * b.sz) / 2 + sz * hgt)]);
      const h = hull(pts);
      s.beginPath();
      h.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
      s.closePath();
      s.fill();
    }
    g.globalAlpha = 0.3;
    g.drawImage(layer, 0, 0);
    // Contact occlusion where walls meet the ground.
    s.clearRect(0, 0, size, size);
    s.shadowBlur = 0.12 * k;
    for (const b of boxes) if (b.y === 0) s.fillRect(X(b.x - b.sx / 2 - 0.05) - OFF, Z(b.z - b.sz / 2 - 0.05), (b.sx + 0.1) * k, (b.sz + 0.1) * k);
    g.globalAlpha = 0.22;
    g.drawImage(layer, 0, 0);
    g.globalAlpha = 1;

    // North point (south-east), as on a drawing. The title block is its own plane (see TITLE).
    const ink = (a: number) => `rgba(26,18,22,${a})`;
    const nx = X(PL - 3);
    const nz = Z(PL - 3);
    g.strokeStyle = ink(0.55);
    g.lineWidth = 0.05 * k;
    g.beginPath();
    g.arc(nx, nz, 1.1 * k, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = ink(0.6);
    g.beginPath();
    g.moveTo(nx, nz - 1.1 * k);
    g.lineTo(nx + 0.3 * k, nz + 0.4 * k);
    g.lineTo(nx, nz + 0.15 * k);
    g.lineTo(nx - 0.3 * k, nz + 0.4 * k);
    g.closePath();
    g.fill();
    g.font = `500 ${Math.round(0.55 * k)}px ${mono}`;
    tracked(g, "N", nx, nz - 1.45 * k, 0, "center");
  };
}

/**
 * The drawing's title block (north-east corner). Its own plane so it can stay
 * hidden in the close wing shots, where it would sit under the HTML copy, and
 * appear only when the camera pulls out to the whole plan.
 */
const TITLE = { x0: 5, x1: 27, z0: -PL + 1.4, z1: -PL + 4.4, px: 64 };
function paintTitle(g: CanvasRenderingContext2D) {
  const { mono } = fonts();
  const k = TITLE.px;
  const right = (PL - 2 - TITLE.x0) * k;
  const Zc = (z: number) => (z - TITLE.z0) * k;
  g.fillStyle = "rgba(26,18,22,0.72)";
  g.font = `500 ${Math.round(0.62 * k)}px ${mono}`;
  tracked(g, "SIMPLEIN SCHOOL — SYSTEM PLAN", right, Zc(-PL + 2.4), 0.12 * k, "right");
  g.fillStyle = "rgba(26,18,22,0.5)";
  g.font = `500 ${Math.round(0.42 * k)}px ${mono}`;
  tracked(g, "DIAGRAM · A MODEL OF THE SYSTEM, NOT A SCREEN", right, Zc(-PL + 3.4), 0.1 * k, "right");
  tracked(g, "4 ROLES · 1 API · TENANTS SEALED BY ROW-LEVEL SECURITY", right, Zc(-PL + 4.0), 0.1 * k, "right");
}

export function SimpleinScene() {
  const quality = useQuality();
  const low = quality === "low";
  const invalidate = useThree((s) => s.invalidate);
  const plan = useMemo(() => buildPlan(), []);

  const key = useRef<THREE.DirectionalLight>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const lidRefs = useRef<(THREE.Group | null)[]>([]);
  const tabletRefs = useRef<(THREE.Group | null)[]>([]);
  const lid = useRef(simpleinLink.tenant === 0 ? [1, 0] : [0, 1]); // eased open amount per vault (time-based)
  const titleRef = useRef<THREE.Mesh>(null);

  const targets = useMemo(() => {
    const keyT = new THREE.Object3D();
    const spotT = new THREE.Object3D();
    return { keyT, spotT };
  }, []);

  /* Materials owned by this space (disposed on unmount). Shared stone comes from the cache. */
  const mats = useMemo(() => {
    const roomMats = plan.rooms.map(() => new THREE.MeshStandardMaterial({ color: "#E9DCCB", roughness: 0.62, emissive: new THREE.Color(P.apricot), emissiveIntensity: 0 }));
    const line = new THREE.MeshStandardMaterial({ color: P.verdigris, roughness: 0.35, metalness: 0.4, emissive: new THREE.Color(P.verdigris), emissiveIntensity: 0.1 });
    const vaultGlow = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(P.gold), toneMapped: false }));
    const tablet = [0, 1].map(() => new THREE.MeshStandardMaterial({ color: P.bone, roughness: 0.5, emissive: new THREE.Color(P.gold), emissiveIntensity: 0 }));
    return { roomMats, line, vaultGlow, tablet };
  }, [plan]);

  /* Engraved typography + the baked plinth surface. */
  const type = useMemo(() => {
    const plinthSize = low ? 1024 : 1600;
    const plinth = canvasTexture(plinthSize, plinthSize, paintPlinth([...plan.walls, ...plan.vault, plan.rls], plinthSize));
    const px = low ? 56 : WING_PX;
    const wings = ROLES.map((_, k) => canvasTexture(10 * px, 18 * px, paintWing(k, px)));
    const gates = GATE_NAMES.map((name) =>
      canvasTexture(560, 90, (g) => {
        g.font = `500 34px ${fonts().mono}`;
        engrave(g, () => tracked(g, name.toUpperCase(), 280, 58, 6, "center"), 0.9);
      }),
    );
    const core = canvasTexture(900, 200, (g) => {
      g.font = `500 28px ${fonts().mono}`;
      engrave(g, () => tracked(g, "POSTGRES", 390, 112, 5, "right"));
      engrave(g, () => tracked(g, "ROW-LEVEL SECURITY", 510, 112, 5, "left"));
    });
    const lids = ["School A", "School B"].map((name) =>
      canvasTexture(300, 500, (g) => {
        const { mono, serif } = fonts();
        g.font = `500 22px ${mono}`;
        engrave(g, () => tracked(g, "TENANT", 150, 205, 5, "center"), 0.6);
        g.font = `italic 300 64px ${serif}`;
        g.textAlign = "center";
        engrave(g, () => g.fillText(name, 150, 280), 0.9, 2);
      }),
    );
    const title = canvasTexture((TITLE.x1 - TITLE.x0) * TITLE.px, (TITLE.z1 - TITLE.z0) * TITLE.px, paintTitle);
    const all = [plinth, ...wings, ...gates, core, ...lids, title];
    const mat = (t: THREE.Texture, opacity = 1) => new THREE.MeshStandardMaterial({ map: t, transparent: true, opacity, depthWrite: false, roughness: 0.9 });
    return {
      all,
      plinth: new THREE.MeshBasicMaterial({ map: plinth.tex, transparent: true, depthWrite: false, fog: false, toneMapped: false }),
      title: new THREE.MeshBasicMaterial({ map: title.tex, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }),
      wings: wings.map((w) => mat(w.tex, 0.55)),
      gates: gates.map((w) => mat(w.tex)),
      core: mat(core.tex, 0), // shown only in the plan overview (see useFrame)
      lids: lids.map((w) => mat(w.tex)),
    };
  }, [plan, low]);

  // Redraw the engraving once the page's fonts are ready (canvas text needs them loaded).
  useEffect(() => {
    let alive = true;
    const { mono, serif } = fonts();
    Promise.all([document.fonts.load(`500 30px ${mono}`), document.fonts.load(`italic 300 60px ${serif}`), document.fonts.load(`300 60px ${serif}`)])
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        type.all.forEach((t) => t.redraw());
        invalidate();
      });
    return () => {
      alive = false;
    };
  }, [type, invalidate]);

  // Dispose what this space created.
  useEffect(
    () => () => {
      type.all.forEach((t) => t.tex.dispose());
      [type.plinth, type.title, ...type.wings, ...type.gates, type.core, ...type.lids].forEach((m) => m.dispose());
      [...mats.roomMats, mats.line, ...mats.vaultGlow, ...mats.tablet].forEach((m) => m.dispose());
    },
    [type, mats],
  );

  /* Shared stone. */
  const wallMat = stone(P.bone, { roughness: 0.86, repeat: 2, bump: 0.012 });
  const vaultMat = stone("#E2D3BE", { roughness: 0.8, repeat: 2, bump: 0.012 });
  const plinthMat = stone(P.travertine, { roughness: 0.9, repeat: 10, bump: 0.02 });
  const rlsMat = stone(P.terracotta, { roughness: 0.78, repeat: 2, bump: 0.02 });
  const lidMat = stone("#E6D6C0", { roughness: 0.7, repeat: 2, bump: 0.01 });
  const gapMat = stone("#8E6F5A", { roughness: 0.9, repeat: 2, bump: 0 });

  // Shadow of the plinth on the gallery floor.
  const floorShadow = useMemo(() => {
    const c = canvasTexture(256, 256, (g) => {
      g.shadowColor = "rgba(74,42,34,0.55)";
      g.shadowBlur = 22;
      g.shadowOffsetX = 600;
      g.fillStyle = "#000";
      g.fillRect(38 - 600, 38, 180, 180);
    });
    return new THREE.MeshBasicMaterial({ map: c.tex, transparent: true, depthWrite: false, toneMapped: false });
  }, []);
  useEffect(
    () => () => {
      floorShadow.map?.dispose();
      floorShadow.dispose();
    },
    [floorShadow],
  );

  const reduced = useMemo(() => prefersReducedMotion(), []);
  const focus = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const { p, active } = live();
    if (!active) return;

    /* Wings: the featured wing's rooms light one after another; the rest stay quiet. */
    const { k: wk, f: wf } = wingParam(p);
    const inWings = p >= SEG.wings[0] && p < SEG.api[0] + 0.02;
    const planGlow = smooth(SEG.plan[0] + 0.04, SEG.plan[0] + 0.1, p);
    plan.rooms.forEach((r, idx) => {
      let lit = 0;
      if (inWings && r.wing === wk) {
        const on = smooth(0.24 + r.i * 0.08, 0.36 + r.i * 0.08, wf);
        const off = wk === 3 ? 1 - smooth(SEG.api[0], SEG.api[0] + 0.03, p) : 1 - smooth(0.97, 1, wf);
        lit = on * off;
      }
      mats.roomMats[idx].emissiveIntensity = Math.max(lit * 0.5, planGlow * 0.16);
    });
    type.title.opacity = smooth(SEG.plan[0] + 0.03, SEG.plan[0] + 0.09, p);
    if (titleRef.current) titleRef.current.visible = type.title.opacity > 0.001;
    // The core's floor engraving reads only from above: in the oblique API/core shots the
    // courtyard walls cut it to fragments ("ES ROW-"), so it shows only in the plan overview.
    type.core.opacity = type.title.opacity;
    type.wings.forEach((m, k) => {
      const featured = inWings && k === wk ? smooth(0.15, 0.35, wf) : 0;
      m.opacity = 0.5 + 0.5 * Math.max(featured, planGlow);
    });

    /* The request path and the policy brighten when the story reaches them. */
    const sys = smooth(SEG.api[0] + 0.02, SEG.api[0] + 0.06, p);
    mats.line.emissiveIntensity = 0.08 + 0.55 * sys;

    /* Vaults: the signed-in school's opens, the other stays sealed. */
    const reveal = smooth(SEG.core[0] + 0.01, SEG.core[0] + 0.06, p);
    let moving = false;
    for (let v = 0; v < 2; v++) {
      const want = simpleinLink.tenant === v ? 1 : 0;
      const cur = lid.current[v];
      const next = reduced ? want : cur + (want - cur) * (1 - Math.exp(-dt * 3.2));
      lid.current[v] = Math.abs(next - want) < 1e-3 ? want : next;
      if (lid.current[v] !== want) moving = true;
      const o = ease(lid.current[v]) * reveal;
      const g = lidRefs.current[v];
      const sgn = v === 0 ? -1 : 1;
      if (g) {
        g.position.set(sgn * o * 2.6, o * 1.15, 0);
        g.rotation.z = -sgn * o * 0.14;
      }
      const t = tabletRefs.current[v];
      if (t) t.position.y = o * 0.32;
      mats.vaultGlow[v].color.set(P.gold).multiplyScalar(0.3 + 0.75 * o);
      mats.tablet[v].emissiveIntensity = 0.55 * o;
    }

    /* One warm roaming light follows the story's focus. */
    const s = spot.current;
    if (s) {
      if (p < SEG.wings[0]) focus.set(0, Y0, 17);
      else if (p < SEG.api[0]) {
        const a = -Math.max(0, wingParam(p).orbit) * (Math.PI / 2);
        focus.set(Math.sin(a) * 16, Y0, Math.cos(a) * 16);
      } else if (p < SEG.core[0]) focus.set(lerp(16, 6.5, smooth(SEG.api[0], SEG.api[0] + 0.04, p)), Y0, 0);
      else focus.set(simpleinLink.tenant === 0 ? -1.6 : 1.6, Y0, 0);
      targets.spotT.position.copy(focus);
      s.position.set(focus.x - 7, focus.y + 15, focus.z + 8);
      s.intensity = p < SEG.api[0] ? 260 : 120;
    }
    if (moving) invalidate();
  });

  const wingLabel = (k: number) => {
    const a = WING_ANGLE[k];
    const D = dirOf(a);
    const r = (W0 + PL) / 2;
    return { pos: [D.dx * r, Y0 + 0.06, D.dz * r] as [number, number, number], quat: groundQuat(-D.dx, -D.dz) };
  };

  return (
    <group>
      {/* The gallery: a honed floor running out to a soft horizon, and the model's shadow on it. */}
      <Floor color="#D3C1A8" mirror={0.22} size={700} />
      <mesh rotation-x={-Math.PI / 2} position={[(-KEY.x / KEY.y) * Y0, 0.02, (-KEY.z / KEY.y) * Y0]} material={floorShadow} renderOrder={1}>
        <planeGeometry args={[80, 80]} />
      </mesh>

      {/* The plinth (lifted on a recessed shadow-gap base, as model plinths are) and its drawn surface */}
      <mesh material={plinthMat} position={[0, (Y0 + GAP) / 2, 0]}>
        <boxGeometry args={[PL * 2, Y0 - GAP, PL * 2]} />
      </mesh>
      <mesh material={gapMat} position={[0, GAP / 2, 0]}>
        <boxGeometry args={[PL * 2 - 0.8, GAP, PL * 2 - 0.8]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, Y0 + 0.035, 0]} material={type.plinth} renderOrder={2}>
        <planeGeometry args={[PL * 2, PL * 2]} />
      </mesh>
      <mesh ref={titleRef} visible={false} rotation-x={-Math.PI / 2} position={[(TITLE.x0 + TITLE.x1) / 2, Y0 + 0.04, (TITLE.z0 + TITLE.z1) / 2]} material={type.title} renderOrder={3}>
        <planeGeometry args={[TITLE.x1 - TITLE.x0, TITLE.z1 - TITLE.z0]} />
      </mesh>

      {/* Rooms: one per genuine module. Floors warm up when their wing is featured. */}
      {plan.rooms.map((r, i) => (
        <mesh key={i} material={mats.roomMats[i]} position={[r.box.x, Y0 + 0.012, r.box.z]}>
          <boxGeometry args={[r.box.sx, 0.024, r.box.sz]} />
        </mesh>
      ))}
      {ROLES.map((_, k) => {
        const l = wingLabel(k);
        return (
          <mesh key={k} position={l.pos} quaternion={l.quat} material={type.wings[k]} renderOrder={3}>
            <planeGeometry args={[10, 18]} />
          </mesh>
        );
      })}

      {/* Walls, passages, gates and the courtyard (one instanced draw) */}
      <Boxes boxes={plan.walls} material={wallMat} />
      {/* The request's path, inlaid in verdigris */}
      <Boxes boxes={plan.lines} material={mats.line} />

      {/* Gate inscriptions, on the outward face of each lintel */}
      {WING_ANGLE.map((a, k) => {
        const D = dirOf(a);
        const q = faceQuat(D.dx, D.dz);
        return GATES.map((g, i) => (
          <mesh key={`${k}-${i}`} quaternion={q} position={[D.dx * (g + 0.205), Y0 + 2.1 + 0.21, D.dz * (g + 0.205)]} material={type.gates[i]} renderOrder={3}>
            <planeGeometry args={[2.8, 0.45]} />
          </mesh>
        ));
      })}

      {/* The core: two tenant vaults and the policy wall between them */}
      <Boxes boxes={plan.vault} material={vaultMat} />
      <mesh material={rlsMat} position={[0, Y0 + plan.rls.h / 2, 0]}>
        <boxGeometry args={[plan.rls.sx, plan.rls.h, plan.rls.sz]} />
      </mesh>
      <mesh material={mats.line} position={[0, Y0 + plan.rls.h + 0.006, 0]}>
        <boxGeometry args={[0.08, 0.012, plan.rls.sz]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, Y0 + 0.05, 3.55]} material={type.core} renderOrder={3}>
        <planeGeometry args={[9, 2]} />
      </mesh>
      {plan.lids.map((b, v) => (
        <group key={v} position={[b.x, 0, 0]}>
          {/* Inside: the vault's own rows, lit only when its school is signed in */}
          <mesh rotation-x={-Math.PI / 2} position={[0, Y0 + 0.02, 0]} material={mats.vaultGlow[v]}>
            <planeGeometry args={[2.55, 4.3]} />
          </mesh>
          <group ref={(g) => void (tabletRefs.current[v] = g)}>
            {[-1.35, 0, 1.35].map((z) => (
              <mesh key={z} material={mats.tablet[v]} position={[0, Y0 + 0.12, z]}>
                <boxGeometry args={[1.9, 0.14, 0.95]} />
              </mesh>
            ))}
          </group>
          {/* The lid, engraved with the school's name */}
          <group ref={(g) => void (lidRefs.current[v] = g)}>
            <mesh material={lidMat} position={[0, Y0 + b.y + b.h / 2, 0]}>
              <boxGeometry args={[b.sx, b.h, b.sz]} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, Y0 + b.y + b.h + 0.01, 0]} material={type.lids[v]} renderOrder={3}>
              <planeGeometry args={[3, 5]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Light: soft sky, a warm low sun, and one roaming warm light that follows the story */}
      <hemisphereLight args={[P.bone, P.travertine, 1.5]} />
      <directionalLight ref={key} position={KEY.toArray()} target={targets.keyT} color={P.bone} intensity={2.1} />
      <primitive object={targets.keyT} />
      {!low && <spotLight ref={spot} target={targets.spotT} angle={0.42} penumbra={0.85} distance={60} decay={1.3} color={P.apricot} intensity={0} />}
      <primitive object={targets.spotT} />
    </group>
  );
}
