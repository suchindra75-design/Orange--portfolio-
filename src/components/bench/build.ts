import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ProjectSlug } from "@/content/projects";
import { OBJECTS, type ObjectSpec } from "./objects";
import { hullGeometry, objectDim, roundedRect } from "./toon";

/**
 * Builds one bench object for drawing: its parts merged by colour (one mesh per colour), one ink
 * outline hull, flat screens with their real pictures (cover-fitted), a hard shadow and its box.
 * Used by the home bench (BenchCanvas) and the lab's turntable.
 */
export function buildObject(slug: ProjectSlug, onTexture: () => void) {
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
      onTexture();
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
}

export type BuiltObject = ReturnType<typeof buildObject>;

export function disposeObject(b: BuiltObject) {
  b.meshes.forEach((x) => x.geo.dispose());
  b.hull.dispose();
  b.shadowGeo.dispose();
  b.screens.forEach((s) => {
    s.geo.dispose();
    s.mat.map?.dispose();
    s.mat.dispose();
  });
}
