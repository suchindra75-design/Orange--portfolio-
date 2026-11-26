"use client";

import * as THREE from "three";

/**
 * Shared material library. Every space builds from these so surfaces read as
 * one physical world: honed stone, oiled metal, smoked glass, woven fabric.
 * Materials are cached by key — call them freely inside useMemo.
 */

const cache = new Map<string, THREE.Material>();
const memo = <M extends THREE.Material>(key: string, make: () => M): M => {
  let m = cache.get(key) as M | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
};

/** Tileable value-noise texture used as a bump map for stone and plaster. */
let grain: THREE.CanvasTexture | null = null;
export function grainTexture() {
  if (grain) return grain;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  // Three octaves of tileable noise from a random lattice.
  const lattice = (n: number) => Array.from({ length: n * n }, () => Math.random());
  const octaves = [
    { n: 8, a: 0.55, l: lattice(8) },
    { n: 32, a: 0.3, l: lattice(32) },
    { n: 128, a: 0.15, l: lattice(128) },
  ];
  const sample = (o: { n: number; l: number[] }, x: number, y: number) => {
    const fx = (x / S) * o.n;
    const fy = (y / S) * o.n;
    const x0 = Math.floor(fx) % o.n;
    const y0 = Math.floor(fy) % o.n;
    const x1 = (x0 + 1) % o.n;
    const y1 = (y0 + 1) % o.n;
    const tx = fx - Math.floor(fx);
    const ty = fy - Math.floor(fy);
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = o.l[y0 * o.n + x0] * (1 - sx) + o.l[y0 * o.n + x1] * sx;
    const b = o.l[y1 * o.n + x0] * (1 - sx) + o.l[y1 * o.n + x1] * sx;
    return a * (1 - sy) + b * sy;
  };
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let v = 0;
      for (const o of octaves) v += sample(o, x, y) * o.a;
      const k = (y * S + x) * 4;
      const b = Math.round(v * 255);
      img.data[k] = img.data[k + 1] = img.data[k + 2] = b;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(c);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  return grain;
}

/** Honed stone / cast concrete. Raking light reveals its grain. */
export function stone(color: string, opts: { roughness?: number; repeat?: number; bump?: number } = {}) {
  const { roughness = 0.92, repeat = 6, bump = 0.035 } = opts;
  return memo(`stone:${color}:${roughness}:${repeat}:${bump}`, () => {
    const t = grainTexture().clone();
    t.repeat.set(repeat, repeat);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, bumpMap: t, bumpScale: bump });
  });
}

/** Polished or satin metal. */
export function metal(color: string, roughness = 0.32) {
  return memo(`metal:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 1, envMapIntensity: 1.1 }));
}

/** Matte painted / lacquered surface. */
export function paint(color: string, roughness = 0.6) {
  return memo(`paint:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
}

/** Woven fabric: soft sheen, no specular hotspot. */
export function fabric(color: string, sheenColor = "#ffffff") {
  return memo(`fabric:${color}:${sheenColor}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.6, sheenColor }));
}

/**
 * Smoked glass. Physical transmission is too expensive for this world, so this
 * is a tinted, reflective, partially transparent surface instead.
 */
export function glass(tint: string = "#2B1620", opacity = 0.35) {
  return memo(`glass:${tint}:${opacity}`, () => new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.08, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 }));
}

/** A surface that is itself a light (lamps, openings, screens). Unaffected by tone mapping. */
export function glow(color: string, intensity = 1) {
  return memo(`glow:${color}:${intensity}`, () => {
    const c = new THREE.Color(color).multiplyScalar(intensity);
    return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  });
}
