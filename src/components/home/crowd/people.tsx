import type { ReactNode } from "react";

/*
 * The crowd: everyday people in black-and-white ink, generated in code from a fixed seed (the
 * server and the client draw the same picture). Every person is built from parts: a face, hair,
 * clothes, sometimes glasses, headphones, a phone, a book, a bindi, a beard or grey hair. They
 * stand in four rows at different depths, leaving a clearing in the middle for the one person
 * who isn't random.
 */

export const INK = "#140F0B";
export const PAPER = "#FFF3E8";

export const W = 2000;
export const H = 560;
export const CX = W / 2;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Hair = "short" | "side" | "wavy" | "curly" | "spiky" | "long" | "longWavy" | "bun" | "braid" | "bald" | "cap" | "hijab";
type Top = "tee" | "teeInk" | "collar" | "hoodie" | "kurta" | "saree" | "sweater" | "check" | "jacket";
type Prop = "none" | "phone" | "book" | "lanyard" | "cup" | "strap";

export type Person = {
  row: number;
  x: number;
  hy: number; // head centre y
  s: number;
  kid: boolean;
  elder: boolean;
  hair: Hair;
  grey: boolean;
  top: Top;
  topTone: "paper" | "ink" | "hatch" | "stripe";
  glasses: 0 | 1 | 2;
  beard: 0 | 1 | 2;
  moustache: boolean;
  bindi: boolean;
  earrings: boolean;
  headphones: 0 | 1 | 2; // none, on head, round the neck
  mouth: 0 | 1 | 2 | 3;
  prop: Prop;
  look: number; // −1…1: idle gaze toward the centre
  tilt: number;
  hw: number;
  hh: number;
  /** How far toward the centre this person starts before the crowd flows out (SVG units). */
  flow: number;
};

const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];

const ROWS = [
  { s: 0.6, hy: 212, gap: 60, clear: 78, flow: 0.18 },
  { s: 0.74, hy: 262, gap: 74, clear: 100, flow: 0.24 },
  { s: 0.92, hy: 330, gap: 94, clear: 132, flow: 0.3 },
  { s: 1.14, hy: 420, gap: 118, clear: 178, flow: 0.38 },
];

export function makeCrowd(seed = 4127): Person[] {
  const r = rng(seed);
  const people: Person[] = [];
  ROWS.forEach((row, ri) => {
    let x = -60 + r() * row.gap + (ri % 2) * row.gap * 0.5;
    while (x < W + 70) {
      const fem = r() < 0.5;
      const kid = r() < 0.12;
      const elder = !kid && r() < 0.2;
      const s = row.s * (kid ? 0.78 : 0.92 + r() * 0.16);
      const hair: Hair = elder && !fem && r() < 0.45
        ? "bald"
        : fem
          ? pick(r, ["long", "longWavy", "bun", "braid", "long", "hijab", "curly", "longWavy"] as const)
          : pick(r, ["short", "side", "wavy", "curly", "spiky", "cap", "short", "side"] as const);
      const top: Top = fem && !kid && r() < 0.32 ? (r() < 0.6 ? "saree" : "kurta") : pick(r, ["tee", "teeInk", "collar", "hoodie", "kurta", "sweater", "check", "jacket", "tee"] as const);
      const p: Person = {
        row: ri,
        x,
        hy: row.hy + (r() - 0.5) * 16 + (kid ? 30 * row.s : 0),
        s,
        kid,
        elder,
        hair,
        grey: elder && hair !== "bald" ? r() < 0.8 : false,
        top,
        topTone: top === "teeInk" ? "ink" : pick(r, ["paper", "paper", "ink", "hatch", "stripe"] as const),
        glasses: elder ? (r() < 0.75 ? 1 : 2) : r() < 0.22 ? (r() < 0.5 ? 1 : 2) : 0,
        beard: !fem && !kid ? (r() < 0.3 ? 2 : r() < 0.35 ? 1 : 0) : 0,
        moustache: !fem && !kid && r() < 0.35,
        bindi: fem && !kid && (top === "saree" || top === "kurta" || r() < 0.25) && hair !== "hijab",
        earrings: fem && !kid && r() < 0.5 && hair !== "hijab",
        headphones: !elder && r() < 0.14 ? (r() < 0.5 ? 1 : 2) : 0,
        mouth: Math.floor(r() * 4) as Person["mouth"],
        prop: kid ? "none" : pick(r, ["none", "none", "none", "phone", "phone", "book", "lanyard", "cup", "strap"] as const),
        look: Math.max(-1, Math.min(1, (CX - x) / 520)),
        tilt: (r() - 0.5) * 9,
        hw: (kid ? 25 : 23 + r() * 5) * s,
        hh: (kid ? 27 : 28 + r() * 5) * s,
        flow: (CX - x) * row.flow,
      };
      if (Math.abs(x - CX) > row.clear) people.push(p);
      x += row.gap * (0.82 + r() * 0.34);
    }
  });
  return people;
}

/* ───────────────────────── drawing ───────────────────────── */

const n = (v: number) => v.toFixed(1);

function Body({ p, pat }: { p: Person; pat: (k: string) => string }) {
  const { x, hy, s, hh } = p;
  const sw = 2;
  const ny = hy + hh * 0.82; // neck base / collar line
  const sh = ny + 12 * s; // shoulder line
  const bw = (p.kid ? 46 : 60) * s; // half width at the shoulders
  const bottom = H + 40;
  const fill =
    p.top === "saree"
      ? PAPER
      : p.topTone === "ink"
        ? INK
        : p.topTone === "hatch"
          ? pat("hatch")
          : p.topTone === "stripe"
            ? pat("stripe")
            : p.top === "check"
              ? pat("check")
              : PAPER;
  const onInk = fill === INK;
  const line = onInk ? PAPER : INK;
  const body = `M${n(x - bw * 1.08)} ${bottom} C${n(x - bw * 1.08)} ${n(sh + 40 * s)}, ${n(x - bw)} ${n(sh + 6 * s)}, ${n(x - bw * 0.55)} ${n(sh - 2 * s)} L${n(x - 14 * s)} ${n(ny)} L${n(x + 14 * s)} ${n(ny)} L${n(x + bw * 0.55)} ${n(sh - 2 * s)} C${n(x + bw)} ${n(sh + 6 * s)}, ${n(x + bw * 1.08)} ${n(sh + 40 * s)}, ${n(x + bw * 1.08)} ${bottom} Z`;
  const extras: ReactNode[] = [];

  if (p.top === "collar" || p.top === "jacket") {
    extras.push(<path key="c" d={`M${n(x - 15 * s)} ${n(ny)} L${n(x)} ${n(ny + 22 * s)} L${n(x + 15 * s)} ${n(ny)}`} fill="none" stroke={line} strokeWidth={sw} />);
    extras.push(<path key="c2" d={`M${n(x - 15 * s)} ${n(ny)} l${n(-6 * s)} ${n(14 * s)} l${n(12 * s)} ${n(4 * s)} M${n(x + 15 * s)} ${n(ny)} l${n(6 * s)} ${n(14 * s)} l${n(-12 * s)} ${n(4 * s)}`} fill="none" stroke={line} strokeWidth={sw * 0.8} />);
    if (p.top === "jacket")
      extras.push(<path key="l" d={`M${n(x - 16 * s)} ${n(ny + 2 * s)} L${n(x - 6 * s)} ${bottom} M${n(x + 16 * s)} ${n(ny + 2 * s)} L${n(x + 6 * s)} ${bottom}`} stroke={line} strokeWidth={sw} />);
    else extras.push(<path key="pl" d={`M${n(x)} ${n(ny + 22 * s)} L${n(x)} ${bottom}`} stroke={line} strokeWidth={sw * 0.7} strokeDasharray={`${n(2 * s)} ${n(10 * s)}`} />);
  } else if (p.top === "hoodie") {
    extras.push(<path key="h" d={`M${n(x - 26 * s)} ${n(ny - 4 * s)} Q${n(x)} ${n(ny + 20 * s)} ${n(x + 26 * s)} ${n(ny - 4 * s)}`} fill="none" stroke={line} strokeWidth={sw} />);
    extras.push(<path key="hs" d={`M${n(x - 7 * s)} ${n(ny + 8 * s)} l0 ${n(24 * s)} M${n(x + 7 * s)} ${n(ny + 8 * s)} l0 ${n(22 * s)}`} stroke={line} strokeWidth={sw * 0.8} strokeLinecap="round" />);
  } else if (p.top === "kurta") {
    extras.push(<path key="k" d={`M${n(x)} ${n(ny)} L${n(x)} ${n(ny + 34 * s)}`} stroke={line} strokeWidth={sw} />);
    extras.push(<g key="kb" fill={line}>{[10, 20, 30].map((d) => <circle key={d} cx={x + 3 * s} cy={ny + d * s} r={1.4 * s} />)}</g>);
    extras.push(<path key="kc" d={`M${n(x - 12 * s)} ${n(ny + 1 * s)} Q${n(x)} ${n(ny + 6 * s)} ${n(x + 12 * s)} ${n(ny + 1 * s)}`} fill="none" stroke={line} strokeWidth={sw * 0.8} />);
  } else if (p.top === "sweater") {
    extras.push(<path key="sw" d={`M${n(x - 16 * s)} ${n(ny + 1 * s)} Q${n(x)} ${n(ny + 12 * s)} ${n(x + 16 * s)} ${n(ny + 1 * s)}`} fill="none" stroke={line} strokeWidth={sw * 1.6} />);
  } else if (p.top === "saree") {
    // the blouse under the drape, then the pallu across the shoulder with a dotted border
    extras.push(<path key="sb" d={`M${n(x - 18 * s)} ${n(ny + 2 * s)} Q${n(x)} ${n(ny + 14 * s)} ${n(x + 18 * s)} ${n(ny + 2 * s)}`} fill="none" stroke={INK} strokeWidth={sw} />);
    extras.push(<path key="sp" d={`M${n(x + bw * 0.5)} ${n(sh - 4 * s)} L${n(x + bw * 0.95)} ${n(sh + 6 * s)} L${n(x - bw * 0.4)} ${bottom} L${n(x - bw * 1.05)} ${bottom} Z`} fill={pat("hatch")} stroke={INK} strokeWidth={sw} />);
    extras.push(<path key="sd" d={`M${n(x + bw * 0.62)} ${n(sh)} L${n(x - bw * 0.62)} ${bottom}`} stroke={INK} strokeWidth={sw * 1.2} strokeDasharray={`${n(1 * s)} ${n(6 * s)}`} strokeLinecap="round" />);
  } else {
    extras.push(<path key="t" d={`M${n(x - 14 * s)} ${n(ny)} Q${n(x)} ${n(ny + 12 * s)} ${n(x + 14 * s)} ${n(ny)}`} fill="none" stroke={line} strokeWidth={sw} />);
  }

  // Props, held at the chest
  const py = sh + 34 * s;
  if (p.prop === "phone") {
    extras.push(
      <g key="ph">
        <rect x={x - 12 * s} y={py - 4 * s} width={15 * s} height={25 * s} rx={2.5 * s} fill={INK} stroke={PAPER} strokeWidth={sw * 0.6} transform={`rotate(-12 ${n(x)} ${n(py)})`} />
        <path d={`M${n(x - 18 * s)} ${n(py + 22 * s)} q${n(8 * s)} ${n(-10 * s)} ${n(20 * s)} ${n(-6 * s)} l${n(2 * s)} ${n(10 * s)} q${n(-12 * s)} ${n(6 * s)} ${n(-22 * s)} ${n(8 * s)} Z`} fill={PAPER} stroke={INK} strokeWidth={sw} />
      </g>,
    );
  } else if (p.prop === "book") {
    extras.push(
      <g key="bk">
        <path d={`M${n(x - 30 * s)} ${n(py)} l${n(30 * s)} ${n(6 * s)} l${n(30 * s)} ${n(-6 * s)} l0 ${n(26 * s)} l${n(-30 * s)} ${n(6 * s)} l${n(-30 * s)} ${n(-6 * s)} Z`} fill={PAPER} stroke={INK} strokeWidth={sw} />
        <path d={`M${n(x)} ${n(py + 6 * s)} l0 ${n(26 * s)} M${n(x - 24 * s)} ${n(py + 8 * s)} l${n(18 * s)} ${n(3 * s)} M${n(x - 24 * s)} ${n(py + 14 * s)} l${n(18 * s)} ${n(3 * s)}`} stroke={INK} strokeWidth={sw * 0.7} />
      </g>,
    );
  } else if (p.prop === "lanyard") {
    extras.push(
      <g key="ly">
        <path d={`M${n(x - 12 * s)} ${n(ny + 2 * s)} L${n(x)} ${n(py)} L${n(x + 12 * s)} ${n(ny + 2 * s)}`} fill="none" stroke={line} strokeWidth={sw * 0.8} />
        <rect x={x - 8 * s} y={py} width={16 * s} height={20 * s} rx={2 * s} fill={PAPER} stroke={INK} strokeWidth={sw * 0.9} />
        <path d={`M${n(x - 4 * s)} ${n(py + 6 * s)} l${n(8 * s)} 0 M${n(x - 4 * s)} ${n(py + 11 * s)} l${n(8 * s)} 0`} stroke={INK} strokeWidth={sw * 0.6} />
      </g>,
    );
  } else if (p.prop === "cup") {
    extras.push(
      <g key="cp">
        <path d={`M${n(x + 8 * s)} ${n(py)} l${n(18 * s)} 0 l${n(-3 * s)} ${n(24 * s)} l${n(-12 * s)} 0 Z`} fill={PAPER} stroke={INK} strokeWidth={sw} />
        <path d={`M${n(x + 7 * s)} ${n(py + 6 * s)} l${n(20 * s)} 0`} stroke={INK} strokeWidth={sw * 0.8} />
        <path d={`M${n(x + 2 * s)} ${n(py + 24 * s)} q${n(8 * s)} ${n(-10 * s)} ${n(14 * s)} ${n(-8 * s)} l${n(2 * s)} ${n(10 * s)} Z`} fill={PAPER} stroke={INK} strokeWidth={sw} />
      </g>,
    );
  } else if (p.prop === "strap") {
    extras.push(<path key="st" d={`M${n(x - bw * 0.5)} ${n(sh - 1 * s)} L${n(x + bw * 0.7)} ${bottom}`} stroke={onInk ? PAPER : INK} strokeWidth={sw * 3} />);
  }

  return (
    <>
      <path d={body} fill={fill} stroke={INK} strokeWidth={sw} />
      {extras}
    </>
  );
}

function HairBack({ p }: { p: Person }) {
  const { x, hy, s, hw, hh } = p;
  const c = p.grey ? PAPER : INK;
  if (p.hair === "long" || p.hair === "longWavy" || p.hair === "braid") {
    const len = (p.hair === "braid" ? 40 : 62) * s;
    return (
      <path
        d={`M${n(x - hw - 5 * s)} ${n(hy - 4 * s)} C${n(x - hw - 9 * s)} ${n(hy + len * 0.6)}, ${n(x - hw - 2 * s)} ${n(hy + len)}, ${n(x - hw + 8 * s)} ${n(hy + len + 6 * s)} L${n(x + hw - 8 * s)} ${n(hy + len + 6 * s)} C${n(x + hw + 2 * s)} ${n(hy + len)}, ${n(x + hw + 9 * s)} ${n(hy + len * 0.6)}, ${n(x + hw + 5 * s)} ${n(hy - 4 * s)} Z`}
        fill={c}
        stroke={INK}
        strokeWidth={2}
      />
    );
  }
  if (p.hair === "hijab") {
    return <path d={`M${n(x - hw - 9 * s)} ${n(hy + hh * 1.5)} C${n(x - hw - 12 * s)} ${n(hy - hh * 0.4)}, ${n(x - hw * 0.6)} ${n(hy - hh * 1.35)}, ${n(x)} ${n(hy - hh * 1.32)} C${n(x + hw * 0.6)} ${n(hy - hh * 1.35)}, ${n(x + hw + 12 * s)} ${n(hy - hh * 0.4)}, ${n(x + hw + 9 * s)} ${n(hy + hh * 1.5)} Z`} fill={PAPER} stroke={INK} strokeWidth={2} />;
  }
  return null;
}

function HairFront({ p, pat }: { p: Person; pat: (k: string) => string }) {
  const { x, hy, s, hw, hh } = p;
  const c = p.grey ? pat("hatch") : INK;
  const sw = 2;
  const cap = `M${n(x - hw - 2 * s)} ${n(hy - hh * 0.15)} C${n(x - hw - 3 * s)} ${n(hy - hh * 1.35)}, ${n(x + hw + 3 * s)} ${n(hy - hh * 1.35)}, ${n(x + hw + 2 * s)} ${n(hy - hh * 0.15)}`;
  switch (p.hair) {
    case "bald":
      return <path d={`M${n(x - hw)} ${n(hy - 2 * s)} q${n(-3 * s)} ${n(-10 * s)} ${n(2 * s)} ${n(-16 * s)} M${n(x + hw)} ${n(hy - 2 * s)} q${n(3 * s)} ${n(-10 * s)} ${n(-2 * s)} ${n(-16 * s)}`} stroke={INK} strokeWidth={sw * 1.6} fill="none" strokeLinecap="round" />;
    case "short":
      return <path d={`${cap} C${n(x + hw * 0.6)} ${n(hy - hh * 0.62)}, ${n(x - hw * 0.6)} ${n(hy - hh * 0.62)}, ${n(x - hw - 2 * s)} ${n(hy - hh * 0.15)} Z`} fill={c} stroke={INK} strokeWidth={sw} />;
    case "side":
      return <path d={`${cap} C${n(x + hw * 0.4)} ${n(hy - hh * 0.75)}, ${n(x - hw * 0.1)} ${n(hy - hh * 0.35)}, ${n(x - hw * 0.7)} ${n(hy - hh * 0.5)} C${n(x - hw * 0.9)} ${n(hy - hh * 0.4)}, ${n(x - hw)} ${n(hy - hh * 0.2)}, ${n(x - hw - 2 * s)} ${n(hy - hh * 0.15)} Z`} fill={c} stroke={INK} strokeWidth={sw} />;
    case "spiky": {
      const pts = Array.from({ length: 9 }, (_, k) => {
        const t = k / 8;
        const px = x - hw - 2 * s + t * (hw * 2 + 4 * s);
        const py = hy - hh * (0.95 + Math.sin(t * Math.PI) * 0.35) - (k % 2) * 8 * s;
        return `L${n(px)} ${n(py)}`;
      }).join(" ");
      return <path d={`M${n(x - hw - 2 * s)} ${n(hy - hh * 0.2)} ${pts} L${n(x + hw + 2 * s)} ${n(hy - hh * 0.2)} C${n(x + hw * 0.5)} ${n(hy - hh * 0.6)}, ${n(x - hw * 0.5)} ${n(hy - hh * 0.6)}, ${n(x - hw - 2 * s)} ${n(hy - hh * 0.2)} Z`} fill={c} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />;
    }
    case "wavy":
    case "curly":
    case "longWavy": {
      const k = p.hair === "curly" ? 9 : 7;
      return (
        <g fill={c} stroke={INK} strokeWidth={sw}>
          <path d={`${cap} C${n(x + hw * 0.4)} ${n(hy - hh * 0.55)}, ${n(x - hw * 0.4)} ${n(hy - hh * 0.55)}, ${n(x - hw - 2 * s)} ${n(hy - hh * 0.15)} Z`} />
          {Array.from({ length: k }, (_, i) => {
            const a = Math.PI * (1 + i / (k - 1));
            const r = (p.hair === "curly" ? 9 : 10) * s;
            return <circle key={i} cx={x + Math.cos(a) * hw * 0.98} cy={hy - hh * 0.3 + Math.sin(a) * hh * 0.95} r={r} />;
          })}
        </g>
      );
    }
    case "long":
    case "braid":
      return <path d={`${cap} C${n(x + hw * 0.7)} ${n(hy - hh * 0.9)}, ${n(x + 2 * s)} ${n(hy - hh * 0.75)}, ${n(x)} ${n(hy - hh * 0.95)} C${n(x - 2 * s)} ${n(hy - hh * 0.75)}, ${n(x - hw * 0.7)} ${n(hy - hh * 0.9)}, ${n(x - hw - 2 * s)} ${n(hy - hh * 0.15)} Z`} fill={c} stroke={INK} strokeWidth={sw} />;
    case "bun":
      return (
        <g fill={c} stroke={INK} strokeWidth={sw}>
          <circle cx={x} cy={hy - hh * 1.22} r={10 * s} />
          <path d={`${cap} C${n(x + hw * 0.6)} ${n(hy - hh * 0.7)}, ${n(x - hw * 0.6)} ${n(hy - hh * 0.7)}, ${n(x - hw - 2 * s)} ${n(hy - hh * 0.15)} Z`} />
        </g>
      );
    case "cap":
      return (
        <g stroke={INK} strokeWidth={sw}>
          <path d={`${cap} Z`} fill={INK} />
          <path d={`M${n(x - hw * 0.4)} ${n(hy - hh * 0.2)} L${n(x + hw + 22 * s)} ${n(hy - hh * 0.25)}`} strokeWidth={sw * 2.6} strokeLinecap="round" />
        </g>
      );
    case "hijab":
      return <path d={`M${n(x - hw - 1 * s)} ${n(hy + hh * 0.3)} C${n(x - hw - 3 * s)} ${n(hy - hh * 0.9)}, ${n(x + hw + 3 * s)} ${n(hy - hh * 0.9)}, ${n(x + hw + 1 * s)} ${n(hy + hh * 0.3)}`} fill="none" stroke={INK} strokeWidth={sw} />;
  }
}

function Face({ p }: { p: Person }) {
  const { x, hy, s, hw, hh } = p;
  const sw = 2;
  const ex = 9 * s;
  const ey = hy - 1 * s;
  const mouthY = hy + hh * 0.52;
  const mouth =
    p.mouth === 0 ? (
      <path d={`M${n(x - 7 * s)} ${n(mouthY - 1 * s)} Q${n(x)} ${n(mouthY + 6 * s)} ${n(x + 7 * s)} ${n(mouthY - 1 * s)}`} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" />
    ) : p.mouth === 1 ? (
      <path d={`M${n(x - 8 * s)} ${n(mouthY - 2 * s)} Q${n(x)} ${n(mouthY + 10 * s)} ${n(x + 8 * s)} ${n(mouthY - 2 * s)} Z`} fill={INK} />
    ) : p.mouth === 2 ? (
      <path d={`M${n(x - 5 * s)} ${n(mouthY + 1 * s)} L${n(x + 5 * s)} ${n(mouthY + 1 * s)}`} stroke={INK} strokeWidth={sw} strokeLinecap="round" />
    ) : (
      <ellipse cx={x} cy={mouthY + 1.5 * s} rx={3 * s} ry={4 * s} fill={INK} />
    );
  return (
    <>
      {/* ears + face */}
      {p.hair !== "hijab" && (
        <>
          <ellipse cx={x - hw} cy={hy + 1 * s} rx={4.5 * s} ry={7.5 * s} fill={PAPER} stroke={INK} strokeWidth={sw} />
          <ellipse cx={x + hw} cy={hy + 1 * s} rx={4.5 * s} ry={7.5 * s} fill={PAPER} stroke={INK} strokeWidth={sw} />
        </>
      )}
      <ellipse cx={x} cy={hy} rx={hw} ry={hh} fill={PAPER} stroke={INK} strokeWidth={sw} />
      {p.elder && <path d={`M${n(x - 6 * s)} ${n(hy - hh * 0.55)} q${n(6 * s)} ${n(-2 * s)} ${n(12 * s)} 0 M${n(x - hw * 0.62)} ${n(hy + hh * 0.3)} q${n(2 * s)} ${n(5 * s)} ${n(6 * s)} ${n(7 * s)} M${n(x + hw * 0.62)} ${n(hy + hh * 0.3)} q${n(-2 * s)} ${n(5 * s)} ${n(-6 * s)} ${n(7 * s)}`} stroke={INK} strokeWidth={sw * 0.6} fill="none" strokeLinecap="round" />}
      {/* eyes: they look toward the centre until the cursor moves */}
      <g className="pupil" style={{ ["--lx" as string]: p.look.toFixed(2) }}>
        <circle cx={x - ex} cy={ey} r={2.7 * s} fill={INK} />
        <circle cx={x + ex} cy={ey} r={2.7 * s} fill={INK} />
      </g>
      <path d={`M${n(x - ex - 5 * s)} ${n(ey - 8 * s)} l${n(9 * s)} ${n(-1.2 * s)} M${n(x + ex - 4 * s)} ${n(ey - 9.2 * s)} l${n(9 * s)} ${n(1.2 * s)}`} stroke={INK} strokeWidth={sw * (p.elder ? 1.3 : 1)} strokeLinecap="round" />
      {p.glasses > 0 && (
        <g fill="none" stroke={INK} strokeWidth={sw}>
          {p.glasses === 1 ? (
            <>
              <circle cx={x - ex} cy={ey} r={7 * s} />
              <circle cx={x + ex} cy={ey} r={7 * s} />
            </>
          ) : (
            <>
              <rect x={x - ex - 7.5 * s} y={ey - 5.5 * s} width={15 * s} height={11 * s} rx={2.5 * s} />
              <rect x={x + ex - 7.5 * s} y={ey - 5.5 * s} width={15 * s} height={11 * s} rx={2.5 * s} />
            </>
          )}
          <path d={`M${n(x - 2 * s)} ${n(ey)} L${n(x + 2 * s)} ${n(ey)}`} />
        </g>
      )}
      <path d={`M${n(x)} ${n(ey + 3 * s)} l${n(-3 * s)} ${n(8 * s)} l${n(4 * s)} 0`} stroke={INK} strokeWidth={sw * 0.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {p.bindi && <circle cx={x} cy={ey - 11 * s} r={1.8 * s} fill={INK} />}
      {p.beard === 2 && <path d={`M${n(x - hw * 0.95)} ${n(hy + hh * 0.05)} C${n(x - hw * 0.9)} ${n(hy + hh * 0.95)}, ${n(x - hw * 0.3)} ${n(hy + hh * 1.12)}, ${n(x)} ${n(hy + hh * 1.12)} C${n(x + hw * 0.3)} ${n(hy + hh * 1.12)}, ${n(x + hw * 0.9)} ${n(hy + hh * 0.95)}, ${n(x + hw * 0.95)} ${n(hy + hh * 0.05)} C${n(x + hw * 0.6)} ${n(hy + hh * 0.55)}, ${n(x - hw * 0.6)} ${n(hy + hh * 0.55)}, ${n(x - hw * 0.95)} ${n(hy + hh * 0.05)} Z`} fill={p.grey ? PAPER : INK} stroke={INK} strokeWidth={sw * 0.8} />}
      {p.beard === 1 && <path d={`M${n(x - hw * 0.8)} ${n(hy + hh * 0.4)} Q${n(x)} ${n(hy + hh * 1.3)} ${n(x + hw * 0.8)} ${n(hy + hh * 0.4)}`} stroke={INK} strokeWidth={sw * 0.7} strokeDasharray={`${n(1 * s)} ${n(3 * s)}`} fill="none" strokeLinecap="round" />}
      {p.moustache && <path d={`M${n(x - 8 * s)} ${n(mouthY - 4 * s)} Q${n(x)} ${n(mouthY - 9 * s)} ${n(x + 8 * s)} ${n(mouthY - 4 * s)} Q${n(x)} ${n(mouthY - 5 * s)} ${n(x - 8 * s)} ${n(mouthY - 4 * s)} Z`} fill={p.grey ? PAPER : INK} stroke={INK} strokeWidth={sw * 0.7} />}
      {p.beard !== 2 && mouth}
      {p.beard === 2 && <path d={`M${n(x - 5 * s)} ${n(mouthY + 1 * s)} Q${n(x)} ${n(mouthY + 4 * s)} ${n(x + 5 * s)} ${n(mouthY + 1 * s)}`} stroke={PAPER} strokeWidth={sw} fill="none" strokeLinecap="round" />}
      {p.earrings && (
        <g fill={PAPER} stroke={INK} strokeWidth={sw * 0.7}>
          <circle cx={x - hw - 1 * s} cy={hy + 11 * s} r={3 * s} />
          <circle cx={x + hw + 1 * s} cy={hy + 11 * s} r={3 * s} />
        </g>
      )}
    </>
  );
}

function Headphones({ p }: { p: Person }) {
  const { x, hy, s, hw, hh } = p;
  if (p.headphones === 1)
    return (
      <g stroke={INK} strokeWidth={2}>
        <path d={`M${n(x - hw - 3 * s)} ${n(hy)} C${n(x - hw - 3 * s)} ${n(hy - hh * 1.55)}, ${n(x + hw + 3 * s)} ${n(hy - hh * 1.55)}, ${n(x + hw + 3 * s)} ${n(hy)}`} fill="none" strokeWidth={4 * s} />
        <rect x={x - hw - 9 * s} y={hy - 9 * s} width={11 * s} height={18 * s} rx={4 * s} fill={INK} />
        <rect x={x + hw - 2 * s} y={hy - 9 * s} width={11 * s} height={18 * s} rx={4 * s} fill={INK} />
      </g>
    );
  if (p.headphones === 2) {
    const y = hy + hh * 1.05;
    return (
      <g stroke={INK} strokeWidth={2}>
        <path d={`M${n(x - 20 * s)} ${n(y)} Q${n(x)} ${n(y + 18 * s)} ${n(x + 20 * s)} ${n(y)}`} fill="none" strokeWidth={4 * s} />
        <ellipse cx={x - 22 * s} cy={y + 2 * s} rx={7 * s} ry={9 * s} fill={INK} />
        <ellipse cx={x + 22 * s} cy={y + 2 * s} rx={7 * s} ry={9 * s} fill={INK} />
      </g>
    );
  }
  return null;
}

export function PersonSvg({ p, pat }: { p: Person; pat: (k: string) => string }) {
  const { x, hy, s, hh } = p;
  const braid =
    p.hair === "braid" ? (
      <path d={`M${n(x + p.hw * 0.6)} ${n(hy + hh * 0.6)} q${n(10 * s)} ${n(20 * s)} ${n(2 * s)} ${n(46 * s)}`} stroke={p.grey ? PAPER : INK} strokeWidth={9 * s} strokeLinecap="round" fill="none" strokeDasharray={`${n(6 * s)} ${n(2 * s)}`} />
    ) : null;
  return (
    <g transform={`rotate(${p.tilt.toFixed(2)} ${n(x)} ${n(hy + hh)})`}>
      <HairBack p={p} />
      <Body p={p} pat={pat} />
      {/* neck */}
      <rect x={x - 9 * s} y={hy + hh * 0.6} width={18 * s} height={hh * 0.5} fill={PAPER} stroke={INK} strokeWidth={2} />
      {p.headphones === 2 && <Headphones p={p} />}
      <Face p={p} />
      <HairFront p={p} pat={pat} />
      {braid}
      {p.headphones === 1 && <Headphones p={p} />}
    </g>
  );
}

/** Fill patterns for a crowd layer (ids must be unique per SVG). */
export function Patterns({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill={PAPER} />
        <line x1="0" y1="0" x2="0" y2="7" stroke={INK} strokeWidth="2.2" />
      </pattern>
      <pattern id={`${id}-stripe`} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill={PAPER} />
        <rect width="10" height="3.4" fill={INK} />
      </pattern>
      <pattern id={`${id}-check`} width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill={PAPER} />
        <path d="M0 0 H14 M0 0 V14" stroke={INK} strokeWidth="2" />
        <path d="M7 0 V14 M0 7 H14" stroke={INK} strokeWidth="0.8" />
      </pattern>
    </defs>
  );
}
