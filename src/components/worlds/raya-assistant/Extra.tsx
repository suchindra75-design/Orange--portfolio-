import type { ReactNode } from "react";
import type { WorldProps } from "../types";
import { Label } from "@/components/project/ProjectPage";

/**
 * EXTRA: "Up close". The three layers the owner added to MARK XLIX, each explained with a small
 * drawing. Every fact is from RAYA's source: audio/voice_gate.py, audio/speaker_id.py,
 * main.py (_approval_needed), actions/confirm.py, audio/engine.py, audio/voice.py.
 */

const C = {
  hair: "rgba(201,198,204,0.14)",
  silver: "#C9C6CC",
  apricot: "#FFB26B",
  gold: "#FFD9A0",
  ok: "#5FB8A0",
  drop: "#D07A5C",
};

/* ── A · voice gate: one utterance on a time axis (−0.2 s … 2.6 s) */
const X = (s: number) => ((s + 0.2) / 2.8) * 100;
const BARS = Array.from({ length: 96 }, (_, i) => {
  const s = -0.2 + (i / 95) * 2.8;
  if (s < 0) return 0.05 + 0.03 * Math.abs(Math.sin(i * 2.7));
  const env = Math.min(1, s / 0.12) * (0.55 + 0.45 * Math.abs(Math.sin(s * 3.1)));
  const syl = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37));
  return Math.max(0.08, env * syl);
});

function GateDiagram() {
  const marks: [number, string][] = [
    [0, "speech starts"],
    [0.8, "first check"],
    [1.3, "re-check"],
    [2.3, "give up"],
  ];
  return (
    <figure className="m-0">
      <div className="relative h-36 border-b sm:h-40" style={{ borderColor: C.hair }}>
        {/* pre-roll */}
        <div className="absolute inset-y-0" style={{ left: `${X(-0.15)}%`, width: `${X(0) - X(-0.15)}%`, background: "rgba(201,198,204,0.07)" }} />
        {/* the held stretch, before the first check */}
        <div className="absolute inset-y-0" style={{ left: `${X(0)}%`, width: `${X(0.8) - X(0)}%`, background: "rgba(255,178,107,0.05)" }} />
        <svg viewBox="0 0 96 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full">
          {BARS.map((a, i) => (
            <rect key={i} x={i + 0.3} width={0.34} y={50 - a * 40} height={a * 80} rx={0.17} fill={i / 95 < X(0) / 100 ? C.silver : C.apricot} opacity={i / 95 < X(0) / 100 ? 0.4 : i / 95 < X(0.8) / 100 ? 0.55 : 0.9} />
          ))}
        </svg>
        {marks.map(([s, l]) => (
          <div key={s} className="absolute inset-y-0 border-l" style={{ left: `${X(s)}%`, borderColor: s === 0.8 ? C.gold : C.hair, borderStyle: s === 0 ? "solid" : "dashed" }}>
            <span className="absolute -top-6 left-0 hidden -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.12em] sm:block" style={{ color: s === 0.8 ? C.gold : "#9C97A2" }}>
              {l}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-6 font-mono text-[10px] text-[#9C97A2]" aria-hidden="true">
        {[0, 0.8, 1.3, 2.3].map((s) => (
          <span key={s} className="absolute top-1.5 -translate-x-1/2" style={{ left: `${X(s)}%` }}>
            {s === 0 ? "0 s" : `${s}`}
          </span>
        ))}
      </div>
      <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9C97A2]">
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-3 rounded-[2px]" style={{ background: "rgba(201,198,204,0.25)" }} />
          150 ms kept from before
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-3 rounded-[2px]" style={{ background: "rgba(255,178,107,0.45)" }} />
          held on the computer
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-3 rounded-[2px]" style={{ background: C.apricot }} />
          streamed to Gemini, if it’s you
        </li>
      </ul>
      <figcaption className="sr-only">
        One utterance on a time axis. The 150 milliseconds before speech starts are kept. Audio is held on the computer until 0.8 seconds of speech, when the first check runs. An uncertain result is re-checked with 0.5 seconds more speech. At 2.3 seconds of speech the gate gives up and drops it.
      </figcaption>
      <ul className="mt-6 grid gap-3 text-[0.95rem] leading-snug">
        <Outcome dot={C.ok} k="It’s you">
          The turn opens, the held audio is sent, then it streams live until you stop talking.
        </Outcome>
        <Outcome dot={C.gold} k="Unsure">
          It listens half a second longer and checks again. Still unsure at 2.3 s: dropped, with a hint on screen.
        </Outcome>
        <Outcome dot={C.drop} k="Someone else">
          Dropped on the computer; Gemini never hears it. It keeps re-checking the latest second, so I can talk over the TV.
        </Outcome>
      </ul>
    </figure>
  );
}

function Outcome({ dot, k, children }: { dot: string; k: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[7.5rem_1fr] gap-3 border-t pt-3 sm:grid-cols-[9rem_1fr]" style={{ borderColor: C.hair }}>
      <span className="t-label flex items-center gap-2 pt-[0.2em]" style={{ color: dot }}>
        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
        {k}
      </span>
      <span className="opacity-85">{children}</span>
    </li>
  );
}

/* ── B · approval gate */
const RISKY: [string, string][] = [
  ["send_message", "every message"],
  ["file_controller", "create_file · create_folder · delete · move · copy · rename · write · organize_desktop"],
  ["code_helper", "write · edit · optimize · run · build · screen_debug"],
  ["dev_agent", "every project build"],
  ["file_processor", "run · extract"],
  ["computer_settings", "restart · shutdown"],
  ["desktop_control", "organize · clean"],
  ["game_updater", "shutdown_when_done · schedule"],
];

function Box({ children, tone = C.hair, strong = false }: { children: ReactNode; tone?: string; strong?: boolean }) {
  return (
    <div className="rounded-[8px] border px-3 py-2.5 font-mono text-[11px] leading-snug" style={{ borderColor: tone, background: strong ? "#1F1C22" : "transparent", color: "#ECE8EE" }}>
      {children}
    </div>
  );
}

function Arrow({ label, color = "#9C97A2" }: { label?: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 pl-4 font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color }}>
      <span aria-hidden="true" className="relative h-5 w-px bg-current opacity-60">
        <span className="absolute -bottom-[1px] -left-[3px] size-[7px] rotate-45 border-b border-r border-current" />
      </span>
      {label}
    </div>
  );
}

function ApprovalDiagram() {
  return (
    <figure className="m-0">
      <div className="grid gap-x-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Box strong>
            tool call <span style={{ color: C.gold }}>{"{ name, args }"}</span> from Gemini
          </Box>
          <Arrow />
          <Box tone="rgba(255,217,160,0.45)" strong>
            _approval_needed(name, args)
          </Box>
        </div>
        <div>
          <Arrow label="not risky" />
          <Box>
            runs straight away
            <span className="mt-1 block text-[10px] text-[#9C97A2]">open_app · volume_set · screen_process</span>
          </Box>
        </div>
        <div>
          <Arrow label="risky" color={C.gold} />
          <Box tone="rgba(255,217,160,0.45)" strong>
            Allow / Deny card in the app window
          </Box>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Arrow label="allow" color={C.ok} />
              <Box tone="rgba(95,184,160,0.5)">runs</Box>
            </div>
            <div>
              <Arrow label="anything else" color={C.drop} />
              <Box tone="rgba(208,122,92,0.5)">not performed</Box>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-5 text-[0.9rem] leading-relaxed opacity-75">
        “Anything else” means Deny, 60 seconds without an answer, no window to ask in, or an error. Gemini is told the action was not performed and not to retry unless asked again.
      </figcaption>
      <p className="t-label mt-8 text-[#9C97A2]">What asks first</p>
      <ul className="mt-3 grid gap-px overflow-hidden rounded-[10px] border" style={{ borderColor: C.hair, background: C.hair }}>
        {RISKY.map(([tool, what]) => (
          <li key={tool} className="grid gap-1 bg-[var(--w-bg)] px-3.5 py-2.5 sm:grid-cols-[10.5rem_1fr] sm:gap-4">
            <span className="font-mono text-[11.5px]" style={{ color: "#ECE8EE" }}>
              {tool}
            </span>
            <span className="font-mono text-[11px] leading-relaxed text-[#9C97A2]">{what}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ── C · audio engine */
function Chip({ k, v, accent = false, mine = false }: { k: string; v: string; accent?: boolean; mine?: boolean }) {
  return (
    <li className="relative rounded-[8px] border px-3 py-2.5" style={{ borderColor: accent ? "rgba(255,178,107,0.45)" : C.hair, background: mine ? "#1F1C22" : "transparent" }}>
      <span className="block text-[0.9rem] font-medium leading-tight">{k}</span>
      <span className="mt-1 block font-mono text-[10px] leading-snug text-[#9C97A2]">{v}</span>
      {mine && (
        <span className="absolute -top-2 right-2 rounded-full px-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em]" style={{ background: "#FFB26B", color: "#120A0F" }}>
          mine
        </span>
      )}
    </li>
  );
}

function AudioDiagram() {
  return (
    <figure className="m-0">
      <p className="t-label text-[#9C97A2]">In · what you say</p>
      <ol className="mt-3 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Chip k="Mic" v="16 kHz mono · 10 ms frames" accent />
        <Chip k="Echo + noise" v="WebRTC: high-pass, echo cancellation, noise suppression" />
        <Chip k="Speech-gated gain" v="adapts only while you speak" mine />
        <Chip k="Peak limiter" v="no clipping" mine />
        <Chip k="Voice activity" v="speech detection · meters" mine />
        <Chip k="Voice gate → Gemini" v="20 ms chunks" mine />
      </ol>
      <p className="t-label mt-7 text-[#9C97A2]">Out · what RAYA says</p>
      <ol className="mt-3 grid gap-2.5 sm:grid-cols-3">
        <Chip k="Gemini Live" v="24 kHz mono speech" />
        <Chip k="Output enhancement" v="normalisation · optional ducking" mine />
        <Chip k="Speaker" v="also the echo reference fed back to the mic chain" accent />
      </ol>
      <figcaption className="mt-5 text-[0.9rem] leading-relaxed opacity-75">
        Capture, processing and playback run on their own threads, never on the window’s. The same meters drive the voice ribbon in the app.
      </figcaption>
    </figure>
  );
}

/* ── the section */

function Layer({ n, file, title, children, diagram }: { n: string; file: string; title: ReactNode; children: ReactNode; diagram: ReactNode }) {
  return (
    <article className="grid gap-10 border-t py-[clamp(3rem,8svh,5.5rem)] md:grid-cols-12" style={{ borderColor: "rgba(201,198,204,0.14)" }}>
      <div className="md:col-span-4">
        <p className="t-label flex items-center gap-3 text-[var(--w-muted)]">
          <span className="text-[var(--w-accent)]">{n}</span>
          <span className="normal-case tracking-normal" style={{ fontFamily: "var(--font-mono)" }}>
            {file}
          </span>
        </p>
        <h3 className="mt-5 font-display text-[clamp(1.7rem,2.6vw,2.4rem)] font-light leading-[1.05] tracking-[-0.025em]">{title}</h3>
        <div className="t-body mt-5 grid gap-4 opacity-85">{children}</div>
      </div>
      <div className="min-w-0 md:col-span-8 md:col-start-5 md:pl-[4%] md:pt-8">{diagram}</div>
    </article>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-2 grid gap-2.5 border-t pt-4 text-[0.9rem]" style={{ borderColor: "rgba(201,198,204,0.14)" }}>
      {items.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3">
          <dt className="t-label pt-[0.2em] text-[var(--w-muted)]">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const em = (w: string) => <span className="t-italic text-[var(--w-accent)]">{w}</span>;

export function Extra({ project, n }: WorldProps) {
  const credit = project.notes[0]?.includes("FatihMakes");
  return (
    <section data-ground="dark" aria-labelledby="raya-upclose-title" className="section pb-[clamp(4rem,10svh,7rem)]">
      <Label n={n?.[0] ?? "·"}>Up close</Label>
      <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
        <h2 id="raya-upclose-title" className="t-display md:col-span-7">
          Two gates and a better {em("ear.")}
        </h2>
        <p className="t-body max-w-[34rem] opacity-80 md:col-span-5">
          {credit ? "The tools and the Gemini Live loop come from MARK XLIX by FatihMakes. " : ""}These three layers are mine. They decide who may speak to RAYA, what it may do without asking, and how well it hears.
        </p>
      </div>

      <div className="mt-[clamp(3rem,7svh,5rem)]">
        <Layer n="A" file="audio/voice_gate.py · speaker_id.py" title={<>Only my {em("voice")} gets through.</>} diagram={<GateDiagram />}>
          <p>Between the cleaned microphone audio and Gemini sits a speaker check that runs on the computer. Speech is held until there is enough of it to recognise, compared with my enrolled voiceprint, and only then does a turn open.</p>
          <Facts
            items={[
              ["Model", "CAM++ via sherpa-onnx: a 512-number voiceprint"],
              ["Speed", "about 46 ms per check"],
              ["Strictness", "lets about 1 % of other voices through on 1 s of speech"],
              ["Privacy", "voiceprints only, no audio; stored locally, never sent"],
            ]}
          />
          <p className="text-[0.9rem] leading-relaxed text-[var(--w-muted)]">It is not a lock: a recording of my voice gets through. So it never approves anything. That is the next layer’s job.</p>
        </Layer>

        <Layer n="B" file="main.py · actions/confirm.py" title={<>Risky actions wait for my {em("Allow.")}</>} diagram={<ApprovalDiagram />}>
          <p>Every tool call passes one check before it runs. Messages, file changes, running code, building projects and powering off all stop at an Allow / Deny card.</p>
          <p>The answer comes from a click in the app window, never from a tool argument the model could set itself, because text the model reads on a web page or in a file could try to steer it.</p>
          <p className="text-[0.9rem] leading-relaxed text-[var(--w-muted)]">It fails closed: if anything goes wrong, the action does not happen.</p>
        </Layer>

        <Layer n="C" file="audio/engine.py · voice.py" title={<>A cleaner {em("ear,")} measured.</>} diagram={<AudioDiagram />}>
          <p>One engine now captures and plays all audio. The mic goes through echo cancellation and noise suppression, then a gain stage, limiter and voice detection of my own before anything reaches the voice gate.</p>
          <p>Why my own gain: measured on this Mac’s speakers, WebRTC’s automatic gain raised the leftover echo by about 12 dB while the assistant talked. Mine adapts only while I’m speaking and holds still while it answers.</p>
          <p className="text-[0.9rem] leading-relaxed text-[var(--w-muted)]">Benchmarked with my own scripts under background noise: audio quality, speaker recognition and reply latency.</p>
        </Layer>
      </div>
    </section>
  );
}
