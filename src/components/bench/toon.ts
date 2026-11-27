import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * THE BENCH'S MATERIAL LANGUAGE: printed stickers, made solid (DESIGN.md v8, "The bench").
 *
 * - Toon: three flat steps and nothing in between. Lit = the colour itself, mid = 82% of it,
 *   shadow = the colour mixed 35% toward ink. One fixed warm key light; no environment, no gloss.
 * - Outline: an inverted hull in ink, pushed out along smoothed normals, so every object keeps the
 *   2px sticker edge.
 * - Dim: filtered-out objects drop toward 40% value (a chip in use), driven by one uniform.
 *
 * Materials are cached by colour and shared by every object that uses that colour.
 */

export const INK = "#140F0B";
export const CREAM = "#FFF3E8";
export const LIGHT_DIR = new THREE.Vector3(-0.55, 1, 0.65).normalize();

const toonVert = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;
const toonFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uInk;
  uniform vec3 uLight;
  uniform float uDim;
  varying vec3 vN;
  void main() {
    float d = dot(normalize(vN), uLight);
    vec3 c = d > 0.5 ? uColor : d > 0.08 ? uColor * 0.82 : mix(uColor, uInk, 0.35);
    c = mix(c, c * 0.4 + uInk * 0.1, uDim);
    gl_FragColor = vec4(c, 1.0);
  }
`;

type DimUniform = { value: number };

const cache = new Map<string, THREE.ShaderMaterial>();
/** The shared toon material for one colour (and one dim uniform per object, see `objectDim`). */
export function toon(color: string, dim: DimUniform) {
  const key = `${color}|${(dim as unknown as { id: number }).id ?? ""}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      vertexShader: toonVert,
      fragmentShader: toonFrag,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uInk: { value: new THREE.Color(INK) },
        uLight: { value: LIGHT_DIR },
        uDim: dim,
      },
    });
    cache.set(key, m);
  }
  return m;
}

let dimId = 0;
/** One dim uniform per object: every material on that object shares it, so one write dims the lot. */
export const objectDim = (): DimUniform => Object.assign({ value: 0 }, { id: ++dimId });

const hullVert = /* glsl */ `
  uniform float uWidth;
  attribute vec3 smoothN;
  void main() {
    vec3 p = position + normalize(smoothN) * uWidth;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
  }
`;
const hullFrag = /* glsl */ `
  uniform vec3 uInk;
  void main() { gl_FragColor = vec4(uInk, 1.0); }
`;

let hullMat: THREE.ShaderMaterial | null = null;
/** The one ink outline material (back faces of a slightly inflated copy). */
export function outlineMaterial() {
  hullMat ??= new THREE.ShaderMaterial({
    vertexShader: hullVert,
    fragmentShader: hullFrag,
    side: THREE.BackSide,
    uniforms: { uInk: { value: new THREE.Color(INK) }, uWidth: { value: 0.035 } },
  });
  return hullMat;
}

/**
 * The hull geometry for an outline: the same shape with normals averaged across hard edges
 * (so a box's corners don't split open when it is pushed outward).
 */
export function hullGeometry(g: THREE.BufferGeometry) {
  const plain = new THREE.BufferGeometry();
  plain.setAttribute("position", g.getAttribute("position").clone());
  if (g.index) plain.setIndex(g.index.clone());
  const merged = mergeVertices(plain.index ? plain.toNonIndexed() : plain, 1e-4);
  merged.computeVertexNormals();
  merged.setAttribute("smoothN", merged.getAttribute("normal"));
  return merged;
}

/** The cutting mat on the bench top: cream, with an ink grid at 8%, one line per bench unit. */
export function matMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCream: { value: new THREE.Color(CREAM) }, uInk: { value: new THREE.Color(INK) } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = w.xz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCream;
      uniform vec3 uInk;
      varying vec2 vP;
      void main() {
        vec2 g = abs(fract(vP - 0.5) - 0.5) / fwidth(vP);
        float line = 1.0 - clamp(min(g.x, g.y) - 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(uCream, uInk, line * 0.08), 1.0);
      }
    `,
  });
}

/** A rounded rectangle, centred, for flat shadows and sheets. */
export function roundedRect(w: number, h: number, r: number) {
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
