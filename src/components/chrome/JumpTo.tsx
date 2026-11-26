"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { getLenis } from "@/lib/scroll";
import { markOrigin } from "./Links";
import { search, type JumpGroup, type JumpItem } from "./jump/search";

/** True when a key press belongs to a text field (so "/" types a slash there). */
function inTextField(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName !== "INPUT") return false;
  const type = (el as HTMLInputElement).type;
  return !["button", "checkbox", "radio", "range", "submit", "reset", "color", "file", "image"].includes(type);
}

/**
 * JUMP TO: the type-to-navigate palette. Opens on the "jump:open" event (the nav's "Jump to" and
 * the phone "Jump" buttons), ⌘K / Ctrl K, and "/" outside text fields. Closes on Esc, a click
 * outside, or navigation. Nothing is rendered, and nothing runs, while it is closed.
 */
export function JumpTo() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const opener = useRef<HTMLElement | null>(null);
  const restore = useRef(true);

  // Navigation closes it (the "store the previous value" pattern, not an effect). Focus is not
  // handed back after a navigation: the Palette's cleanup sees the path has changed.
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    const show = () => {
      setOpen((was) => {
        if (!was) {
          const a = document.activeElement;
          opener.current = a instanceof HTMLElement && a !== document.body ? a : null;
          restore.current = true;
        }
        return true;
      });
      setOpenedAt(window.location.pathname);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (document.getElementById("jump-palette")) {
          restore.current = true;
          setOpen(false);
        } else show();
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !inTextField(e.target)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("jump:open", show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("jump:open", show);
    };
  }, []);

  if (!open) return null;
  return (
    <Palette
      pathname={pathname}
      onClose={(returnFocus) => {
        restore.current = returnFocus;
        setOpen(false);
      }}
      opener={opener}
      restore={restore}
    />
  );
}

/* ───────────────────────── The open palette ───────────────────────── */

/** The visible viewport (shrinks with the on-screen keyboard), as "height:offsetTop". */
const viewport = {
  subscribe(cb: () => void) {
    const v = window.visualViewport;
    v?.addEventListener("resize", cb);
    v?.addEventListener("scroll", cb);
    window.addEventListener("resize", cb);
    return () => {
      v?.removeEventListener("resize", cb);
      v?.removeEventListener("scroll", cb);
      window.removeEventListener("resize", cb);
    };
  },
  get: () => {
    const v = window.visualViewport;
    return `${Math.round(v?.height ?? window.innerHeight)}:${Math.round(v?.offsetTop ?? 0)}`;
  },
};

const HINT: Record<JumpItem["kind"], string> = { project: "Open", page: "Go", external: "New tab ↗", mail: "Email" };
const GROUPS: JumpGroup[] = ["Pages", "Projects", "Also built", "Actions"];

function Palette({
  pathname,
  onClose,
  opener,
  restore,
}: {
  pathname: string;
  onClose: (returnFocus: boolean) => void;
  opener: React.RefObject<HTMLElement | null>;
  restore: React.RefObject<boolean>;
}) {
  const router = useRouter();
  const uid = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const vp = useSyncExternalStore(viewport.subscribe, viewport.get, () => "0:0");
  const [vvh, vvt] = vp.split(":").map(Number);

  const { items, egg } = useMemo(() => search(query), [query]);
  const filtering = query.trim().length > 0;
  const current = items[Math.min(active, items.length - 1)];
  const optId = (it: JumpItem) => `${uid}-opt-${it.id}`;

  // Open: stop the page scrolling, make the rest of the page inert, focus the field.
  // Close (unmount): undo all of it and hand focus back to whoever opened the palette.
  useEffect(() => {
    const html = document.documentElement;
    const lenis = getLenis();
    const wasStopped = lenis?.isStopped ?? false;
    lenis?.stop();
    const prevOverflow = html.style.overflow;
    if (!lenis) html.style.overflow = "hidden";

    const made: HTMLElement[] = [];
    const me = root.current;
    if (me?.parentElement) {
      for (const el of Array.from(me.parentElement.children)) {
        if (el === me || !(el instanceof HTMLElement) || el.inert || el.tagName === "SCRIPT") continue;
        el.inert = true;
        made.push(el);
      }
    }
    input.current?.focus({ preventScroll: true });

    const back = opener.current;
    const startPath = window.location.pathname;
    // Read at close time on purpose: the close reason (navigate or dismiss) is set just before.
    const shouldRestore = () => restore.current;
    return () => {
      made.forEach((el) => (el.inert = false));
      if (!wasStopped) lenis?.start();
      if (!lenis) html.style.overflow = prevOverflow;
      if (shouldRestore() && window.location.pathname === startPath && back?.isConnected) back.focus({ preventScroll: true });
    };
  }, [opener, restore]);

  // Keep the active row in view.
  const activeId = current ? optId(current) : undefined;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const choose = (item: JumpItem, newTab = false) => {
    if (newTab && (item.kind === "page" || item.kind === "project")) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      onClose(true);
      return;
    }
    if (item.kind === "external") {
      window.open(item.href, "_blank", "noopener,noreferrer");
      onClose(true);
      return;
    }
    if (item.kind === "mail") {
      onClose(true);
      window.location.assign(item.href);
      return;
    }
    if (item.href === pathname) {
      onClose(true);
      return;
    }
    onClose(false);
    if (item.kind === "project") {
      // The sheet rises straight from the middle (ProjectLink uses the click position).
      markOrigin(window.innerWidth / 2);
      router.push(item.href, { transitionTypes: ["open-project"] });
    } else {
      router.push(item.href, { transitionTypes: ["page"] });
    }
  };

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const n = items.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!n) return;
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (Math.min(a, n - 1) + d + n) % n);
    } else if (e.key === "PageDown" || e.key === "PageUp") {
      e.preventDefault();
      if (!n) return;
      setActive((a) => Math.max(0, Math.min(n - 1, a + (e.key === "PageDown" ? 5 : -5))));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (current) choose(current, e.metaKey || e.ctrlKey);
    }
  };

  const onPanelKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose(true);
      return;
    }
    if (e.key !== "Tab") return;
    // Focus trap: cycle through the panel's own controls.
    const f = Array.from(panel.current?.querySelectorAll<HTMLElement>("input, button") ?? []);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i === f.length - 1 ? 0 : i + 1;
    e.preventDefault();
    f[next].focus();
  };

  const row = (item: JumpItem, i: number) => {
    const on = current?.id === item.id;
    const eggRow = item.id === "egg-great-power";
    return (
      <div
        key={item.id}
        id={optId(item)}
        role="option"
        aria-selected={on}
        data-active={on}
        onMouseMove={() => !on && setActive(i)}
        onMouseDown={(e: ReactMouseEvent) => e.preventDefault()}
        onClick={(e) => choose(item, e.metaKey || e.ctrlKey)}
        className="group relative mx-2 flex cursor-pointer scroll-my-2 items-center gap-3 rounded-[14px] border-2 border-transparent px-3 py-2 text-ink data-[active=true]:border-ink data-[active=true]:bg-pop data-[active=true]:shadow-[0_3px_0_var(--color-ink)] sm:gap-4"
      >
        <span
          aria-hidden="true"
          className="t-label grid h-7 w-8 shrink-0 place-items-center rounded-[8px] border-2 border-ink bg-cream tracking-[0.04em] text-ink group-data-[active=true]:bg-ink group-data-[active=true]:text-cream"
        >
          {item.mark}
        </span>
        <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <span className={eggRow ? "truncate text-[1.3rem] font-extrabold leading-tight tracking-[-0.03em]" : "truncate text-[1.05rem] font-bold leading-snug tracking-[-0.02em]"}>{item.title}</span>
          {item.detail && <span className="t-label truncate text-ink/65 group-data-[active=true]:text-ink">{item.detail}</span>}
        </span>
        <span aria-hidden="true" className="hidden shrink-0 sm:inline">
          {on ? (
            <span className="t-label inline-block rounded-[7px] bg-ink px-2 py-0.5 text-cream">↵ {HINT[item.kind]}</span>
          ) : filtering && !eggRow ? (
            <span className="t-label text-ink/55">{item.group}</span>
          ) : null}
        </span>
      </div>
    );
  };

  const count = items.length;
  const status = filtering ? (count ? `${count} result${count === 1 ? "" : "s"}` : "No results") : `${count} places to jump to`;

  return (
    <div
      ref={root}
      id="jump-palette"
      className="jump fixed inset-0 z-[160]"
      style={{ "--vvh": `${vvh || 0}px`, "--vvt": `${vvt || 0}px` } as React.CSSProperties}
    >
      <style>{JUMP_CSS}</style>
      <div aria-hidden="true" className="jump-scrim absolute inset-0" onMouseDown={() => onClose(true)} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        onKeyDown={onPanelKey}
        className="jump-panel absolute inset-x-3 top-[calc(var(--vvt)+0.75rem)] flex max-h-[calc(var(--vvh)-1.5rem-6px)] flex-col overflow-hidden rounded-[22px] border-2 border-ink bg-cream text-ink shadow-[0_6px_0_var(--color-ink)] sm:top-[12vh] sm:mx-auto sm:max-h-[min(36rem,calc(var(--vvh)-12vh-2rem))] sm:w-[min(40rem,calc(100%-2*var(--gutter)))] sm:shadow-[0_10px_0_var(--color-ink)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-5 sm:pt-4">
          <h2 id={`${uid}-title`} className="t-label text-ink/70">
            {egg ? "With great power" : "Jump to"}
          </h2>
          <button
            type="button"
            onClick={() => onClose(true)}
            className="t-label rounded-[9px] border-2 border-ink bg-cream px-2.5 py-1 text-ink shadow-[0_2px_0_var(--color-ink)] transition-[translate,box-shadow,background-color] duration-150 hover:-translate-y-px hover:bg-pop hover:shadow-[0_3px_0_var(--color-ink)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="sm:hidden">Close</span>
            <span className="hidden sm:inline">Esc</span>
          </button>
        </div>

        {/* The field (the native caret, in orange) */}
        <div className="px-4 pb-3.5 pt-2.5 sm:px-5 sm:pb-4">
          <div className="flex items-center gap-2.5 rounded-[16px] border-2 border-ink bg-white px-2.5 transition-shadow duration-150 focus-within:shadow-[0_0_0_3px_var(--color-pop)] motion-reduce:transition-none sm:gap-3 sm:px-3">
            <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border-2 border-ink bg-pop text-[0.95rem] font-extrabold leading-none text-ink">
              ›
            </span>
            <input
              ref={input}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-label="Jump to a page, project or action"
              aria-describedby={`${uid}-how`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="A page, a project, or “hardware”"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKey}
              className="min-w-0 flex-1 bg-transparent py-2 text-[1.3rem] font-bold tracking-[-0.03em] text-ink outline-none [caret-color:var(--color-pop)] placeholder:font-semibold placeholder:text-ink/40 selection:bg-pop selection:text-ink sm:py-2.5 sm:text-[1.75rem]"
            />
          </div>
        </div>

        {/* Results */}
        <div id={`${uid}-list`} role="listbox" aria-label="Results" data-lenis-prevent className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain border-t-2 border-ink pb-3 pt-2">
          {egg && (
            <svg aria-hidden="true" className="jump-strand pointer-events-none absolute z-[1]" width="2" height="20" viewBox="0 0 2 20">
              <line x1="1" y1="0" x2="1" y2="20" pathLength={1} stroke="var(--color-ink)" strokeWidth="2" />
            </svg>
          )}
          {!count && (
            <p className="px-4 py-6 text-[0.98rem] font-medium text-ink/75 sm:px-5" role="presentation">
              Nothing matches “{query.trim()}”. Try a project name, “hardware”, or “contact”.
            </p>
          )}
          {filtering || egg
            ? items.map((it, i) => row(it, i))
            : GROUPS.map((g) => {
                const inGroup = items.filter((it) => it.group === g);
                if (!inGroup.length) return null;
                const gid = `${uid}-g-${g.replace(/\s+/g, "")}`;
                return (
                  <div key={g} role="group" aria-labelledby={gid} className="pb-1">
                    <div id={gid} role="presentation" className="t-label px-4 pb-1.5 pt-3 text-ink/60 sm:px-5">
                      {g}
                    </div>
                    {inGroup.map((it) => row(it, items.indexOf(it)))}
                  </div>
                );
              })}
        </div>

        {/* Footer: how to drive it, and what it honestly is */}
        <div className="flex items-center justify-between gap-4 border-t-2 border-ink bg-ink px-4 py-2.5 text-cream sm:px-5">
          <p id={`${uid}-how`} className="t-label hidden items-center gap-2 text-cream/75 sm:flex">
            <Kbd>↑↓</Kbd> move <Kbd>↵</Kbd> open <Kbd>esc</Kbd> close
          </p>
          <p className="t-label text-cream/75">Keyword search · no AI</p>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>
      </div>
    </div>
  );
}

/** A small cream key chip for the dark footer. */
function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-grid min-w-[1.6rem] place-items-center rounded-[6px] border-2 border-cream bg-cream px-1 font-mono text-[0.7rem] font-semibold normal-case leading-[1.3] tracking-normal text-ink">{children}</kbd>;
}

const JUMP_CSS = `
.jump-scrim{background:radial-gradient(120% 70% at 50% 0%,color-mix(in oklab,var(--color-pop) 38%,transparent),transparent 72%),color-mix(in oklab,var(--color-ink) 66%,transparent);animation:jump-fade .18s ease-out both}
.jump-panel{animation:jump-in .3s cubic-bezier(0.34,1.4,0.64,1) both}
@media (max-width:639px){.jump-panel{animation-name:jump-drop;animation-timing-function:cubic-bezier(0.16,1,0.3,1)}}
@keyframes jump-fade{from{opacity:0}}
@keyframes jump-in{from{opacity:0;transform:translateY(-10px) scale(.97)}}
@keyframes jump-drop{from{transform:translateY(-24px);opacity:0}}
.jump-strand{left:calc(0.5rem + 2px + 0.75rem + 1rem - 1px);top:0}
.jump-strand line{stroke-dasharray:1;stroke-dashoffset:1;animation:jump-thwip .14s cubic-bezier(0.2,0.9,0.3,1) .05s forwards}
@keyframes jump-thwip{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.jump-scrim,.jump-panel{animation:none}.jump-strand line{animation:none;stroke-dashoffset:0}}
`;
