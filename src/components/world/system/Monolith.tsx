"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { glow, stone } from "./materials";
import { P } from "./palette";

/**
 * The wall at the heart of the world: two towering stone masses with a narrow
 * vertical opening between them. Behind the opening is light — the other side
 * of imagination. Used by the Arrival (front) and the Threshold (back).
 *
 * Local origin: centre of the opening at floor level; the wall faces +Z.
 */
export function Monolith({
  height = 34,
  halfWidth = 15,
  depth = 3.2,
  gap = 0.9,
  color = "#7C3A2B",
  lightColor = P.gold,
  lightIntensity = 3,
  lightMaterial,
  ...props
}: {
  height?: number;
  halfWidth?: number;
  depth?: number;
  gap?: number;
  color?: string;
  lightColor?: string;
  lightIntensity?: number;
  /** Pass your own material to animate the light (e.g. an entrance). */
  lightMaterial?: THREE.Material;
} & React.ComponentProps<"group">) {
  const geo = useMemo(() => new RoundedBoxGeometry(halfWidth, height, depth, 2, 0.06), [halfWidth, height, depth]);
  const mat = stone(color, { roughness: 0.9, repeat: 5, bump: 0.05 });
  const off = gap / 2 + halfWidth / 2;
  return (
    <group {...(props as object)}>
      <mesh geometry={geo} material={mat} position={[-off, height / 2, 0]} />
      <mesh geometry={geo} material={mat} position={[off, height / 2, 0]} />
      {/* The light inside the opening, set slightly back so the edges catch it. */}
      <mesh position={[0, height / 2, -depth * 0.35]} material={lightMaterial ?? glow(lightColor, lightIntensity)}>
        <planeGeometry args={[gap * 1.02, height]} />
      </mesh>
    </group>
  );
}

/** Low monumental steps leading up to the opening. */
export function Steps({ color = "#5E2C22", count = 4, width = 7, ...props }: { color?: string; count?: number; width?: number } & React.ComponentProps<"group">) {
  const mat = stone(color, { roughness: 0.88, repeat: 3, bump: 0.03 });
  return (
    <group {...(props as object)}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} material={mat} position={[0, 0.11 + i * 0.22, 1.9 - i * 0.62]}>
          <boxGeometry args={[width - i * 0.6, 0.22, 1.3 + (count - i) * 0.0]} />
        </mesh>
      ))}
    </group>
  );
}
