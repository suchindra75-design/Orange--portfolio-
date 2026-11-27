"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, advance, createPortal, useFrame, useThree, type RootState } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gsap } from "@/lib/gsap";
import { bench } from "@/lib/bench";
import { projects, type ProjectSlug } from "@/content/projects";
import { BENCH } from "@/content/bench";
import { OBJECTS, type ObjectSpec } from "./objects";
import { CREAM, INK, hullGeometry, matMaterial, objectDim, outlineMaterial, roundedRect, toon } from "./toon";
import { StickerContent, StickerInvalidate, useStickerHandover, useStickerSpecs, useStickerMotions } from "@/components/world/HeroStickers";

/**
 * THE BENCH (home hero, desktop with a mouse): one canvas, one WebGL context, two layers.
 *   1. The bench: a cutting-mat table and the eight project objects, seen by the crane camera.
 *   2. The hero's three vinyl stickers, drawn on top with their own pixel camera (HeroStickers).
 *
 * Rendering: frameloop "never". The canvas draws inside GSAP's ticker, after Lenis and
 * ScrollTrigger have updated, so the crane, the card and the page always agree on the same frame
 * (no one-frame slip between DOM and WebGL). It draws only when asked (scroll, pointer, springs
 * still moving) and never while the hero is off screen.
 *
 * The DOM owns every word and every click: the canvas projects each object's box onto its DOM hit
 * area and label (`targets`), and stands his card on the bench's front edge (`card`).
 */

export type BenchTargets = {
  hits: Partial<Record<ProjectSlug, HTMLElement | null>>;
  label: HTMLElement | null;
  card: HTMLElement | null;
  fig: HTMLElement | null;
};

const SLUGS = projects.map((p) => p.slug);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Development only: `?benchStill=overview` or `?benchStill=<slug>` renders a clean still (no
 * page, transparent background) for the posters and the phone tray's object pictures
 * (tools/bench-stills, private). Production builds never read it.
 */
const STILL: string | null =
  process.env.NODE_ENV !== "production" && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("benchStill") : null;
const STILL_SLUG = STILL && STILL !== "overview" ? (STILL as ProjectSlug) : null;

/** The cursor, -1…1 across the hero, for the overview's small parallax. */
const pointerN = { x: 0, y: 0 };

/** Camera: the start (low, the bench a strip under his card) and the overview (55° over the bench). */
const CAM = {
  from: { pos: new THREE.Vector3(0, 0.9, 16), at: new THREE.Vector3(0, 4.3, 0) },
  to: { pos: new THREE.Vector3(-1.85, 14.8, 11.4), at: new THREE.Vector3(-1.85, 0, -0.1) },
};

type Live = {
  slug: ProjectSlug;
  group: THREE.Group;
  lift: THREE.Group;
  shadow: THREE.Mesh;
  dim: { value: number };
  screens: THREE.MeshBasicMaterial[];
  box: THREE.Box3;
  s: { lift: number; liftV: number; back: number; dim: number };
};

/** One object: parts merged by colour, one outline hull, flat screens, a hard ink shadow. */
function BenchObject({ slug, onLive }: { slug: ProjectSlug; onLive: (o: Live) => void }) {
  const group = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const built = useMemo(() => {
    const spec: ObjectSpec = OBJECTS[slug]();
    const dim = objectDim();
    const m = new THREE.Matrix4();
    const byColor = new Map<string, THREE.BufferGeometry[]>();
    const all: THREE.BufferGeometry[] = [];
    for (const p of spec.parts) {
      const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()) as THREE.BufferGeometry;
      for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
      m.compose(new THREE.Vector3(...(p.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(m);
      all.push(g);
      byColor.set(p.color, [...(byColor.get(p.color) ?? []), g]);
      p.geo.dispose();
    }
    const meshes = [...byColor].map(([color, gs]) => ({ color, geo: mergeGeometries(gs)! }));
    const hull = hullGeometry(mergeGeometries(all)!);
    const screens = spec.screens.map((s) => {
      const mat = new THREE.MeshBasicMaterial({ color: "#fff", toneMapped: false });
      const geo = new THREE.PlaneGeometry(s.w, s.h);
      const fit = (tex: THREE.Texture, iw: number, ih: number) => {
        // Cover-fit the image into the screen without stretching it.
        const a = iw / ih;
        const b = s.w / s.h;
        tex.repeat.set(a > b ? b / a : 1, a > b ? 1 : a / b);
        tex.offset.set((1 - tex.repeat.x) / 2, (1 - tex.repeat.y) / 2);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        mat.map = tex;
        mat.needsUpdate = true;
        bench.requestRender();
      };
      if (typeof s.src === "string") {
        new THREE.TextureLoader().load(s.src, (tex) => fit(tex, (tex.image as HTMLImageElement).width, (tex.image as HTMLImageElement).height));
      } else {
        const c = s.src();
        fit(new THREE.CanvasTexture(c), c.width, c.height);
      }
      return { mat, geo, at: s.at, rot: s.rot ?? [0, 0, 0] };
    });
    const [fw, fd] = spec.foot;
    const shadowGeo = new THREE.ShapeGeometry(roundedRect(fw, fd, Math.min(fw, fd) * 0.22), 4);
    shadowGeo.rotateX(-Math.PI / 2);
    const box = new THREE.Box3(new THREE.Vector3(-fw / 2, 0, -fd / 2), new THREE.Vector3(fw / 2, spec.height, fd / 2));
    return { dim, meshes, hull, screens, shadowGeo, box };
  }, [slug]);

  useEffect(
    () => () => {
      built.meshes.forEach((x) => x.geo.dispose());
      built.hull.dispose();
      built.shadowGeo.dispose();
      built.screens.forEach((s) => {
        s.geo.dispose();
        s.mat.map?.dispose();
        s.mat.dispose();
      });
    },
    [built],
  );

  useEffect(() => {
    onLive({ slug, group: group.current!, lift: lift.current!, shadow: shadow.current!, dim: built.dim, screens: built.screens.map((x) => x.mat), box: built.box, s: { lift: 0, liftV: 0, back: 0, dim: 0 } });
  }, [built, onLive, slug]);

  const place = BENCH[slug];
  return (
    <group ref={group} position={[place.x, 0, place.z]} rotation={[0, (place.turn * Math.PI) / 180, 0]}>
      <mesh ref={shadow} geometry={built.shadowGeo} position={[0.14, 0.004, 0.16]}>
        <meshBasicMaterial color={INK} toneMapped={false} />
      </mesh>
      <group ref={lift}>
        {built.meshes.map((x) => (
          <mesh key={x.color} geometry={x.geo} material={toon(x.color, built.dim)} />
        ))}
        <mesh geometry={built.hull} material={outlineMaterial()} />
        {built.screens.map((s, i) => (
          <mesh key={i} geometry={s.geo} material={s.mat} position={s.at} rotation={s.rot} />
        ))}
      </group>
    </group>
  );
}

function Table() {
  if (STILL_SLUG) return null;
  return <TableMeshes />;
}

function TableMeshes() {
  const top = useMemo(() => matMaterial(), []);
  const side = useMemo(() => toon(CREAM, { value: 0 }), []);
  const slab = useMemo(() => new THREE.BoxGeometry(12.6, 0.36, 7.6), []);
  const hull = useMemo(() => hullGeometry(slab), [slab]);
  const plane = useMemo(() => new THREE.PlaneGeometry(12.6, 7.6).rotateX(-Math.PI / 2), []);
  useEffect(() => () => [slab, hull, plane, top].forEach((x) => x.dispose()), [slab, hull, plane, top]);
  return (
    <group>
      <mesh geometry={slab} material={side} position={[0, -0.18, 0]} />
      <mesh geometry={hull} material={outlineMaterial()} position={[0, -0.18, 0]} />
      <mesh geometry={plane} material={top} position={[0, 0.001, 0]} />
      {/* The table's own hard ink shadow on the orange, down and to the right */}
      <mesh position={[0.22, -0.42, 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.6, 7.6]} />
        <meshBasicMaterial color={INK} toneMapped={false} />
      </mesh>
    </group>
  );
}

const v = new THREE.Vector3();
const corners = Array.from({ length: 8 }, () => new THREE.Vector3());

/** Projects a box (in an object's local space) to a rect in the hero's own pixels. */
function screenRect(box: THREE.Box3, obj: THREE.Object3D, cam: THREE.Camera, w: number, h: number) {
  const { min, max } = box;
  let i = 0;
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners[i++].set(x, y, z);
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const c of corners) {
    c.applyMatrix4(obj.matrixWorld).project(cam);
    const sx = (c.x * 0.5 + 0.5) * w;
    const sy = (-c.y * 0.5 + 0.5) * h;
    l = Math.min(l, sx);
    r = Math.max(r, sx);
    t = Math.min(t, sy);
    b = Math.max(b, sy);
  }
  return { l, t, r, b };
}

/**
 * The label sits above the object, or below it when there's no room above (the chips and nav
 * live up there), and never runs off the sides.
 */
const LABEL_TOP = 190;
function placeLabel(el: HTMLElement, r: { l: number; t: number; r: number; b: number }, w: number) {
  const half = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
  const x = Math.min(w - 16 - half / 2, Math.max(16 + half / 2, (r.l + r.r) / 2));
  const above = r.t - 14 > LABEL_TOP;
  el.style.transform = above ? `translate3d(${x.toFixed(1)}px, ${(r.t - 14).toFixed(1)}px, 0) translate(-50%, -100%)` : `translate3d(${x.toFixed(1)}px, ${(r.b + 14).toFixed(1)}px, 0) translate(-50%, 0)`;
}

const pos = new THREE.Vector3();
const at = new THREE.Vector3();
const fpos = new THREE.Vector3();
const fat = new THREE.Vector3();
type CardPoint = { x: number; y: number; ok: boolean };
type Focus = { v: number; slug: ProjectSlug | null; par: { x: number; y: number; vx: number; vy: number } };

/** One frame of the bench: camera (crane, filter, focus), every object, and their DOM boxes. */
function stepRig(camera: THREE.PerspectiveCamera, w: number, h: number, objects: Live[], targets: BenchTargets, card: CardPoint, f: Focus, delta: number) {
  const dt = Math.min(delta, 1 / 30);
  const st = bench.get();
  const p = STILL ? 1 : st.crane;
  const e = ease(p);
  let moving = false;

  // The crane: one move from the hero's eye line up and over the bench. Narrow screens step back.
  const back = Math.max(1, 1.75 / (w / h));
  pos.lerpVectors(CAM.from.pos, CAM.to.pos, e);
  at.lerpVectors(CAM.from.at, CAM.to.at, e);
  pos.sub(at).multiplyScalar(THREE.MathUtils.lerp(1, back, e)).add(at);
  // A crane, not a lift: the camera swings out to the side on its way up, then settles square.
  pos.x += Math.sin(Math.PI * e) * 2.4;

  // At the overview the camera leans a little toward the cursor (depth you can feel, never a drift).
  const par = f.par;
  const w8 = smooth(0.85, 1, p) * (st.focus || st.tour || STILL ? 0 : 1);
  par.vx += (-60 * (par.x - pointerN.x * w8) - 14 * par.vx) * dt;
  par.vy += (-60 * (par.y - pointerN.y * w8) - 14 * par.vy) * dt;
  par.x += par.vx * dt;
  par.y += par.vy * dt;
  if (Math.abs(par.vx) + Math.abs(par.vy) > 1e-4 || Math.abs(par.x - pointerN.x * w8) + Math.abs(par.y - pointerN.y * w8) > 1e-4) moving = true;
  pos.x += par.x * 0.7;
  pos.y -= par.y * 0.45;

  // A filter re-frames gently toward what stayed forward.
  if (st.filter && st.filter.slugs.length) {
    let cx = 0;
    let cz = 0;
    for (const s of st.filter.slugs) {
      cx += BENCH[s].x;
      cz += BENCH[s].z;
    }
    cx /= st.filter.slugs.length;
    cz /= st.filter.slugs.length;
    at.x += (cx - at.x - 1.85) * 0.25 * e;
    at.z += (cz - at.z) * 0.2 * e;
  }

  // Focus (opening a project, a tour stop): fly in over that object.
  const fTarget = st.focus ? 1 : 0;
  if (st.focus) f.slug = st.focus;
  f.v += (fTarget - f.v) * (1 - Math.exp(-dt * (st.focus ? 5.5 : 4)));
  if (Math.abs(f.v - fTarget) > 0.001) moving = true;
  else f.v = fTarget;
  if (f.slug && f.v > 0) {
    const o = BENCH[f.slug];
    fat.set(o.x, 0.7, o.z);
    fpos.set(o.x * 0.9 - 0.3, 6.4, o.z + 6.2);
    const fe = ease(f.v);
    pos.lerp(fpos, fe);
    at.lerp(fat, fe);
  }
  if (STILL_SLUG) {
    // A still of one object: three-quarter view from the front right, framed to its size.
    const o = BENCH[STILL_SLUG];
    const spec = objects.find((x) => x.slug === STILL_SLUG)!;
    const size = spec.box.getSize(v);
    const r = Math.max(size.x, size.y, size.z);
    at.set(o.x, size.y * 0.45, o.z);
    pos.set(o.x + r * 0.9, r * 1.55 + size.y * 0.4, o.z + r * 2.2);
  }
  camera.position.copy(pos);
  camera.lookAt(at);
  camera.updateMatrixWorld();

  // Each object: drop in during the crane (back row first), lift when pointed at, step back when filtered out.
  objects.forEach((o, i) => {
    const place = BENCH[o.slug];
    const order = (place.z + 3.5) / 7; // back row lands first
    const drop = 1 - smooth(0.28 + order * 0.32, 0.5 + order * 0.32, p);
    const out = st.filter ? !st.filter.slugs.includes(o.slug) : false;
    const hot = st.hover === o.slug || st.focus === o.slug;
    const s = o.s;
    // Lift: a spring with a little overshoot ("slap and settle").
    const tl = hot ? 0.38 : 0;
    s.liftV += (-170 * (s.lift - tl) - 13 * s.liftV) * dt;
    s.lift += s.liftV * dt;
    s.back += ((out ? 1 : 0) - s.back) * (1 - Math.exp(-dt * 7));
    s.dim += ((out ? 1 : 0) - s.dim) * (1 - Math.exp(-dt * 7));
    if (Math.abs(s.liftV) > 1e-3 || Math.abs(s.lift - tl) > 1e-3 || Math.abs(s.back - (out ? 1 : 0)) > 1e-3) moving = true;
    o.lift.position.y = s.lift + drop * drop * 1.1;
    o.lift.scale.setScalar(1 - drop * 0.45);
    o.group.position.set(place.x, 0, place.z - s.back * 0.6);
    o.group.visible = drop < 0.999 && (!STILL_SLUG || o.slug === STILL_SLUG);
    // The shadow stays on the table; it spreads as the object rises (a deeper hard shadow).
    o.shadow.position.set(0.1 + s.lift * 0.3, 0.004, 0.12 + s.lift * 0.34);
    o.shadow.scale.setScalar((1 - drop) * (0.92 + s.lift * 0.06));
    o.shadow.visible = drop < 0.15;
    o.dim.value = s.dim;
    for (const m of o.screens) m.color.setScalar(1 - 0.6 * s.dim);
    o.group.updateMatrixWorld();

    // Hand the object's box to its DOM hit area and (if pointed at) the label.
    const hit = targets.hits[o.slug];
    const r = screenRect(o.box, o.lift, camera, w, h);
    if (hit) {
      hit.style.transform = `translate3d(${r.l.toFixed(1)}px, ${r.t.toFixed(1)}px, 0)`;
      hit.style.width = `${Math.max(44, r.r - r.l).toFixed(1)}px`;
      hit.style.height = `${Math.max(44, r.b - r.t).toFixed(1)}px`;
      hit.style.zIndex = String(10 + i);
    }
    if (hot && targets.label) placeLabel(targets.label, r, w);
  });

  // His card stands on the bench's front edge, wherever the crane has put it.
  v.set(0, 0, 3.05).project(camera);
  card.x = (v.x * 0.5 + 0.5) * w;
  card.y = (-v.y * 0.5 + 0.5) * h;
  card.ok = true;

  if (moving) bench.requestRender();
}

function Rig({ targets, objects, cardRef }: { targets: BenchTargets; objects: Live[]; cardRef: RefObject<CardPoint> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const focusRef = useRef<Focus>({ v: 0, slug: null, par: { x: 0, y: 0, vx: 0, vy: 0 } });
  useFrame((_, delta) => stepRig(camera, size.width, size.height, objects, targets, cardRef.current, focusRef.current, delta));
  return null;
}

function Objects({ targets, cardRef }: { targets: BenchTargets; cardRef: RefObject<CardPoint> }) {
  const reg = useRef(new Map<ProjectSlug, Live>());
  const [live, setLive] = useState<Live[]>([]);
  const onLive = useCallback((o: Live) => {
    reg.current.set(o.slug, o);
    if (reg.current.size === SLUGS.length) {
      setLive(SLUGS.map((s) => reg.current.get(s)!));
      bench.requestRender();
    }
  }, []);
  return (
    <>
      {SLUGS.map((s) => (
        <BenchObject key={s} slug={s} onLive={onLive} />
      ))}
      {live.length > 0 && <Rig targets={targets} objects={live} cardRef={cardRef} />}
    </>
  );
}

type Rest = { cx: number; bottom: number };

/** Draws the bench, then the stickers on top with their own camera, and stands his card on the bench. */
function drawLayers(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, stickerScene: THREE.Scene, stickerCam: THREE.Camera, targets: BenchTargets, card: CardPoint, rest: Rest | null) {
  const p = STILL ? 1 : bench.get().crane;
  stickerScene.visible = !STILL && p < 0.32;
  gl.autoClear = false;
  gl.clear();
  gl.render(scene, camera);
  if (stickerScene.visible) {
    gl.clearDepth();
    gl.render(stickerScene, stickerCam);
  }
  // The card (a DOM element) stands on the projected front edge, shrinking as the crane rises.
  const c = targets.card;
  if (!c || !rest || !card.ok) return;
  const s = THREE.MathUtils.lerp(1, 0.34, ease(p));
  const blend = smooth(0, 0.22, p);
  const dx = (card.x - rest.cx) * blend;
  const dy = (card.y - rest.bottom) * blend;
  c.style.transformOrigin = `${rest.cx.toFixed(1)}px ${rest.bottom.toFixed(1)}px`;
  c.style.transform = p <= 0.0005 ? "" : `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
}

function fitCamera(cam: THREE.PerspectiveCamera, w: number, h: number) {
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}

/** Where his card stands at rest (its bottom centre, in the hero's pixels), measured untransformed. */
function measureRest(targets: BenchTargets, hero: HTMLElement | null): Rest | null {
  const c = targets.card;
  const f = targets.fig;
  if (!c || !f || !hero) return null;
  const prev = c.style.transform;
  c.style.transform = "";
  const r = f.getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  c.style.transform = prev;
  return { cx: r.left + r.width / 2 - hr.left, bottom: r.bottom - hr.top - r.height * 0.02 };
}

function Layers({ stickerScene, stickerCam, cardRef, targets, restRef }: { stickerScene: THREE.Scene; stickerCam: THREE.PerspectiveCamera; cardRef: RefObject<CardPoint>; targets: BenchTargets; restRef: RefObject<Rest | null> }) {
  const size = useThree((s) => s.size);
  useEffect(() => fitCamera(stickerCam, size.width, size.height), [size, stickerCam]);
  useFrame(({ gl, scene, camera }) => drawLayers(gl, scene, camera, stickerScene, stickerCam, targets, cardRef.current, restRef.current), 1);
  return null;
}

export default function BenchCanvas({ hero, targets, onReady, onLost }: { hero: RefObject<HTMLElement | null>; targets: BenchTargets; onReady?: () => void; onLost?: () => void }) {
  const state = useRef<RootState | null>(null);
  const live = useRef(true);
  const dirty = useRef(true);
  const cardRef = useRef<CardPoint>({ x: 0, y: 0, ok: false });
  const restRef = useRef<Rest | null>(null);
  const stickerScene = useMemo(() => new THREE.Scene(), []);
  const stickerCam = useMemo(() => new THREE.PerspectiveCamera(30, 1, 1, 10000), []);
  const specs = useStickerSpecs(hero, true);
  const motions = useStickerMotions(specs);
  const canvasRect = useRef<DOMRect | null>(null);
  const [shown, setShown] = useState(false);
  useStickerHandover(hero, shown);

  // One loop: GSAP's ticker (after Lenis and ScrollTrigger) draws the bench when it has been asked to.
  useEffect(() => {
    const ask = () => (dirty.current = true);
    bench.setRenderer(ask);
    const tick = () => {
      if (!dirty.current || !live.current || !state.current) return;
      dirty.current = false;
      advance(performance.now(), false, state.current);
    };
    gsap.ticker.add(tick);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        pointerN.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointerN.y = (e.clientY / window.innerHeight) * 2 - 1;
      }
      ask();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      gsap.ticker.remove(tick);
      bench.setRenderer(null);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // Only while the hero is on screen.
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      live.current = e.isIntersecting;
      if (e.isIntersecting) dirty.current = true;
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hero]);

  // Where his card stands at rest, re-measured when the hero's size changes.
  useEffect(() => {
    const measure = () => {
      restRef.current = measureRest(targets, hero.current);
      dirty.current = true;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (hero.current) ro.observe(hero.current);
    return () => ro.disconnect();
  }, [hero, targets]);

  return (
    <div aria-hidden="true" className="bench-canvas pointer-events-none absolute inset-0 z-[2]" data-shown={shown ? "" : undefined}>
      <Canvas
        flat
        frameloop="never"
        dpr={[1, 1.5]}
        camera={{ fov: 30, near: 0.5, far: 80, position: [0, 1, 16] }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
        onCreated={(s) => {
          state.current = s;
          s.gl.setClearColor(0x000000, 0);
          // If the GPU drops the context, the bench steps aside for its poster (Bench.tsx).
          s.gl.domElement.addEventListener("webglcontextlost", (ev) => {
            ev.preventDefault();
            onLost?.();
          });
          if (STILL) document.documentElement.dataset.benchStill = STILL;
          dirty.current = true;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              setShown(true);
              onReady?.();
            }),
          );
        }}
      >
        <Table />
        <Objects targets={targets} cardRef={cardRef} />
        <Layers stickerScene={stickerScene} stickerCam={stickerCam} cardRef={cardRef} targets={targets} restRef={restRef} />
        {specs &&
          hero.current &&
          createPortal(
            <StickerInvalidate.Provider value={() => (dirty.current = true)}>
              <StickerContent hero={hero.current} specs={specs} motions={motions} canvasRect={canvasRect} live={live} />
            </StickerInvalidate.Provider>,
            stickerScene,
            { camera: stickerCam },
          )}
      </Canvas>
    </div>
  );
}
