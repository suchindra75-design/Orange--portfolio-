"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * A cheap "volumetric" light shaft: an open cone (or slab) with an additive,
 * view-independent falloff shader. No ray marching, no extra render pass —
 * just one transparent mesh. Use it for light pouring through openings and
 * from fixtures. `intensity` can be animated through the returned material's
 * `uniforms.uIntensity`.
 */
const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uLength;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  // Fade along the shaft (uv.y = 1 at the source) and toward the silhouette.
  float along = pow(clamp(vUv.y, 0.0, 1.0), uLength);
  float facing = pow(abs(dot(vN, vV)), 1.6);
  float a = along * facing * uIntensity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

export function useShaftMaterial(color: string, intensity = 1, length = 1.4) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uLength: { value: length } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [color, intensity, length],
  );
}

/** A cone of light. Source at the top (y = +height/2), opening downward. */
export function LightCone({
  color,
  intensity = 0.5,
  radiusTop = 0.1,
  radiusBottom = 2,
  height = 6,
  length = 1.4,
  material,
  ...props
}: {
  color: string;
  intensity?: number;
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  length?: number;
  material?: THREE.ShaderMaterial;
} & React.ComponentProps<"group">) {
  const own = useShaftMaterial(color, intensity, length);
  return (
    <group {...(props as object)}>
      <mesh material={material ?? own} renderOrder={10}>
        <cylinderGeometry args={[radiusTop, radiusBottom, height, 32, 1, true]} />
      </mesh>
    </group>
  );
}

/** A flat slab of light (light through a slit). The source edge is uv.y = 1. */
export function LightSlab({
  color,
  intensity = 0.5,
  width = 1,
  height = 6,
  length = 1.4,
  material,
  ...props
}: { color: string; intensity?: number; width?: number; height?: number; length?: number; material?: THREE.ShaderMaterial } & React.ComponentProps<"group">) {
  const own = useShaftMaterial(color, intensity, length);
  return (
    <group {...(props as object)}>
      <mesh material={material ?? own} renderOrder={10}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  );
}
