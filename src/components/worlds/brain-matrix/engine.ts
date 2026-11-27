/**
 * The demo's recorder: a simulated mask feeding the two channels the app reads, with the
 * app's own numbers (from Brain-matrix-App's bleRingBuffer.ts and projects.ts):
 *   Bluetooth: notifications of 4 EEG,EOG pairs, ≈248 pairs/s received (nominal 256 Hz),
 *              per-pair times interpolated back from arrival at 1/256 s, a 30 s ring buffer
 *              of 7,680, and any silence over 100 ms counted as a gap and never filled.
 *   Cloud:     one packet about every 17–20 s, shown 20× faster.
 * The signal itself is synthetic (signal.ts).
 */
import { PAPER, drawPaper, eeg, eog, hash } from "./signal";

export type Source = "bluetooth" | "cloud";
export type Decimation = "minmax" | "nth";

export const NOMINAL_HZ = 256;
export const CAPACITY = NOMINAL_HZ * 30; // 7,680
export const GAP_S = 0.1;
const PAIRS_PER_NOTIFY = 4;
const NOTIFY_S = PAIRS_PER_NOTIFY / 248.4;
export const CLOUD_SPEED = 20;
const CLOUD_GAP_S = 30;

type Gap = { a: number; b: number };

/** Electrode "pops": one or two samples wide, every ~4 s. Exactly what naive decimation loses. */
const pop = (seq: number) => {
  const k = Math.floor(seq / 1009);
  const r = seq - k * 1009;
  if (r > 1) return 0;
  return (hash(k + 0.5) > 0.5 ? 1 : -1) * (2.1 + hash(k + 2) * 0.4);
};

export class BleChannel {
  eeg = new Float32Array(CAPACITY);
  eog = new Float32Array(CAPACITY);
  t = new Float64Array(CAPACITY);
  seqs = new Float64Array(CAPACITY);
  head = 0;
  size = 0;
  seq = 0;
  now = 0;
  private nextNotify = 0;
  private n = 0;
  lastNotify = -1;
  dropUntil = -1;
  gaps: Gap[] = [];
  gapCount = 0;
  /** Blinks the visitor asked for (times, in signal seconds): each adds an EOG bump as it streams in. */
  private blinks: number[] = [];

  constructor() {
    this.advance(31);
  }

  /** "Blink to drive": a blink of yours, simulated, about to arrive on the EOG channel. */
  blink() {
    this.blinks.push(this.now + 0.08);
  }

  private blinkAt(ts: number) {
    let v = 0;
    for (const c of this.blinks) v += Math.exp(-(((ts - c) / 0.075) ** 2)) * 1.3;
    return v;
  }

  advance(dt: number) {
    const end = this.now + dt;
    while (this.nextNotify <= end) {
      const rt = this.nextNotify;
      if (rt >= this.dropUntil) {
        if (this.lastNotify >= 0 && rt - this.lastNotify > GAP_S) {
          this.gapCount++;
          this.gaps.push({ a: this.lastNotify, b: rt });
        }
        this.lastNotify = rt;
        for (let i = 0; i < PAIRS_PER_NOTIFY; i++) {
          const ts = rt - (PAIRS_PER_NOTIFY - 1 - i) / NOMINAL_HZ;
          const s = this.seq++;
          this.eeg[this.head] = eeg(ts) + pop(s);
          this.eog[this.head] = eog(ts) + (this.blinks.length ? this.blinkAt(ts) : 0);
          this.t[this.head] = ts;
          this.seqs[this.head] = s;
          this.head = (this.head + 1) % CAPACITY;
          if (this.size < CAPACITY) this.size++;
        }
      }
      this.nextNotify += NOTIFY_S * (0.82 + 0.36 * hash(this.n++ * 0.731));
    }
    this.now = end;
    this.gaps = this.gaps.filter((g) => g.b > this.now - 32);
    if (this.blinks.length) this.blinks = this.blinks.filter((c) => c > this.now - 1);
  }

  drop(seconds: number) {
    this.dropUntil = this.now + seconds;
  }

  get dropping() {
    return this.now < this.dropUntil;
  }

  /** Index of the i-th oldest sample in the ring. */
  at(i: number) {
    return (this.head - this.size + i + CAPACITY * 2) % CAPACITY;
  }

  /** The app's receive-rate estimate: retained samples over their own span. */
  receivedHz(windowS = 30) {
    let n = 0;
    let first = -1;
    let last = -1;
    for (let i = 0; i < this.size; i++) {
      const ts = this.t[this.at(i)];
      if (ts < this.now - windowS) continue;
      if (first < 0) first = ts;
      last = ts;
      n++;
    }
    const span = last - first;
    return span > 0.5 ? n / span : 0;
  }
}

export type Packet = { t: number; seq: number; eeg: number; eog: number };

export class CloudChannel {
  packets: Packet[] = [];
  now = 0;
  private next = 0;
  private prev = 0;
  private k = 0;
  seq = 1000;
  skip = 0;
  lastT = -1;
  gaps: Gap[] = [];
  gapCount = 0;

  constructor() {
    this.advance(31 * 60);
  }

  advance(dt: number) {
    const end = this.now + dt;
    while (this.next <= end) {
      const t = this.next;
      if (this.skip > 0) {
        this.skip--;
      } else {
        if (this.lastT >= 0 && t - this.lastT > CLOUD_GAP_S) {
          this.gapCount++;
          this.gaps.push({ a: this.lastT, b: t });
        }
        this.packets.push({ t, seq: ++this.seq, eeg: eeg(t * 0.731 + 3), eog: eog(t * 0.613 + 7) });
        this.lastT = t;
      }
      this.prev = t;
      this.next = t + 17 + 3 * hash(this.k++ * 1.37);
    }
    this.now = end;
    const cut = this.now - 31 * 60;
    if (this.packets.length && this.packets[0].t < cut) this.packets = this.packets.filter((p) => p.t >= cut);
    this.gaps = this.gaps.filter((g) => g.b > cut);
  }

  /** Seconds (real, not compressed) until the next packet, and how far along the wait is. */
  wait() {
    return { left: this.next - this.now, frac: (this.now - this.prev) / (this.next - this.prev) };
  }

  /** Lose the next packet; when paused, run the clock on until the gap closes. */
  lose() {
    this.skip++;
  }
  catchUp() {
    this.advance(this.next - this.now + 0.01);
    this.advance(this.next - this.now + 0.01);
  }
}

/* ───────────────────────── drawing ───────────────────────── */

export type ScopeStats = {
  inWindow: number;
  drawn: number;
  columns: number;
};

const LANES = [
  { key: "eeg" as const, name: "EEG value", color: PAPER.ink },
  { key: "eog" as const, name: "EOG value", color: PAPER.verdigris },
];

function hatch(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.fillStyle = "rgba(122,36,48,0.05)";
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = "rgba(122,36,48,0.32)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0 - (y1 - y0); x < x1; x += 6) {
    ctx.moveTo(x, y1);
    ctx.lineTo(x + (y1 - y0), y0);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(122,36,48,0.6)";
  ctx.beginPath();
  ctx.moveTo(Math.round(x0) + 0.5, y0);
  ctx.lineTo(Math.round(x0) + 0.5, y1);
  ctx.moveTo(Math.round(x1) - 0.5, y0);
  ctx.lineTo(Math.round(x1) - 0.5, y1);
  ctx.stroke();
}

type Geo = { x0: number; x1: number; y0: number; y1: number; laneH: number; margin: number };

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, shift: number, font: string): Geo {
  const margin = 14;
  drawPaper(ctx, 0, 0, w, h, { shift, cell: 10, margin });
  const x0 = 14;
  const x1 = w - 30;
  const y0 = margin + 10;
  const y1 = h - margin - 24;
  ctx.font = `500 10px ${font}`;
  return { x0, x1, y0, y1, laneH: (y1 - y0) / LANES.length, margin };
}

function axis(ctx: CanvasRenderingContext2D, g: Geo, h: number, win: number, unit: "s" | "min", minStep: number) {
  // Thin the ticks until the labels have room (phones).
  const steps = [1, 2, 5, 10, 15, 30].filter((v) => v >= minStep);
  const step = steps.find((v) => (v / win) * (g.x1 - g.x0) >= 56) ?? win;
  ctx.fillStyle = PAPER.muted;
  ctx.strokeStyle = "rgba(26,18,22,0.35)";
  ctx.textBaseline = "alphabetic";
  const yT = h - g.margin - 8;
  for (let v = 0; v <= win + 1e-9; v += step) {
    const x = g.x1 - (v / win) * (g.x1 - g.x0);
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, g.y1 + 2);
    ctx.lineTo(Math.round(x) + 0.5, g.y1 + 7);
    ctx.stroke();
    const label = v === 0 ? "now" : `−${v} ${unit}`;
    ctx.textAlign = v === 0 ? "right" : v >= win - 1e-9 ? "left" : "center";
    ctx.fillText(label, v === 0 ? x + 4 : x, yT);
  }
  ctx.textAlign = "left";
}

function laneLabels(ctx: CanvasRenderingContext2D, g: Geo, suffix: string) {
  LANES.forEach((ln, i) => {
    const y = g.y0 + g.laneH * i + 13;
    const text = `${ln.name} · ${suffix}`;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(245,238,227,0.88)";
    ctx.fillRect(g.x0 + 4, y - 10, tw + 10, 14);
    ctx.fillStyle = ln.color;
    ctx.fillText(text, g.x0 + 9, y);
    if (i > 0) {
      ctx.strokeStyle = "rgba(26,18,22,0.14)";
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(g.x0, Math.round(g.y0 + g.laneH * i) + 0.5);
      ctx.lineTo(g.x1, Math.round(g.y0 + g.laneH * i) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function gapLabel(ctx: CanvasRenderingContext2D, xa: number, xb: number, y: number, text: string, x1: number) {
  const tw = ctx.measureText(text).width;
  let x = (xa + xb) / 2 - tw / 2;
  x = Math.max(4, Math.min(x, x1 - tw - 2));
  ctx.fillStyle = PAPER.sheet;
  ctx.fillRect(x - 4, y - 10, tw + 8, 14);
  ctx.fillStyle = PAPER.oxblood;
  ctx.fillText(text, x, y);
}

function nowLine(ctx: CanvasRenderingContext2D, g: Geo) {
  ctx.strokeStyle = PAPER.oxblood;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(Math.round(g.x1) + 0.5, g.margin + 2);
  ctx.lineTo(Math.round(g.x1) + 0.5, g.y1 + 2);
  ctx.stroke();
}

// Scratch buffers for the min-max pass (reused between frames).
let cap = 0;
let mn = new Float32Array(0);
let mx = new Float32Array(0);
let fv = new Float32Array(0);
let lv = new Float32Array(0);
let ft = new Float64Array(0);
let lt = new Float64Array(0);
let cnt = new Int32Array(0);
function scratch(n: number) {
  if (n <= cap) return;
  cap = n;
  mn = new Float32Array(n);
  mx = new Float32Array(n);
  fv = new Float32Array(n);
  lv = new Float32Array(n);
  ft = new Float64Array(n);
  lt = new Float64Array(n);
  cnt = new Int32Array(n);
}

export function drawBle(ctx: CanvasRenderingContext2D, w: number, h: number, ch: BleChannel, win: number, decim: Decimation, font: string): ScopeStats {
  const plotW0 = w - 44;
  const g = frame(ctx, w, h, ch.now * (plotW0 / win), font);
  const plotW = g.x1 - g.x0;
  const tStart = ch.now - win;
  const cols = Math.max(1, Math.floor(plotW));
  const toX = (t: number) => g.x0 + ((t - tStart) / win) * plotW;

  axis(ctx, g, h, win, "s", win <= 5 ? 1 : win <= 10 ? 2 : 5);

  // Gaps first, under the ink.
  for (const gp of ch.gaps) {
    if (gp.b < tStart) continue;
    hatch(ctx, Math.max(g.x0, toX(gp.a)), Math.min(g.x1, toX(gp.b)), g.y0, g.y1);
  }
  laneLabels(ctx, g, "µV");

  let inWindow = 0;
  for (let i = 0; i < ch.size; i++) if (ch.t[ch.at(i)] >= tStart) inWindow++;
  const stride = Math.max(1, Math.ceil(inWindow / cols));
  let drawn = 0;

  LANES.forEach((ln, li) => {
    const data = ln.key === "eeg" ? ch.eeg : ch.eog;
    const cy = g.y0 + g.laneH * (li + 0.5);
    const amp = g.laneH * 0.2;
    const lim = g.laneH * 0.48;
    const Y = (v: number) => cy - Math.max(-lim, Math.min(lim, v * amp));
    ctx.strokeStyle = ln.color;
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (decim === "minmax") {
      scratch(cols);
      cnt.fill(0, 0, cols);
      for (let i = 0; i < ch.size; i++) {
        const j = ch.at(i);
        const ts = ch.t[j];
        if (ts < tStart) continue;
        const c = Math.min(cols - 1, Math.floor(((ts - tStart) / win) * cols));
        const v = data[j];
        if (cnt[c] === 0) {
          mn[c] = mx[c] = fv[c] = v;
          ft[c] = ts;
        } else {
          if (v < mn[c]) mn[c] = v;
          if (v > mx[c]) mx[c] = v;
        }
        lv[c] = v;
        lt[c] = ts;
        cnt[c]++;
      }
      let prevT = -Infinity;
      let used = 0;
      for (let c = 0; c < cols; c++) {
        if (!cnt[c]) continue;
        used++;
        const x = g.x0 + c + 0.5;
        if (ft[c] - prevT <= GAP_S) ctx.lineTo(x, Y(fv[c]));
        else ctx.moveTo(x, Y(fv[c]));
        if (cnt[c] > 1) {
          ctx.lineTo(x, Y(mn[c]));
          ctx.lineTo(x, Y(mx[c]));
          ctx.lineTo(x, Y(lv[c]));
        }
        prevT = lt[c];
      }
      if (li === 0) drawn = used;
    } else {
      let prevT = -Infinity;
      let n = 0;
      for (let i = 0; i < ch.size; i++) {
        const j = ch.at(i);
        const ts = ch.t[j];
        if (ts < tStart || ch.seqs[j] % stride !== 0) continue;
        const x = toX(ts);
        if (ts - prevT <= GAP_S + stride / NOMINAL_HZ) ctx.lineTo(x, Y(data[j]));
        else ctx.moveTo(x, Y(data[j]));
        prevT = ts;
        n++;
      }
      if (li === 0) drawn = n;
    }
    ctx.stroke();
  });

  for (const gp of ch.gaps) {
    if (gp.b < tStart) continue;
    const xa = Math.max(g.x0, toX(gp.a));
    const xb = Math.min(g.x1, toX(gp.b));
    gapLabel(ctx, xa, xb, g.y1 - 6, `gap ${(gp.b - gp.a).toFixed(1)} s · not filled`, g.x1);
  }

  nowLine(ctx, g);
  // Pens at "now", parked while the link is down.
  if (ch.size) {
    const j = ch.at(ch.size - 1);
    LANES.forEach((ln, li) => {
      const cy = g.y0 + g.laneH * (li + 0.5);
      const v = (ln.key === "eeg" ? ch.eeg : ch.eog)[j];
      const y = cy - Math.max(-g.laneH * 0.48, Math.min(g.laneH * 0.48, v * g.laneH * 0.2));
      ctx.strokeStyle = "rgba(26,18,22,0.42)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w - 6, cy);
      ctx.lineTo(g.x1 + 2, y);
      ctx.stroke();
      ctx.fillStyle = PAPER.oxblood;
      ctx.beginPath();
      ctx.arc(g.x1, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  if (ch.dropping) {
    const text = "link down · no samples";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = PAPER.sheet;
    ctx.fillRect(g.x1 - tw - 14, g.y0 - 2, tw + 8, 14);
    ctx.fillStyle = PAPER.oxblood;
    ctx.fillText(text, g.x1 - tw - 10, g.y0 + 8);
  }
  return { inWindow, drawn, columns: cols };
}

export function drawCloud(ctx: CanvasRenderingContext2D, w: number, h: number, ch: CloudChannel, winMin: number, font: string, realNow: number): ScopeStats {
  const win = winMin * 60;
  const plotW0 = w - 44;
  const g = frame(ctx, w, h, ch.now * (plotW0 / win), font);
  const plotW = g.x1 - g.x0;
  const tStart = ch.now - win;
  const toX = (t: number) => g.x0 + ((t - tStart) / win) * plotW;
  axis(ctx, g, h, winMin, "min", winMin <= 5 ? 1 : winMin <= 10 ? 2 : 5);

  for (const gp of ch.gaps) {
    if (gp.b < tStart) continue;
    hatch(ctx, Math.max(g.x0, toX(gp.a)), Math.min(g.x1, toX(gp.b)), g.y0, g.y1);
  }
  laneLabels(ctx, g, "1 packet ≈ 17–20 s");

  const vis = ch.packets.filter((p) => p.t >= tStart);
  const dot = winMin >= 30 ? 1.6 : 2.3;
  LANES.forEach((ln, li) => {
    const cy = g.y0 + g.laneH * (li + 0.5);
    const amp = g.laneH * 0.34;
    const Y = (v: number) => cy - Math.max(-g.laneH * 0.46, Math.min(g.laneH * 0.46, v * amp));
    ctx.strokeStyle = ln.color;
    ctx.lineWidth = 1.1;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let prevT = -Infinity;
    for (const p of vis) {
      const x = toX(p.t);
      if (p.t - prevT <= CLOUD_GAP_S) ctx.lineTo(x, Y(p[ln.key]));
      else ctx.moveTo(x, Y(p[ln.key]));
      prevT = p.t;
    }
    ctx.stroke();
    ctx.fillStyle = ln.color;
    for (const p of vis) {
      ctx.beginPath();
      ctx.arc(toX(p.t), Y(p[ln.key]), dot, 0, Math.PI * 2);
      ctx.fill();
    }
    // Waiting: no data exists between the last packet and now. A faint dotted lead, not a value.
    const last = vis[vis.length - 1];
    if (last) {
      const x = toX(last.t);
      ctx.strokeStyle = "rgba(26,18,22,0.25)";
      ctx.setLineDash([1, 4]);
      ctx.beginPath();
      ctx.moveTo(x + 4, Y(last[ln.key]));
      ctx.lineTo(g.x1 - 3, Y(last[ln.key]));
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrival ring for a fresh packet (on screen time).
      const age = (ch.now - last.t) / CLOUD_SPEED;
      if (age < 0.7 && realNow > 0) {
        const k = age / 0.7;
        ctx.strokeStyle = `rgba(122,36,48,${0.7 * (1 - k)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, Y(last[ln.key]), 3 + k * 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

  for (const gp of ch.gaps) {
    if (gp.b < tStart) continue;
    const xa = Math.max(g.x0, toX(gp.a));
    const xb = Math.min(g.x1, toX(gp.b));
    gapLabel(ctx, xa, xb, g.y1 - 6, `missing · ${Math.round(gp.b - gp.a)} s`, g.x1);
  }
  nowLine(ctx, g);
  // The wait for the next packet, as a short bar along the pen.
  const { frac } = ch.wait();
  ctx.fillStyle = "rgba(122,36,48,0.18)";
  ctx.fillRect(g.x1 + 6, g.y0, 3, g.y1 - g.y0);
  ctx.fillStyle = PAPER.oxblood;
  const fh = (g.y1 - g.y0) * Math.max(0, Math.min(1, frac));
  ctx.fillRect(g.x1 + 6, g.y1 - fh, 3, fh);
  return { inWindow: vis.length, drawn: vis.length, columns: Math.floor(plotW) };
}
