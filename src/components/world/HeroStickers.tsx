"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

/**
 * THE HERO STICKERS, IN 3D (home hero only; loaded after the intro, on idle).
 *
 * The three HTML stickers ("AI assistants", "ESP32 + hardware", "EEG over Bluetooth") stay in the
 * page: they slap on in the intro, they carry the text for screen readers, and they are the hit
 * areas. Once this scene has drawn, it takes over their look: each becomes a thick die-cut vinyl
 * sticker (cream face, 2px ink edge, ink body and the same hard ink shadow), shaded in flat steps
 * so it still reads as printed, not glossy. It tilts toward the cursor, wobbles on a spring when
 * you touch it, lifts while hovered, and follows the HTML sticker's scroll drift.
 *
 * Toolkit rules: renders on demand only (springs, pointer and scroll ask for frames), never while
 * the hero is off screen, one tiny scene, everything disposed on unmount. Phones, coarse
 * pointers, reduced motion, Save-Data and browsers without WebGL never load it (see Hero.tsx).
 * The camera is set so one world unit is one CSS pixel at z = 0: the 3D stickers sit exactly on
 * the HTML ones, so the swap is invisible.
 */

const INK = "#140F0B";
const CREAM = "#FFF3E8";
const DEPTH = 6; // vinyl thickness, px
const SHADOW = 7; // the hard shadow's drop, px (as .sticker's 0 7px 0)
const RADIUS = 14; // .sticker border-radius
const LIGHT = new THREE.Vector3(0.35, 0.5, 1).normalize();

type Spec = {
  el: HTMLElement;
  w: number;
  h: number;
  rot: number; // radians
  tex: THREE.CanvasTexture;
};

type Spring = { v: number; x: number };
type Motion = { rx: Spring; ry: Spring; rz: Spring; lift: Spring; squash: Spring; hover: boolean };
const spring = (): Spring => ({ v: 0, x: 0 });

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A flat shape with UVs spanning 0…1 over its box (ShapeGeometry's own UVs are raw x/y). */
function faceGeometry(w: number, h: number) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, RADIUS), 6);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return g;
}

/** Draws the sticker's face from the HTML sticker's own computed style: border, icon, label. */
function paintFace(el: HTMLElement, w: number, h: number) {
  const cs = getComputedStyle(el);
  const fs = parseFloat(cs.fontSize);
  const scale = Math.min(4, Math.max(2, window.devicePixelRatio * 1.6));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  // Face and its 2px ink border (drawn inside the box, as CSS borders are).
  const path = new Path2D();
  path.roundRect(1, 1, w - 2, h - 2, RADIUS - 1);
  g.fillStyle = CREAM;
  g.fill(path);
  g.lineWidth = 2;
  g.strokeStyle = INK;
  g.stroke(path);
  // Icon: the same 24-unit path as the HTML svg, 1.1em square, centred on the content line.
  const svg = el.querySelector("svg");
  const icon = 1.1 * fs;
  const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
  const gap = parseFloat(cs.columnGap) || 0.5 * fs;
  const d = svg?.querySelector("path")?.getAttribute("d");
  if (d) {
    g.save();
    g.translate(padL, h / 2 - icon / 2);
    g.scale(icon / 24, icon / 24);
    g.lineWidth = 2;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = INK;
    g.stroke(new Path2D(d));
    g.restore();
  }
  // Label, in the page's own Bricolage at the sticker's size and weight.
  g.fillStyle = INK;
  g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  g.textBaseline = "middle";
  const text = el.textContent?.trim() ?? "";
  g.fillText(text, padL + icon + gap, h / 2 + fs * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function readSpecs(hero: HTMLElement): Spec[] {
  return Array.from(hero.querySelectorAll<HTMLElement>("[data-sticker]")).map((el) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // CSS rotate is clockwise on a y-down page; three.js turns counter-clockwise with y up.
    const rot = -(parseFloat(el.style.getPropertyValue("--rot")) || 0) * (Math.PI / 180);
    return { el, w, h, rot, tex: paintFace(el, w, h) };
  });
}

/** Camera: one world unit = one CSS pixel at z = 0, origin at the canvas centre. */
function PixelCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(() => {
    const d = size.height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, d);
    camera.near = d * 0.2;
    camera.far = d * 3;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Sticker({ spec, motion, canvasRect }: { spec: Spec; motion: Motion; canvasRect: RefObject<DOMRect | null> }) {
  const group = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const face = useRef<THREE.MeshBasicMaterial>(null);
  const body = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRect(spec.w, spec.h, RADIUS), { depth: DEPTH, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -DEPTH);
    return g;
  }, [spec.w, spec.h]);
  const front = useMemo(() => faceGeometry(spec.w, spec.h), [spec.w, spec.h]);
  const shadow = useMemo(() => new THREE.ShapeGeometry(roundedRect(spec.w, spec.h, RADIUS), 6), [spec.w, spec.h]);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const restDot = LIGHT.z; // a face looking straight at the camera

  useEffect(() => () => [body, front, shadow].forEach((g) => g.dispose()), [body, front, shadow]);

  useFrame(() => {
    const g = group.current;
    const t = tilt.current;
    const rect = canvasRect.current;
    if (!g || !t || !rect) return;
    // Follow the HTML sticker: its centre includes the intro, the scroll drift and the hover lift.
    const r = spec.el.getBoundingClientRect();
    g.position.set(r.left + r.width / 2 - rect.left - rect.width / 2, -(r.top + r.height / 2 - rect.top - rect.height / 2), motion.lift.x);
    g.rotation.z = spec.rot;
    t.rotation.set(motion.rx.x, motion.ry.x, motion.rz.x);
    const sq = 1 + motion.squash.x;
    t.scale.set(1 / Math.sqrt(sq), sq, 1);
    // Printed, stepped shading: the face darkens in two flat steps as it turns from the light.
    normal.set(0, 0, 1).applyQuaternion(t.getWorldQuaternion(quat));
    const rel = normal.dot(LIGHT) / restDot;
    const shade = rel > 0.985 ? 1 : rel > 0.92 ? 0.94 : 0.87;
    face.current?.color.setScalar(shade);
  });

  return (
    <group ref={group}>
      <group ref={tilt}>
        {/* The hard ink shadow, 7px below, behind the body (as box-shadow: 0 7px 0 ink) */}
        <mesh geometry={shadow} position={[0, -SHADOW, -DEPTH - 0.5]}>
          <meshBasicMaterial color={INK} toneMapped={false} />
        </mesh>
        <mesh geometry={body}>
          <meshBasicMaterial color={INK} toneMapped={false} />
        </mesh>
        <mesh geometry={front} position={[0, 0, 0.05]}>
          <meshBasicMaterial ref={face} map={spec.tex} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

const K = 170; // spring stiffness
const C = 11; // damping (under-damped: a short wobble, then still)

function Rig({ hero, specs, motions, canvasRect, live }: { hero: HTMLElement; specs: Spec[]; motions: Motion[]; canvasRect: RefObject<DOMRect | null>; live: RefObject<boolean> }) {
  const invalidate = useThree((s) => s.invalidate);
  const pointer = useRef<{ x: number; y: number; in: boolean }>({ x: 0, y: 0, in: false });
  const lastScroll = useRef(0);

  useEffect(() => {
    const kick = () => live.current && invalidate();
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = hero.getBoundingClientRect();
      pointer.current = { x: e.clientX, y: e.clientY, in: e.clientY >= r.top && e.clientY <= r.bottom };
      kick();
    };
    const onLeave = () => {
      pointer.current.in = false;
      kick();
    };
    const onScroll = () => {
      lastScroll.current = performance.now();
      kick();
    };
    const offs = specs.map((s, i) => {
      const m = motions[i];
      const enter = () => {
        m.hover = true;
        m.rz.v += (i % 2 ? -1 : 1) * 3.2; // a poke: it wobbles about its pin
        m.lift.v += 120;
        kick();
      };
      const leave = () => {
        m.hover = false;
        kick();
      };
      const down = () => {
        m.squash.v -= 4; // pressed flat for a moment, then it springs back
        m.rz.v += (i % 2 ? 1 : -1) * 5;
        kick();
      };
      s.el.addEventListener("pointerenter", enter);
      s.el.addEventListener("pointerleave", leave);
      s.el.addEventListener("pointerdown", down);
      return () => {
        s.el.removeEventListener("pointerenter", enter);
        s.el.removeEventListener("pointerleave", leave);
        s.el.removeEventListener("pointerdown", down);
      };
    });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      offs.forEach((f) => f());
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [hero, specs, motions, invalidate, live]);

  // Runs before the stickers (priority −1): advances every spring, keeps frames coming while anything moves.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const rect = hero.getBoundingClientRect();
    canvasRect.current = rect;
    const p = pointer.current;
    let moving = performance.now() - lastScroll.current < 900; // the HTML drift is scrubbed with lag
    specs.forEach((s, i) => {
      const m = motions[i];
      const r = s.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let tx = 0;
      let ty = 0;
      if (p.in) {
        // Turn the face toward the cursor, more when it is close.
        const near = 1 / (1 + Math.hypot(p.x - cx, p.y - cy) / 420);
        ty = THREE.MathUtils.clamp(((p.x - cx) / rect.width) * 1.6, -0.5, 0.5) * near;
        tx = THREE.MathUtils.clamp(((p.y - cy) / rect.height) * 1.6, -0.45, 0.45) * near;
      }
      const targets: [Spring, number][] = [
        [m.rx, tx],
        [m.ry, ty],
        [m.rz, 0],
        [m.lift, m.hover ? 22 : 0],
        [m.squash, 0],
      ];
      for (const [sp, target] of targets) {
        sp.v += (-K * (sp.x - target) - C * sp.v) * dt;
        sp.x += sp.v * dt;
        if (Math.abs(sp.v) > 1e-3 || Math.abs(sp.x - target) > 1e-3) moving = true;
      }
    });
    if (moving && live.current) invalidate();
  }, -1);

  return null;
}

function detectWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function HeroStickers({ hero }: { hero: RefObject<HTMLElement | null> }) {
  const [supported] = useState(detectWebGL);
  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const [shown, setShown] = useState(false);
  const canvasRect = useRef<DOMRect | null>(null);
  const live = useRef(true);
  const [frameloop, setFrameloop] = useState<"demand" | "never">("demand");

  // Build the sticker faces from the live HTML (and again if their size changes with the viewport).
  useEffect(() => {
    const el = hero.current;
    if (!el || !supported) return;
    let t = 0;
    let last = "";
    const build = () => {
      const sig = Array.from(el.querySelectorAll<HTMLElement>("[data-sticker]"))
        .map((s) => `${s.offsetWidth}x${s.offsetHeight}`)
        .join();
      if (sig === last) return;
      last = sig;
      setSpecs((old) => {
        old?.forEach((s) => s.tex.dispose());
        return readSpecs(el);
      });
    };
    document.fonts.ready.then(build);
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(build, 150);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [hero, supported]);
  useEffect(() => () => specs?.forEach((s) => s.tex.dispose()), [specs]);

  // Only while the hero is on screen.
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      live.current = e.isIntersecting;
      setFrameloop(e.isIntersecting ? "demand" : "never");
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hero]);

  // Hand over: once the 3D has drawn, the HTML stickers go transparent (they stay as text and hit areas).
  useEffect(() => {
    const el = hero.current;
    if (!el || !shown) return;
    el.dataset.stickers3d = "";
    return () => {
      delete el.dataset.stickers3d;
    };
  }, [hero, shown]);

  const motions = useMemo(() => (specs ?? []).map(() => ({ rx: spring(), ry: spring(), rz: spring(), lift: spring(), squash: spring(), hover: false })), [specs]);

  if (!supported || !specs || !hero.current) return null;

  return (
    <div aria-hidden="true" className="hero-stickers-3d pointer-events-none absolute inset-0 z-[4]" data-shown={shown ? "" : undefined}>
      <Canvas
        flat
        frameloop={frameloop}
        dpr={[1, 1.5]}
        camera={{ fov: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ pointerEvents: "none" }}
        onCreated={() => requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))}
      >
        <PixelCamera />
        <Rig hero={hero.current} specs={specs} motions={motions} canvasRect={canvasRect} live={live} />
        {specs.map((s, i) => (
          <Sticker key={`${i}-${s.w}x${s.h}`} spec={s} motion={motions[i]} canvasRect={canvasRect} />
        ))}
      </Canvas>
    </div>
  );
}
