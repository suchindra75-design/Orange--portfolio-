"use client";

import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import type { ActCtx, ActDef, CamOut } from "./acts/types";
import { director, measure, update } from "./director";
import { QualityContext, type Quality } from "./system/quality";
import { P } from "./system/palette";
import { world } from "@/lib/store";
import { useReducedMotion } from "@/lib/hooks";

/** One broken scene must never take the page down. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[stage] scene failed to render", err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Drives one act: reads its section's scroll progress, runs the act's camera path, eases the
 * camera. Priority −1 so the scene's own useFrame (priority 0) always reads this frame's values.
 */
function Director({ def, mobile, reduced, live }: { def: ActDef; mobile: boolean; reduced: boolean; live: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const out = useMemo<CamOut>(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 40 }), []);
  const cur = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 40, init: false }), []);
  const ctx = useMemo<ActCtx>(() => ({ mobile, aspect: 1, pointer: { x: 0, y: 0 }, intro: 0 }), [mobile]);
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
    if (live) invalidate();
  }, [live, invalidate]);

  useEffect(() => {
    director.acts = [def];
    director.active = def.id;
    const [fc, near, far] = def.atmosphere.fog;
    scene.fog = new THREE.Fog(fc, near, far);
    scene.background = new THREE.Color(def.atmosphere.background);
    gl.toneMappingExposure = def.atmosphere.exposure ?? 1;
    measure();
    const ro = new ResizeObserver(() => {
      measure();
      invalidate();
    });
    ro.observe(document.body);
    const onScroll = () => {
      if (liveRef.current) invalidate();
    };
    const onMove = (e: PointerEvent) => {
      director.pointer.mouse = e.pointerType === "mouse";
      if (!director.pointer.mouse || !liveRef.current) return;
      director.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      director.pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      invalidate();
    };
    const unsub = world.subscribe(() => liveRef.current && invalidate());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      ro.disconnect();
      unsub();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      // Module-level state must not leak into the next page.
      director.acts = [];
      director.sections = [];
      director.progress = {} as typeof director.progress;
      director.pointer.x = director.pointer.y = director.pointer.tx = director.pointer.ty = 0;
      scene.fog = null;
    };
  }, [def, scene, gl, invalidate]);

  useFrame((_, dt) => {
    update(window.scrollY, window.innerHeight);
    director.active = def.id;
    const pt = director.pointer;
    const k = 1 - Math.exp(-dt * 4);
    pt.x += ((reduced ? 0 : pt.tx) - pt.x) * k;
    pt.y += ((reduced ? 0 : pt.ty) - pt.y) * k;

    ctx.aspect = camera.aspect;
    ctx.pointer.x = pt.x;
    ctx.pointer.y = pt.y;
    ctx.intro = director.intro;
    def.camera(director.progress[def.id] ?? 0, out, ctx);
    out.pos.x += def.origin[0];
    out.pos.y += def.origin[1];
    out.pos.z += def.origin[2];
    out.target.x += def.origin[0];
    out.target.y += def.origin[1];
    out.target.z += def.origin[2];

    if (!cur.init) {
      cur.pos.copy(out.pos);
      cur.target.copy(out.target);
      cur.fov = out.fov;
      cur.init = true;
    } else {
      const e = reduced ? 1 : 1 - Math.exp(-dt * 6);
      cur.pos.lerp(out.pos, e);
      cur.target.lerp(out.target, e);
      cur.fov += (out.fov - cur.fov) * e;
    }
    camera.position.copy(cur.pos);
    camera.lookAt(cur.target);
    if (Math.abs(camera.fov - cur.fov) > 1e-3) {
      camera.fov = cur.fov;
      camera.updateProjectionMatrix();
    }
    const settling =
      cur.pos.distanceToSquared(out.pos) > 1e-6 || cur.target.distanceToSquared(out.target) > 1e-6 || Math.abs(pt.tx - pt.x) + Math.abs(pt.ty - pt.y) > 1e-3;
    if (settling && liveRef.current) invalidate();
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

const mobileQuery = "(max-width: 767px), (pointer: coarse)";
const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia(mobileQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * A 3D STAGE inside one act section (the section must carry data-act={def.id} and be its
 * nearest positioned ancestor). The canvas sticks for the section's length and scrolls away
 * with it. It renders on demand only, and not at all while off screen. Pixel ratio is capped,
 * and quality drops on phones or when the GPU struggles (?quality=high|low pins it for QA).
 */
export function Stage({ def, Scene }: { def: ActDef; Scene: ComponentType }) {
  const reduced = useReducedMotion();
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(mobileQuery).matches, () => false);
  const [declined, setDeclined] = useState(false);
  const [supported] = useState(detectWebGL);
  const [forced] = useState(() => {
    const q = new URLSearchParams(window.location.search).get("quality");
    return q === "high" || q === "low" ? (q as Quality) : null;
  });
  const quality: Quality = forced ?? (mobile || declined ? "low" : "high");
  const host = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    world.set({ webgl: supported });
  }, [supported]);

  // Only the section on screen renders (with a margin so it is ready as it arrives).
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: "25% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!supported) return null;

  return (
    <div ref={host} className="stage" aria-hidden="true">
      <div className="stage__view" style={{ background: def.atmosphere.background }}>
        <Canvas
          frameloop={live ? "demand" : "never"}
          dpr={quality === "low" ? 1 : [1, 1.5]}
          camera={{ fov: 40, near: 0.1, far: 260, position: [0, 2, 40] }}
          gl={{ antialias: quality === "high", powerPreference: "high-performance", alpha: false }}
          style={{ pointerEvents: "none" }}
          onCreated={() => world.set({ worldReady: true })}
        >
          <QualityContext.Provider value={quality}>
            <PerformanceMonitor onDecline={() => setDeclined(true)} />
            <Environment frames={1} resolution={128}>
              <Lightformer form="rect" intensity={2.2} color={P.gold} position={[0, 6, 6]} scale={[12, 3, 1]} />
              <Lightformer form="rect" intensity={0.9} color={P.bone} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
              <Lightformer form="rect" intensity={0.6} color={P.verdigris} position={[8, 2, -4]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
            </Environment>
            <group position={def.origin}>
              <SceneBoundary>
                <Scene />
              </SceneBoundary>
            </group>
            <Director def={def} mobile={mobile} reduced={reduced} live={live} />
          </QualityContext.Provider>
        </Canvas>
      </div>
    </div>
  );
}
