"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ProjectSlug } from "@/content/projects";
import { buildObject, disposeObject } from "@/components/bench/build";
import { outlineMaterial, toon, toonMode } from "@/components/bench/toon";

/**
 * LAB · TURNTABLE, the 3D part (loaded only when asked for). One bench object at a time, the
 * bench's own builder and materials, turned by dragging. Renders on demand: only while it moves.
 */

type Spin = { y: number; x: number; vy: number; vx: number };

function setShading(soft: boolean) {
  toonMode.value = soft ? 1 : 0;
}

/** Eases the spin toward where the drag left it, and frames the object to its size. */
function step(group: THREE.Group, camera: THREE.PerspectiveCamera, spin: Spin, box: THREE.Box3, dt: number) {
  spin.vy *= Math.exp(-dt * 4);
  spin.vx *= Math.exp(-dt * 4);
  spin.y += spin.vy * dt;
  spin.x = Math.max(-0.35, Math.min(0.5, spin.x + spin.vx * dt));
  group.rotation.set(spin.x, spin.y, 0);
  const s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z);
  camera.position.set(0, s.y * 0.5 + r * 0.8, r * 3.5);
  camera.lookAt(0, s.y * 0.42, 0);
  return Math.abs(spin.vy) + Math.abs(spin.vx) > 0.002;
}

function Model({ slug, outline, spinRef }: { slug: ProjectSlug; outline: boolean; spinRef: React.RefObject<Spin> }) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const group = useRef<THREE.Group>(null);
  const built = useMemo(() => buildObject(slug, () => invalidate()), [slug, invalidate]);
  useEffect(() => () => disposeObject(built), [built]);
  useEffect(() => invalidate(), [outline, invalidate]);
  useFrame((_, delta) => {
    if (group.current && step(group.current, camera, spinRef.current, built.box, Math.min(delta, 1 / 30))) invalidate();
  });
  return (
    <group ref={group}>
      {built.meshes.map((m) => (
        <mesh key={m.color} geometry={m.geo} material={toon(m.color, built.dim)} />
      ))}
      <mesh geometry={built.hull} material={outlineMaterial()} visible={outline} />
      {built.screens.map((s, i) => (
        <mesh key={i} geometry={s.geo} material={s.mat} position={s.at} rotation={s.rot} />
      ))}
    </group>
  );
}

export default function TurntableCanvas({ slug, outline, soft }: { slug: ProjectSlug; outline: boolean; soft: boolean }) {
  const spinRef = useRef<Spin>({ y: -0.5, x: 0.12, vy: 0, vx: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const inv = useRef<(() => void) | null>(null);
  useEffect(() => {
    setShading(soft);
    inv.current?.();
    return () => setShading(false);
  }, [soft]);

  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ fov: 30, near: 0.1, far: 60 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={(s) => (inv.current = s.invalidate)}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY };
        try {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        } catch {
          /* already released */
        }
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const sp = spinRef.current;
        sp.vy = ((e.clientX - d.x) / 60) * 10;
        sp.vx = ((e.clientY - d.y) / 60) * 4;
        sp.y += (e.clientX - d.x) / 120;
        sp.x = Math.max(-0.35, Math.min(0.5, sp.x + (e.clientY - d.y) / 300));
        drag.current = { x: e.clientX, y: e.clientY };
        inv.current?.();
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      style={{ touchAction: "pan-y", cursor: "grab" }}
    >
      <Model slug={slug} outline={outline} spinRef={spinRef} />
    </Canvas>
  );
}
