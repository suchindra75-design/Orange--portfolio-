"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import type { WorldProps } from "../types";
import { Label } from "@/components/project/ProjectPage";
import { useCanvasLoop } from "./canvas";
import { Desktop, type Flash } from "./Desktop";
import { APRICOT, SILVER, bandsAt, drawRibbon, speechLevel, type RibbonState } from "./ribbon";
import { DESK0, PRESETS, applyEffect, interpret, type Args, type Desk, type Plan } from "./plans";

/* ─────────────────────────── pipeline model ─────────────────────────── */

const STAGES = [
  { id: "mic", label: "Mic", short: "Mic", sub: "cleaned audio" },
  { id: "gate", label: "Voice gate", short: "Gate", sub: "is it you?" },
  { id: "model", label: "Gemini Live", short: "Gemini", sub: "hears, reasons" },
  { id: "tool", label: "Tool call", short: "Tool", sub: "{ name, args }" },
  { id: "approval", label: "Approval", short: "Ask", sub: "risky? ask" },
  { id: "action", label: "Action", short: "Act", sub: "on the computer" },
  { id: "reply", label: "Reply", short: "Reply", sub: "spoken" },
] as const;
type StageId = (typeof STAGES)[number]["id"];
type Status = "idle" | "active" | "done" | "skip" | "stop";
const IDLE: Record<StageId, Status> = { mic: "idle", gate: "idle", model: "idle", tool: "idle", approval: "idle", action: "idle", reply: "idle" };

type ToolStatus = "started" | "approval" | "done" | "declined";
type Item =
  | { k: "you"; text: string; via: "voice" | "typed" }
  | { k: "other"; text: string; source: string }
  | { k: "gate"; tone: "ok" | "bad" | "skip"; text: string }
  | { k: "tool"; name: string; args: [string, Args[string]][]; status: ToolStatus; result?: string }
  | { k: "reply"; text: string };

/** The app's own state captions (ui_stage.py STATE_TEXT). */
const STATE_WORD: Record<RibbonState, [string, string]> = {
  ready: ["Ready", "Speak or type a message."],
  listening: ["Listening", "Go ahead — I’m listening."],
  other: ["Listening", "Go ahead — I’m listening."],
  processing: ["Thinking", "Working on it…"],
  speaking: ["Speaking", ""],
  muted: ["Muted", ""],
};

/** The app waits 60 s; the demo waits less so you can watch "no answer" fail closed. */
const APPROVAL_S = 15;

class Cancelled extends Error {}

/* ─────────────────────────── the section ─────────────────────────── */

export function Demo({ project, n }: WorldProps) {
  const uid = useId();
  const [steps, setSteps] = useState(IDLE);
  const [log, setLog] = useState<Item[]>([]);
  const [mode, setModeState] = useState<RibbonState>("ready");
  const [desk, setDeskState] = useState<Desk>(DESK0);
  const [flash, setFlash] = useState<Flash>(null);
  const [approval, setApproval] = useState<{ title: string; detail: string; left: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState("");
  const [typed, setTyped] = useState("");
  /** The voice filter's brief note (ui.py _on_gate → stage.set_gate_hint, shown ~2.5 s while idle). */
  const [hint, setHint] = useState("");

  const runId = useRef(0);
  const timers = useRef(new Set<number>());
  const decide = useRef<((r: "allow" | "deny" | "timeout") => void) | null>(null);
  const deskRef = useRef<Desk>(DESK0);
  const logRef = useRef<Item[]>([]);
  const modeRef = useRef<RibbonState>("ready");
  const modeAt = useRef(0);
  const drawnMode = useRef<RibbonState>("ready");
  const flashKey = useRef(0);
  const lvl = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // the RAYA window's ribbon
  const { ref: ribbonRef, invalidate } = useCanvasLoop(({ ctx, w, h, t, reduced }) => {
    const st = modeRef.current;
    if (st !== drawnMode.current) {
      drawnMode.current = st;
      modeAt.current = t;
    }
    const since = t - modeAt.current;
    const target = st === "listening" ? speechLevel(t, 0.4) : st === "other" ? speechLevel(t * 0.9, 1.3) * 0.8 : st === "speaking" ? speechLevel(t * 1.1, 2.2) * 0.85 : 0;
    lvl.current = reduced ? target : lvl.current + (target - lvl.current) * (target > lvl.current ? 0.45 : 0.12);
    const x0 = w * 0.03;
    const x1 = w * 0.97;
    const cy = h * 0.5;
    ctx.strokeStyle = "rgba(201,198,204,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, Math.round(cy) + 0.5);
    ctx.lineTo(x1, Math.round(cy) + 0.5);
    ctx.stroke();
    drawRibbon(ctx, {
      x0,
      x1,
      cy,
      amp: h * 0.42,
      level: lvl.current * Math.min(1, since / 0.2 + (reduced ? 1 : 0)),
      t: reduced ? 1.2 : t,
      state: st,
      width: 2,
      band: bandsAt(t),
      color: st === "speaking" || st === "other" ? SILVER : APRICOT,
    });
  }, 30);

  /* ── helpers (called from the runner, never during render) */
  const setMode = (m: RibbonState) => {
    modeRef.current = m;
    setModeState(m);
    invalidate();
  };
  const setDesk = (d: Desk) => {
    deskRef.current = d;
    setDeskState(d);
  };
  const commit = () => setLog([...logRef.current]);
  const push = (it: Item) => {
    logRef.current = [...logRef.current, it];
    commit();
    return logRef.current.length - 1;
  };
  const patch = (i: number, p: Partial<Item>) => {
    logRef.current = logRef.current.map((it, j) => (j === i ? ({ ...it, ...p } as Item) : it));
    commit();
  };
  const step = (id: StageId, s: Status) => setSteps((prev) => ({ ...prev, [id]: s }));
  const later = (ms: number, fn: () => void) => {
    const tm = window.setTimeout(() => {
      timers.current.delete(tm);
      fn();
    }, ms);
    timers.current.add(tm);
  };
  const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const set = timers.current;
    const run = runId;
    return () => {
      run.current++;
      set.forEach((t) => window.clearTimeout(t));
      set.clear();
    };
  }, []);

  // focus the approval card when it appears, so keyboard and screen-reader users land on the question
  const approvalOpen = approval !== null;
  useEffect(() => {
    const el = cardRef.current;
    if (!approvalOpen || !el) return;
    el.focus({ preventScroll: true });
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
  }, [approvalOpen]);

  async function run(plan: Plan) {
    const id = ++runId.current;
    const fast = reduced();
    const sleep = (ms: number) =>
      new Promise<void>((res, rej) => {
        const tm = window.setTimeout(() => {
          timers.current.delete(tm);
          if (runId.current === id) res();
          else rej(new Cancelled());
        }, ms);
        timers.current.add(tm);
      });
    const typeOut = async (i: number, full: string, ms: number) => {
      if (fast) {
        patch(i, { text: full });
        return sleep(250);
      }
      const words = full.split(" ");
      for (let n = 1; n <= words.length; n++) {
        patch(i, { text: words.slice(0, n).join(" ") });
        await sleep(ms);
      }
    };

    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRunning(true);
    setSteps(IDLE);
    logRef.current = [];
    commit();
    setApproval(null);
    setHint("");

    try {
      /* 1–2 · mic and voice gate (typed instructions go straight into the session) */
      if (plan.via === "typed") {
        step("mic", "skip");
        step("gate", "skip");
        push({ k: "you", text: plan.said, via: "typed" });
        push({ k: "gate", tone: "skip", text: "Typed · goes straight into the Gemini Live session, no voice check" });
        setLive(`Typed: ${plan.said}`);
        await sleep(450);
      } else {
        const other = plan.via === "other";
        step("mic", "active");
        setMode(other ? "other" : "listening");
        const i = other ? push({ k: "other", text: "", source: plan.source ?? "Someone else" }) : push({ k: "you", text: "", via: "voice" });
        setLive(other ? "Someone else is talking near the microphone." : "Listening.");
        await typeOut(i, plan.said, 120);
        step("mic", "done");
        step("gate", "active");
        await sleep(650);
        if (other) {
          step("gate", "stop");
          setMode("ready");
          setHint("Ignored — that didn’t sound like you.");
          later(2500, () => setHint(""));
          push({ k: "gate", tone: "bad", text: "Voice gate · not your voice → dropped on the computer. Gemini never hears it." });
          setLive("Voice gate: not your voice. The speech was dropped and never reached Gemini. Nothing happened.");
          return;
        }
        step("gate", "done");
        push({ k: "gate", tone: "ok", text: "Voice gate · it’s you ✓  turn opens, audio streams to Gemini" });
        setLive("Voice gate: recognised as you.");
        await sleep(350);
      }

      /* 3 · Gemini Live */
      step("model", "active");
      setMode("processing");
      await sleep(900);
      step("model", "done");

      const before = deskRef.current;
      if (!plan.call) {
        step("tool", "skip");
        step("approval", "skip");
        step("action", "skip");
      } else {
        /* 4 · tool call */
        step("tool", "active");
        const ti = push({ k: "tool", name: plan.call.name, args: Object.entries(plan.call.args), status: "started" });
        setLive(`Tool call: ${plan.call.name}.`);
        await sleep(800);
        step("tool", "done");

        /* 5 · approval */
        if (plan.approval) {
          step("approval", "active");
          patch(ti, { status: "approval" });
          setApproval({ ...plan.approval, left: APPROVAL_S });
          setLive(`Approval needed: ${plan.approval.title}. Choose Allow or Deny. It cancels itself in ${APPROVAL_S} seconds.`);
          const answer = await new Promise<"allow" | "deny" | "timeout">((res) => {
            let left = APPROVAL_S;
            const iv = window.setInterval(() => {
              left -= 1;
              setApproval((a) => (a ? { ...a, left } : a));
              if (left <= 0) finish("timeout");
            }, 1000);
            timers.current.add(iv);
            const finish = (r: "allow" | "deny" | "timeout") => {
              window.clearInterval(iv);
              timers.current.delete(iv);
              decide.current = null;
              res(r);
            };
            decide.current = finish;
          });
          if (runId.current !== id) throw new Cancelled();
          setApproval(null);
          trigger.current?.focus({ preventScroll: true });
          if (answer !== "allow") {
            step("approval", "stop");
            step("action", "skip");
            patch(ti, { status: "declined", result: answer === "timeout" ? "No answer in time · not performed" : "Declined · not performed" });
            setLive(answer === "timeout" ? "No answer, so it did not run." : "Denied. It did not run.");
            await sleep(500);
            step("reply", "active");
            setMode("speaking");
            const ri = push({ k: "reply", text: "" });
            const declined = plan.declined ?? "Okay, I won’t.";
            // A small nod for whoever chose Deny on purpose.
            const said = answer === "deny" ? `Great power, great responsibility. ${declined.replace(/^Okay, /, "").replace(/^./, (c) => c.toUpperCase())}` : declined;
            await typeOut(ri, said, 90);
            step("reply", "done");
            setMode("ready");
            return;
          }
          step("approval", "done");
          setLive("Allowed.");
        } else {
          step("approval", "skip");
        }

        /* 6 · the action, on the (miniature) computer */
        step("action", "active");
        const e = plan.effect;
        if (e?.kind === "power" && e.action === "restart") {
          setFlash({ kind: "restart", key: ++flashKey.current });
          later(1700, () => setFlash(null));
        } else if (e && e.kind !== "power") {
          setDesk(applyEffect(deskRef.current, e));
          setFlash({ kind: e.kind === "message" ? "message" : e.kind, key: ++flashKey.current });
          later(2000, () => setFlash(null));
        }
        await sleep(e?.kind === "look" ? 1200 : 900);
        const result = plan.result?.(before) ?? "Done.";
        patch(ti, { status: "done", result });
        step("action", "done");
        setLive(`Done: ${result}`);
      }

      /* 7 · spoken reply */
      await sleep(300);
      step("reply", "active");
      setMode("speaking");
      const ri = push({ k: "reply", text: "" });
      await typeOut(ri, plan.reply(before), 95);
      step("reply", "done");
      setMode("ready");
      if (plan.effect?.kind === "power" && plan.effect.action === "shutdown") {
        await sleep(500);
        setDesk(applyEffect(deskRef.current, plan.effect));
      }
    } catch (err) {
      if (!(err instanceof Cancelled)) throw err;
    } finally {
      if (runId.current === id) {
        setRunning(false);
        if (modeRef.current !== "ready") setMode("ready");
      }
    }
  }

  const start = (plan: Plan) => {
    if (running) return;
    void run(plan);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = typed.trim();
    if (!t || running) return;
    setTyped("");
    start(interpret(t));
  };
  const resetDesk = () => {
    if (running) return;
    setDesk(DESK0);
    setLive("Desktop reset.");
  };

  const [word, stateCaption] = STATE_WORD[mode];
  const caption = hint && (mode === "ready" || mode === "listening") ? hint : stateCaption;
  const visibleFiles = desk.files.filter((f) => !desk.trash.includes(f));
  const deskSummary = desk.off
    ? "The simulated computer is shut down."
    : `Simulated desktop. Open windows: ${desk.windows.length ? desk.windows.join(", ") : "none"}. Files on the desktop: ${visibleFiles.join(", ") || "none"}. Volume ${desk.volume} percent.${desk.trash.length ? ` In the Trash: ${desk.trash.join(", ")}.` : ""}`;

  return (
    <section id="raya-console" data-ground="dark" aria-labelledby={`${uid}-title`} className="section py-[clamp(5rem,12svh,9rem)]">
      <style>{CSS}</style>
      <Label n={n?.[0] ?? "·"}>The demo</Label>

      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id={`${uid}-title`} className="t-display md:col-span-7">
          Say it. Watch it <span className="t-italic text-[var(--w-accent)]">act.</span>
        </h2>
        <div className="md:col-span-5">
          <span className="sim max-w-full !whitespace-normal leading-snug max-sm:!rounded-[0.6rem]">Simulation · nothing on your computer is touched</span>
          <p className="t-body mt-4 max-w-[34rem] opacity-80">
            Pick an instruction or type one. Each stage is RAYA’s real pipeline, with the tool names and argument shapes from its source. Anything risky stops and waits for your Allow.
          </p>
          <p className="mt-3 max-w-[34rem] text-[0.85rem] leading-relaxed text-[var(--w-muted)]">A small rule parser stands in for Gemini here, so only a handful of commands are understood.</p>
        </div>
      </div>

      <div className="mt-12 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--w-accent2)_16%,transparent)]" style={{ background: "#1B191F" }}>
        {/* ── instruction bar */}
        <div className="grid gap-6 border-b border-[color-mix(in_oklab,var(--w-accent2)_12%,transparent)] p-5 md:p-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p id={`${uid}-say`} className="t-label text-[var(--w-muted)]">
              Say to RAYA
            </p>
            <ul aria-labelledby={`${uid}-say`} className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-disabled={running}
                    onClick={() => start(p.plan)}
                    className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.85rem] leading-none sm:px-3.5 sm:py-2 sm:text-[0.9rem] transition-[background-color,border-color,opacity] duration-300 ${running ? "cursor-not-allowed opacity-45" : "hover:border-[var(--w-accent)] hover:bg-[color-mix(in_oklab,var(--w-accent)_10%,transparent)]"} ${p.id === "other" ? "border-dashed" : ""}`}
                    style={{ borderColor: p.id === "other" ? "rgba(201,198,204,0.4)" : "rgba(201,198,204,0.24)" }}
                  >
                    {p.id === "other" ? <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-[var(--w-accent2)] opacity-70" /> : <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-[var(--w-accent)]" />}
                    {p.label}
                    {p.tag && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--w-muted)]">
                        {p.tag === "asks" ? (
                          <>
                            · asks<span className="sr-only"> for approval</span>
                          </>
                        ) : (
                          <>· {p.tag}</>
                        )}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={onSubmit} className="w-full">
            <label htmlFor={`${uid}-type`} className="t-label text-[var(--w-muted)]">
              Or type an instruction
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id={`${uid}-type`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                maxLength={140}
                autoComplete="off"
                placeholder="e.g. Open Spotify"
                className="min-w-0 flex-1 rounded-full border bg-transparent px-4 py-2.5 text-[0.95rem] outline-none placeholder:text-[var(--w-muted)] placeholder:opacity-70 focus-visible:border-[var(--w-accent)]"
                style={{ borderColor: "rgba(201,198,204,0.24)" }}
              />
              <button
                type="submit"
                aria-disabled={running || !typed.trim()}
                className={`btn shrink-0 ${running || !typed.trim() ? "btn-ghost opacity-60" : ""}`}
                style={running || !typed.trim() ? undefined : { background: project.world.accent, color: "#120A0F" }}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* ── the pipeline rail */}
        <ol aria-label="Pipeline" className="grid grid-cols-7 border-b border-[color-mix(in_oklab,var(--w-accent2)_12%,transparent)] px-3 py-5 md:px-7 md:py-6">
          {STAGES.map((s, i) => (
            <RailNode key={s.id} label={s.label} short={s.short} sub={s.sub} status={steps[s.id]} first={i === 0} />
          ))}
        </ol>

        {/* ── RAYA (the assistant) and the computer it acts on */}
        <div className="grid gap-px bg-[color-mix(in_oklab,var(--w-accent2)_10%,transparent)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex min-w-0 flex-col bg-[#1B191F] p-5 md:p-7">
            <div className="flex items-baseline justify-between gap-4">
              <p className="t-label text-[var(--w-muted)]">RAYA · conversation</p>
              <p className="t-label flex items-center gap-2" style={{ color: mode === "processing" ? "#FFD9A0" : mode === "speaking" ? "#C9C6CC" : mode === "ready" ? project.world.muted : project.world.accent }}>
                <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
                {word}
              </p>
            </div>
            <div className="relative mt-3 h-[5.5rem]">
              <canvas ref={ribbonRef} aria-hidden="true" className="absolute inset-0 size-full" />
            </div>
            <p className="min-h-[1.4em] text-center text-[0.85rem] text-[var(--w-muted)]">{caption}</p>

            <ol aria-label="Conversation" className="mt-4 grid min-h-[17rem] content-start gap-3">
              {log.length === 0 && <li className="mt-6 text-center text-[0.9rem] text-[var(--w-muted)]">Pick an instruction to start.</li>}
              {log.map((it, i) => (
                <LogLine
                  key={i}
                  item={it}
                  approval={it.k === "tool" && it.status === "approval" ? approval : null}
                  cardRef={cardRef}
                  uid={uid}
                  onDecide={(ok) => decide.current?.(ok ? "allow" : "deny")}
                />
              ))}
            </ol>
          </div>

          <div className="order-first min-w-0 bg-[#1B191F] p-5 md:p-7 lg:order-none">
            <div className="flex items-baseline justify-between gap-4">
              <p className="t-label text-[var(--w-muted)]">The computer · abstract miniature</p>
              <button type="button" onClick={resetDesk} aria-disabled={running} className={`t-label link-u text-[var(--w-muted)] hover:text-[var(--w-ink)] ${running ? "opacity-45" : ""}`}>
                Reset desktop
              </button>
            </div>
            <figure className="mt-4">
              <div role="img" aria-label={deskSummary}>
                <Desktop desk={desk} flash={flash} busy={running} onPowerOn={() => setDesk({ ...deskRef.current, off: false })} />
              </div>
              <figcaption className="mt-3 text-[0.85rem] leading-relaxed text-[var(--w-muted)]">
                {approval ? "Waiting for your answer. Nothing on this computer changes until you click Allow." : "Shapes, not screenshots: this is where the tool call lands."}
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {live}
      </p>
    </section>
  );
}

/* ─────────────────────────── parts ─────────────────────────── */

function RailNode({ label, short, sub, status, first }: { label: string; short: string; sub: string; status: Status; first: boolean }) {
  const col =
    status === "done" ? "#5FB8A0" : status === "active" ? "#FFB26B" : status === "stop" ? "#B5573A" : "rgba(201,198,204,0.35)";
  const word = status === "done" ? "done" : status === "active" ? "in progress" : status === "stop" ? "stopped" : status === "skip" ? "skipped" : "waiting";
  return (
    <li className="relative flex min-w-0 flex-col items-center text-center">
      {!first && <span aria-hidden="true" className="absolute right-1/2 top-[7px] h-px w-full" style={{ background: status === "idle" ? "rgba(201,198,204,0.14)" : status === "skip" ? "rgba(201,198,204,0.2)" : col, opacity: status === "skip" ? 1 : 0.6 }} />}
      <span
        aria-hidden="true"
        className={`relative z-[1] grid size-[15px] place-items-center rounded-full border text-[8px] leading-none ${status === "active" ? "raya-pulse" : ""}`}
        style={{ borderColor: col, borderStyle: status === "skip" ? "dashed" : "solid", background: status === "done" || status === "active" || status === "stop" ? col : "#1B191F", color: "#120A0F" }}
      >
        {status === "done" ? "✓" : status === "stop" ? "×" : ""}
      </span>
      <span className="mt-2 font-mono text-[9px] uppercase leading-tight tracking-[0.1em] sm:text-[10px] sm:tracking-[0.14em]" style={{ color: status === "idle" || status === "skip" ? "#9C97A2" : "#ECE8EE" }}>
        <span className="sm:hidden" aria-hidden="true">
          {short}
        </span>
        <span className="max-sm:sr-only">{label}</span>
        <span className="sr-only">: {word}</span>
      </span>
      <span aria-hidden="true" className="mt-1 hidden text-[0.75rem] leading-tight text-[var(--w-muted)] md:block">
        {status === "skip" ? "skipped" : sub}
      </span>
    </li>
  );
}

function ArgValue({ v }: { v: Args[string] }) {
  return typeof v === "string" ? <span style={{ color: "#FFD9A0" }}>{JSON.stringify(v)}</span> : <span style={{ color: "#5FB8A0" }}>{String(v)}</span>;
}

function LogLine({
  item,
  approval,
  cardRef,
  uid,
  onDecide,
}: {
  item: Item;
  approval: { title: string; detail: string; left: number } | null;
  cardRef: RefObject<HTMLDivElement | null>;
  uid: string;
  onDecide: (ok: boolean) => void;
}) {
  if (item.k === "you" || item.k === "other") {
    const other = item.k === "other";
    return (
      <li className="raya-in">
        <p className="t-label text-[var(--w-muted)]">{other ? `${item.source} · not you` : item.via === "typed" ? "You · typed" : "You · voice"}</p>
        <p className={`mt-1 text-[1.02rem] leading-snug ${other ? "opacity-60" : ""}`}>
          “{item.text}
          {item.text ? "”" : ""}
          {!item.text && <span className="inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-current" />}
        </p>
      </li>
    );
  }
  if (item.k === "gate") {
    const col = item.tone === "ok" ? "#5FB8A0" : item.tone === "bad" ? "#D07A5C" : "#9C97A2";
    return (
      <li className="raya-in flex gap-2 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.08em]" style={{ color: col }}>
        <span aria-hidden="true" className="mt-[0.55em] inline-block h-px w-3 shrink-0 bg-current" />
        <span>{item.text}</span>
      </li>
    );
  }
  if (item.k === "tool") {
    const st = item.status;
    const tone = st === "done" ? "#5FB8A0" : st === "declined" ? "#D07A5C" : st === "approval" ? "#FFD9A0" : "#C9C6CC";
    const stWord = st === "started" ? "calling" : st === "approval" ? "waiting for approval" : st === "done" ? "done" : "not run";
    return (
      <li className="raya-in overflow-hidden rounded-[10px] border" style={{ borderColor: st === "approval" ? "rgba(255,217,160,0.4)" : "rgba(201,198,204,0.16)", background: "#17151A" }}>
        <div className="flex items-center justify-between gap-3 border-b px-3.5 py-2" style={{ borderColor: "rgba(201,198,204,0.1)" }}>
          <span className="t-label text-[var(--w-muted)]">Tool call</span>
          <span className="t-label flex items-center gap-1.5" style={{ color: tone }}>
            <span aria-hidden="true" className={`inline-block size-1.5 rounded-full bg-current ${st === "started" ? "animate-pulse" : ""}`} />
            {stWord}
          </span>
        </div>
        <pre className="whitespace-pre-wrap break-words px-3.5 py-3 font-mono text-[11.5px] leading-[1.65]" style={{ color: "#9C97A2" }}>
          {"{ "}
          <span style={{ color: "#9C97A2" }}>&quot;name&quot;</span>: <span style={{ color: "#ECE8EE" }}>&quot;{item.name}&quot;</span>,{"\n  "}
          <span>&quot;args&quot;</span>: {"{"}
          {item.args.map(([k, v], i) => (
            <span key={k}>
              {"\n    "}
              <span style={{ color: "#C9C6CC" }}>&quot;{k}&quot;</span>: <ArgValue v={v} />
              {i < item.args.length - 1 ? "," : ""}
            </span>
          ))}
          {item.args.length ? "\n  " : " "}
          {"}"}
          {"\n}"}
        </pre>
        {approval && (
          <div ref={cardRef} tabIndex={-1} role="group" data-sense="on" aria-labelledby={`${uid}-ap-title`} aria-describedby={`${uid}-ap-detail`} className="relative border-t px-3.5 pb-4 pt-3.5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2" style={{ borderColor: "rgba(255,217,160,0.25)", background: "#211D18" }}>
            {/* Spider-sense: the one moment that matters gets a brief tingle */}
            <svg aria-hidden="true" viewBox="0 0 100 40" preserveAspectRatio="none" className="sense-lines pointer-events-none absolute -inset-x-4 top-3 h-12 w-[calc(100%+2rem)] overflow-visible">
              <g fill="none" stroke="var(--color-web)" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke">
                <path d="M0 4 q-1.6 3 0 6 q1.6 3 0 6 q-1.6 3 0 6" vectorEffect="non-scaling-stroke" />
                <path d="M100 4 q1.6 3 0 6 q-1.6 3 0 6 q1.6 3 0 6" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
            <p className="t-label" style={{ color: "#FFD9A0" }}>
              Approval needed
            </p>
            <h3 id={`${uid}-ap-title`} className="mt-1.5 text-[1.05rem] font-semibold leading-snug">
              {approval.title}
            </h3>
            <pre id={`${uid}-ap-detail`} className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--w-muted)]">
              {approval.detail}
            </pre>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onDecide(true)} className="btn" style={{ background: "#FFB26B", color: "#120A0F" }}>
                Allow
              </button>
              <button type="button" onClick={() => onDecide(false)} className="btn btn-ghost">
                Deny
              </button>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--w-muted)]">
                No answer = Deny · {approval.left}s
              </span>
            </div>
            <div aria-hidden="true" className="mt-3 h-px w-full overflow-hidden" style={{ background: "rgba(201,198,204,0.12)" }}>
              <div className="h-full origin-left transition-transform duration-1000 ease-linear" style={{ background: "#FFD9A0", transform: `scaleX(${approval.left / APPROVAL_S})` }} />
            </div>
            <p className="mt-2 text-[0.75rem] text-[var(--w-muted)]">The app waits 60 seconds; shortened here.</p>
          </div>
        )}
        {item.result && (
          <p className="border-t px-3.5 py-2 font-mono text-[11px]" style={{ borderColor: "rgba(201,198,204,0.1)", color: tone }}>
            → {item.result}
          </p>
        )}
      </li>
    );
  }
  return (
    <li className="raya-in">
      <p className="t-label" style={{ color: "#C9C6CC" }}>
        RAYA · spoken
      </p>
      <p className="mt-1 font-display text-[1.2rem] font-medium leading-snug" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}>
        {item.text || " "}
      </p>
    </li>
  );
}

const CSS = `
@keyframes raya-win { from { opacity: 0; transform: translateY(8%) scale(.94) } to { opacity: 1; transform: none } }
.raya-win { animation: raya-win .55s var(--ease-out-expo) both; transform-origin: 50% 100%; }
@keyframes raya-scan { from { top: 7% } to { top: 96% } }
.raya-scan { animation: raya-scan 1.1s var(--ease-cine) both; }
@keyframes raya-hud { 0% { opacity: 0; transform: translateY(6px) } 12%, 80% { opacity: 1; transform: none } 100% { opacity: 0 } }
.raya-hud { animation: raya-hud 1.9s ease both; }
@keyframes raya-bump { 0%, 100% { transform: none } 35% { transform: translateY(-4px) scale(1.1) } }
.raya-bump { animation: raya-bump .6s var(--ease-out-expo) .4s both; }
@keyframes raya-pop { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: none } }
.raya-pop { animation: raya-pop .45s var(--ease-out-expo) both; }
@keyframes raya-bubble { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.raya-bubble { animation: raya-bubble .5s var(--ease-out-expo) .3s both; }
@keyframes raya-blink { 0% { opacity: 0 } 15%, 70% { opacity: 1 } 100% { opacity: 0 } }
.raya-blink { animation: raya-blink 1.6s ease both; }
@keyframes raya-pulse { from { box-shadow: 0 0 0 0 rgba(255,178,107,.45) } to { box-shadow: 0 0 0 7px rgba(255,178,107,0) } }
.raya-pulse { animation: raya-pulse 1.2s ease-out infinite; }
@keyframes raya-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
.raya-in { animation: raya-in .45s var(--ease-out-expo) both; }
@media (prefers-reduced-motion: reduce) {
  .raya-hud, .raya-blink, .raya-scan, .raya-pulse { animation-name: none !important; }
}
`;
