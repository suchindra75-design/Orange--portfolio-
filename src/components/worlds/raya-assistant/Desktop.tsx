"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Desk } from "./plans";

/**
 * The computer RAYA acts on: an abstract miniature (shapes, not app screenshots, and no copy of
 * any real OS). Every change here comes from the simulated tool call that just ran.
 */
export type Flash = { kind: "volume" | "look" | "open" | "trash" | "message" | "restart"; key: number } | null;

const SILVER = "#C9C6CC";
const APRICOT = "#FFB26B";

const WIN_POS: Record<string, CSSProperties> = {
  "Visual Studio Code": { left: "6%", top: "13%", width: "56%", height: "58%" },
  WhatsApp: { left: "44%", top: "19%", width: "38%", height: "52%" },
};
const genericPos = (k: number): CSSProperties => ({ left: `${18 + k * 5}%`, top: `${16 + k * 5}%`, width: "44%", height: "50%" });

function Win({ title, style, children, front }: { title: string; style: CSSProperties; children: ReactNode; front: boolean }) {
  return (
    <div className="raya-win absolute flex flex-col overflow-hidden rounded-[7px] border" style={{ ...style, background: "#1D1B21", borderColor: front ? "rgba(201,198,204,0.32)" : "rgba(201,198,204,0.16)", boxShadow: "0 18px 40px -18px rgba(0,0,0,0.75)", zIndex: front ? 3 : 2 }}>
      <div className="flex h-[1.35rem] shrink-0 items-center justify-between border-b px-2.5" style={{ borderColor: "rgba(201,198,204,0.12)" }}>
        <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: front ? "#ECE8EE" : "#9C97A2" }}>
          {title}
        </span>
        <span className="h-px w-3" style={{ background: "rgba(201,198,204,0.4)" }} />
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

const CODE = [
  [0, 42, 1],
  [1, 58, 0],
  [1, 36, 0],
  [2, 64, 2],
  [2, 30, 0],
  [1, 18, 0],
  [0, 0, 0],
  [0, 50, 1],
  [1, 70, 0],
  [2, 44, 2],
  [1, 22, 0],
];

function CodeBody() {
  return (
    <div className="absolute inset-0 flex">
      <div className="w-[16%] border-r" style={{ borderColor: "rgba(201,198,204,0.1)", background: "rgba(201,198,204,0.03)" }}>
        {[60, 72, 48, 66].map((w, i) => (
          <div key={i} className="mx-[14%] mt-[12%] h-[3px] rounded-full" style={{ width: `${w}%`, background: "rgba(201,198,204,0.22)" }} />
        ))}
      </div>
      <div className="flex-1 px-[5%] pt-[4%]">
        {CODE.map(([indent, w, hue], i) => (
          <div key={i} className="mb-[2.6%] flex items-center gap-[2%]" style={{ paddingLeft: `${indent * 7}%` }}>
            <span className="h-[3px] rounded-full" style={{ width: `${w * 0.26}%`, background: hue === 1 ? "rgba(255,178,107,0.7)" : "rgba(201,198,204,0.28)" }} />
            {w > 0 && <span className="h-[3px] rounded-full" style={{ width: `${w * 0.6}%`, background: hue === 2 ? "rgba(255,217,160,0.55)" : "rgba(201,198,204,0.16)" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatBody({ sent }: { sent: Desk["sent"] }) {
  const last = sent[sent.length - 1];
  return (
    <div className="absolute inset-0 flex flex-col justify-end gap-2 p-[6%]">
      <div className="h-[11%] w-[46%] rounded-[6px]" style={{ background: "rgba(201,198,204,0.1)" }} />
      {last && (
        <div key={sent.length} className="raya-bubble ml-auto max-w-[82%] rounded-[8px] rounded-br-[2px] px-2.5 py-1.5 text-[10px] leading-snug sm:text-[11px]" style={{ background: "rgba(255,178,107,0.16)", color: "#F2E9DD", border: "1px solid rgba(255,178,107,0.35)" }}>
          <span className="mb-0.5 block font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color: "#9C97A2" }}>
            to {last.to}
          </span>
          {last.text}
          <span className="mt-0.5 block text-right font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: "#5FB8A0" }}>
            delivered
          </span>
        </div>
      )}
    </div>
  );
}

function GenericBody({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="text-center">
        <div className="mx-auto grid size-8 place-items-center rounded-[8px] font-display text-[15px]" style={{ background: "rgba(201,198,204,0.08)", color: APRICOT }}>
          {name.charAt(0)}
        </div>
        <div className="mx-auto mt-3 h-[3px] w-16 rounded-full" style={{ background: "rgba(201,198,204,0.18)" }} />
        <div className="mx-auto mt-1.5 h-[3px] w-10 rounded-full" style={{ background: "rgba(201,198,204,0.12)" }} />
      </div>
    </div>
  );
}

function FileIcon({ name, gone }: { name: string; gone: boolean }) {
  const ext = name.split(".").pop() ?? "";
  return (
    <div className="flex w-[3.2rem] flex-col items-center gap-1 sm:w-[3.6rem] transition-[opacity,transform] duration-700 ease-[var(--ease-cine)]" style={{ opacity: gone ? 0 : 1, transform: gone ? "translate(-30%, 140%) scale(0.4)" : "none" }}>
      <div className="relative h-[1.9rem] w-[1.55rem] rounded-[2px]" style={{ background: "#2A2730", border: "1px solid rgba(201,198,204,0.28)", clipPath: "polygon(0 0, 70% 0, 100% 26%, 100% 100%, 0 100%)" }}>
        <span className="absolute bottom-[3px] left-0 right-0 text-center font-mono text-[6.5px] uppercase" style={{ color: ext === "pdf" ? APRICOT : SILVER }}>
          {ext}
        </span>
      </div>
      <span className="max-w-full truncate text-[9px] leading-none" style={{ color: "#D9D5DC" }}>
        {name}
      </span>
    </div>
  );
}

const DOCK: { id: string; label: string; app?: string; glyph: ReactNode }[] = [
  { id: "code", label: "Code", app: "Visual Studio Code", glyph: <span className="font-mono text-[9px]">{"</>"}</span> },
  { id: "web", label: "Browser", glyph: <span className="block size-3 rounded-full border" style={{ borderColor: "currentColor" }} /> },
  { id: "msg", label: "Messages", app: "WhatsApp", glyph: <span className="block h-2.5 w-3.5 rounded-[3px] rounded-bl-none border" style={{ borderColor: "currentColor" }} /> },
  { id: "files", label: "Files", glyph: <span className="block h-2.5 w-3.5 rounded-[2px] border-t-[3px] border" style={{ borderColor: "currentColor" }} /> },
];

export function Desktop({ desk, flash, busy, onPowerOn }: { desk: Desk; flash: Flash; busy: boolean; onPowerOn: () => void }) {
  const front = desk.windows[desk.windows.length - 1];
  const extra = desk.windows.filter((w) => !DOCK.some((d) => d.app === w));
  const trashFull = desk.trash.length > 0;
  const bars = Math.round((desk.volume / 100) * 16);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px] border sm:aspect-[16/10]" style={{ borderColor: "rgba(201,198,204,0.16)", background: "radial-gradient(120% 95% at 78% 0%, #33202A 0%, #211A21 42%, #151317 100%)" }}>
      {/* a quiet horizon on the wallpaper */}
      <div aria-hidden="true" className="absolute inset-x-0 top-[58%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,178,107,0.18), transparent)" }} />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-[5] flex h-[1.3rem] items-center justify-between px-3" style={{ background: "rgba(18,10,15,0.45)", borderBottom: "1px solid rgba(201,198,204,0.08)" }}>
        <span className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.16em]" style={{ color: "#9C97A2" }}>
          <span className="inline-block size-[5px] rounded-full transition-colors duration-300" style={{ background: busy ? APRICOT : "rgba(201,198,204,0.4)" }} />
          RAYA
        </span>
        <span className="flex items-end gap-[2px]" aria-label={`Volume ${desk.volume} percent`}>
          {[0.25, 0.5, 0.75, 1].map((q, i) => (
            <span key={i} className="w-[2px] rounded-[1px] transition-colors duration-500" style={{ height: `${4 + i * 2}px`, background: desk.volume / 100 >= q - 0.2 && desk.volume > 0 ? SILVER : "rgba(201,198,204,0.22)" }} />
          ))}
        </span>
      </div>

      {/* desktop files */}
      <div className="absolute right-[3%] top-[11%] z-[1] flex flex-col items-center gap-3">
        {desk.files.map((f) => (
          <FileIcon key={f} name={f} gone={desk.trash.includes(f)} />
        ))}
      </div>

      {/* windows */}
      {desk.windows.map((w) => (
        <Win key={w} title={w} front={w === front} style={WIN_POS[w] ?? genericPos(extra.indexOf(w))}>
          {w === "Visual Studio Code" ? <CodeBody /> : w === "WhatsApp" ? <ChatBody sent={desk.sent} /> : <GenericBody name={w} />}
        </Win>
      ))}

      {/* dock */}
      <div className="absolute bottom-[3.5%] left-1/2 z-[4] flex -translate-x-1/2 items-end gap-1.5 rounded-[10px] px-2 py-1.5" style={{ background: "rgba(18,10,15,0.6)", border: "1px solid rgba(201,198,204,0.12)" }}>
        {DOCK.map((d) => {
          const on = !!d.app && desk.windows.includes(d.app);
          return (
            <div key={d.id} className="flex flex-col items-center gap-[3px]" title={d.label}>
              <div className="grid size-[1.55rem] place-items-center rounded-[6px]" style={{ background: "rgba(201,198,204,0.07)", color: on ? "#ECE8EE" : "#9C97A2", border: `1px solid ${on ? "rgba(201,198,204,0.3)" : "rgba(201,198,204,0.1)"}` }}>
                {d.glyph}
              </div>
              <span className="size-[3px] rounded-full" style={{ background: on ? APRICOT : "transparent" }} />
            </div>
          );
        })}
        {extra.map((w) => (
          <div key={w} className="raya-pop flex flex-col items-center gap-[3px]">
            <div className="grid size-[1.55rem] place-items-center rounded-[6px] font-display text-[11px]" style={{ background: "rgba(201,198,204,0.07)", color: "#ECE8EE", border: "1px solid rgba(201,198,204,0.3)" }}>
              {w.charAt(0)}
            </div>
            <span className="size-[3px] rounded-full" style={{ background: APRICOT }} />
          </div>
        ))}
        <span className="mx-0.5 h-5 w-px self-center" style={{ background: "rgba(201,198,204,0.16)" }} />
        <div className="flex flex-col items-center gap-[3px]" title="Trash">
          <div key={desk.trash.length} className={`grid size-[1.55rem] place-items-center rounded-[6px] ${trashFull ? "raya-bump" : ""}`} style={{ background: "rgba(201,198,204,0.07)", color: trashFull ? "#ECE8EE" : "#9C97A2", border: "1px solid rgba(201,198,204,0.1)" }}>
            <span className="relative block h-3 w-2.5 rounded-b-[2px] border border-t-0" style={{ borderColor: "currentColor" }}>
              <span className="absolute -left-[2px] -right-[2px] -top-[2px] h-px" style={{ background: "currentColor" }} />
              {trashFull && <span className="absolute inset-x-[2px] bottom-[2px] h-[4px] rounded-[1px]" style={{ background: APRICOT, opacity: 0.8 }} />}
            </span>
          </div>
          <span className="size-[3px]" />
        </div>
      </div>

      {/* volume HUD */}
      {flash?.kind === "volume" && (
        <div key={flash.key} className="raya-hud absolute bottom-[22%] left-1/2 z-[6] flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "rgba(18,10,15,0.82)", border: "1px solid rgba(201,198,204,0.2)" }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "#9C97A2" }}>
            Vol
          </span>
          <span className="flex gap-[2px]">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="h-2 w-[4px] rounded-[1px]" style={{ background: i < bars ? APRICOT : "rgba(201,198,204,0.18)" }} />
            ))}
          </span>
          <span className="w-6 text-right font-mono text-[10px]" style={{ color: "#ECE8EE" }}>
            {desk.volume}
          </span>
        </div>
      )}

      {/* screen capture */}
      {flash?.kind === "look" && (
        <div key={flash.key} className="pointer-events-none absolute inset-0 z-[7]">
          <div className="raya-scan absolute inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,178,107,0.9), transparent)" }} />
          {(["left-[3%] top-[8%] border-l border-t", "right-[3%] top-[8%] border-r border-t", "left-[3%] bottom-[4%] border-l border-b", "right-[3%] bottom-[4%] border-r border-b"] as const).map((c) => (
            <span key={c} className={`absolute size-4 ${c}`} style={{ borderColor: APRICOT }} />
          ))}
          <span className="absolute left-[4.5%] top-[10%] font-mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: APRICOT }}>
            screen captured
          </span>
        </div>
      )}

      {/* restart: a moment of dark */}
      {flash?.kind === "restart" && <div key={flash.key} className="raya-blink absolute inset-0 z-[8]" style={{ background: "#0F0D11" }} />}

      {/* shut down */}
      {desk.off && (
        <div className="absolute inset-0 z-[9] grid place-items-center" style={{ background: "#0F0D11" }}>
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#9C97A2" }}>
              Shut down · simulated
            </p>
            <button type="button" onClick={onPowerOn} className="btn btn-ghost mt-4 !py-2 text-[#ECE8EE]">
              Turn it back on
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
