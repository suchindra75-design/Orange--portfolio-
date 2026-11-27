import { character } from "@/content/character";

/**
 * THE CHARACTER'S POSE GRAPH, shared by the hero (HeroCharacter) and the lab's "Pose graph"
 * experiment, which draws it.
 */

export const RING = 0.85; // frames turned at least this far count as full turns
export const CUT = 10; // cost of turning straight from "looking at you" to a full turn, in frames (near "up" the video's own in-between frames win)

export const angDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/**
 * The pose graph. Node 0 is the centre frame (looking at you); node i + 1 is character.frames[i].
 * Edges: neighbours in the video (it starts and ends looking at you), the circle closed across
 * its one gap, and a direct turn from the centre to every full turn.
 */
export const N = character.frames.length + 1;
export const ANG = [0, ...character.frames.map((f) => (f.angle * Math.PI) / 180)];
export const MAG = [0, ...character.frames.map((f) => f.mag)];
export const RING_NODES = Array.from({ length: N }, (_, i) => i).filter((i) => i > 0 && MAG[i] >= RING);
export const EDGES: [number, number][][] = Array.from({ length: N }, () => []);
const link = (a: number, b: number, w: number) => {
  if (EDGES[a].some(([n]) => n === b)) return;
  EDGES[a].push([b, w]);
  EDGES[b].push([a, w]);
};
for (let i = 0; i < N - 1; i++) link(i, i + 1, 1);
link(N - 1, 0, 1);
{
  const byAngle = [...RING_NODES].sort((a, b) => ANG[a] - ANG[b]);
  const step = (2 * Math.PI) / byAngle.length;
  byAngle.forEach((a, k) => {
    const b = byAngle[(k + 1) % byAngle.length];
    link(a, b, Math.max(1, Math.round(angDiff(ANG[a], ANG[b]) / step)));
  });
}
for (const r of RING_NODES) link(0, r, CUT);

/** The cheapest route from one pose to another (Dijkstra on a graph of 65 nodes: instant). */
export function route(from: number, to: number, ok: (i: number) => boolean): number[] {
  if (from === to) return [];
  const dist = new Array<number>(N).fill(Infinity);
  const prev = new Array<number>(N).fill(-1);
  const done = new Array<boolean>(N).fill(false);
  dist[from] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === to) break;
    done[u] = true;
    for (const [v, w] of EDGES[u]) {
      // A frame that hasn't arrived yet can be passed through (skipped), but costs a little more.
      const c = dist[u] + w + (ok(v) ? 0 : 0.5);
      if (c < dist[v]) {
        dist[v] = c;
        prev[v] = u;
      }
    }
  }
  if (prev[to] < 0) return [];
  const path: number[] = [];
  for (let v = to; v !== from; v = prev[v]) path.push(v);
  return path.reverse();
}

