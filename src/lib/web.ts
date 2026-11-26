/**
 * An orb-web as one SVG path: radial strands from an anchor (a corner or a point) and a spiral of
 * threads that sag slightly toward the hub, the way real silk does. Deterministic, so it renders
 * identically on server and client. Used sparingly, at very low opacity.
 */
export function webPath({ x, y, r, a0, a1, spokes = 9, rings = 7 }: { x: number; y: number; r: number; a0: number; a1: number; spokes?: number; rings?: number }) {
  const f = (n: number) => n.toFixed(1);
  const ang = Array.from({ length: spokes }, (_, i) => a0 + (a1 - a0) * (i / (spokes - 1)));
  let d = "";
  ang.forEach((a) => {
    d += `M${f(x)} ${f(y)} L${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)} `;
  });
  for (let k = 1; k <= rings; k++) {
    const rr = r * (k / rings) * (0.9 + 0.1 * Math.sin(k));
    for (let i = 0; i < spokes - 1; i++) {
      const p0 = [x + Math.cos(ang[i]) * rr, y + Math.sin(ang[i]) * rr];
      const p1 = [x + Math.cos(ang[i + 1]) * rr, y + Math.sin(ang[i + 1]) * rr];
      const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      const sag = rr * 0.06;
      const dx = x - m[0];
      const dy = y - m[1];
      const L = Math.hypot(dx, dy) || 1;
      d += `M${f(p0[0])} ${f(p0[1])} Q${f(m[0] + (dx / L) * sag)} ${f(m[1] + (dy / L) * sag)} ${f(p1[0])} ${f(p1[1])} `;
    }
  }
  return d.trim();
}
