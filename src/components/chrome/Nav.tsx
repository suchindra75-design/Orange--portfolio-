"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/hooks";
import { site } from "@/content/site";
import { mainProjects } from "@/content/projects";
import { PageLink, ProjectLink } from "./Links";

type Ground = "dark" | "light";

/** Reads the ground under the nav bar with one IntersectionObserver (no per-frame layout reads). */
function useGroundUnderNav(pathname: string) {
  const [ground, setGround] = useState<Ground>("dark");
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    const hits = new Map<Element, boolean>();
    const read = (el: Element): Ground => {
      const g = (el as HTMLElement).dataset.ground ?? (el as HTMLElement).dataset.theme;
      return g === "light" || g === "paper" ? "light" : "dark";
    };
    const setup = () => {
      io?.disconnect();
      hits.clear();
      // A 2px band across the middle of the nav bar.
      const y = 34;
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => hits.set(e.target, e.isIntersecting));
          // The innermost / last-in-document element under the line wins (sections nest inside pages).
          let last: Element | undefined;
          for (const [el, on] of hits) {
            if (on && (!last || last.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) last = el;
          }
          setGround(last ? read(last) : "dark");
        },
        { rootMargin: `-${y}px 0px -${Math.max(0, window.innerHeight - y - 2)}px 0px` },
      );
      document.querySelectorAll("[data-ground], [data-theme]").forEach((el) => io!.observe(el));
    };
    // After the new route's DOM is in place.
    const t = window.setTimeout(setup, 60);
    window.addEventListener("resize", setup);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", setup);
      io?.disconnect();
    };
  }, [pathname]);
  return ground;
}

const noop = () => () => {};
/** "⌘K" on Apple platforms, "Ctrl K" elsewhere (client-only; nothing is rendered on the server). */
function useJumpKey() {
  return useSyncExternalStore(noop, () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K"), () => null);
}
export const openJump = () => window.dispatchEvent(new CustomEvent("jump:open"));

/**
 * The navigation: a row of chunky pills. A name pill home, three destinations, a "Jump to" pill
 * (⌘K / Ctrl K / "/"), and a full-screen menu on phones. Pills are ink on light and orange grounds
 * and flip to cream over dark sections, so the bar never needs a background.
 */
export function Nav() {
  const pathname = usePathname();
  const ground = useGroundUnderNav(pathname);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const jumpKey = useJumpKey();

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      setScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  const current = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <header className="nav" data-ground={open ? "dark" : ground} data-scrolled={scrolled && !open}>
        <PageLink href="/" className="nav-pill nav-pill--home" aria-label={`${site.name}, home`}>
          <span aria-hidden="true">suchindra</span>
          <span aria-hidden="true" className="nav-pill__dot" />
        </PageLink>

        <nav aria-label="Primary" className="hidden items-center gap-2.5 md:flex">
          {site.nav.map((n) => (
            <PageLink key={n.href} href={n.href} className="nav-pill" aria-current={current(n.href) ? "page" : undefined}>
              {n.label}
            </PageLink>
          ))}
          <button type="button" onClick={openJump} className="nav-pill nav-pill--ghost" aria-keyshortcuts="Meta+K Control+K /">
            Jump to {jumpKey && <kbd className="font-mono text-[0.78em] opacity-60">{jumpKey}</kbd>}
          </button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <button type="button" onClick={openJump} className="nav-pill nav-pill--ghost" aria-label="Jump to a page or project">
            Jump
          </button>
          <button ref={toggle} type="button" className="nav-pill" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </header>
      <Menu open={open} onClose={() => setOpen(false)} returnFocus={toggle} current={current} />
    </>
  );
}

function Menu({
  open,
  onClose,
  returnFocus,
  current,
}: {
  open: boolean;
  onClose: () => void;
  returnFocus: React.RefObject<HTMLButtonElement | null>;
  current: (href: string) => boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      tl.current = gsap
        .timeline({ paused: true, onReverseComplete: () => gsap.set(root.current, { visibility: "hidden" }) })
        .fromTo(root.current, { clipPath: "inset(0 50% 0 50%)" }, { clipPath: "inset(0 0% 0 0%)", duration: 0.7, ease: "expo.inOut" })
        .fromTo("[data-item]", { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: "expo.out", stagger: 0.035 }, 0.25)
        .fromTo("[data-foot]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.5);
    },
    { scope: root },
  );

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    const lenis = getLenis();
    if (open) {
      lenis?.stop();
      gsap.set(root.current, { visibility: "visible" });
      if (prefersReducedMotion()) t.progress(1);
      else t.timeScale(1).play();
      root.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    } else if (t.progress() > 0) {
      lenis?.start();
      if (prefersReducedMotion()) {
        t.progress(0);
        gsap.set(root.current, { visibility: "hidden" });
      } else t.timeScale(1.6).reverse();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        returnFocus.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, returnFocus]);

  const items = [{ href: "/", label: "Home" }, ...site.nav];

  return (
    <div ref={root} id="site-menu" className="menu flex flex-col justify-between overflow-y-auto px-[var(--gutter)] pb-8 pt-[calc(var(--header-h)+1.5rem)]" role="dialog" aria-modal="true" aria-label="Menu" inert={!open}>
      <div>
        <ol className="grid gap-1">
          {items.map((n) => (
            <li key={n.href} className="overflow-hidden">
              <PageLink href={n.href} data-item onClick={onClose} aria-current={current(n.href) ? "page" : undefined} className="t-name block py-0.5 text-[clamp(2.4rem,11vw,4.2rem)] leading-[1.02] tracking-[-0.04em] aria-[current=page]:text-signal">
                {n.label}
              </PageLink>
            </li>
          ))}
        </ol>
        <p className="t-label mt-10 text-muted">The six worlds</p>
        <ul className="mt-3 grid gap-2">
          {mainProjects.map((p) => (
            <li key={p.slug} className="overflow-hidden">
              <ProjectLink href={`/projects/${p.slug}`} data-item onClick={onClose} className="flex items-baseline gap-4 text-paper/85">
                <span className="t-label w-6 text-signal">{p.index}</span>
                <span className="text-[1.05rem]">{p.title}</span>
                <span className="t-label text-muted">{p.subtitle}</span>
              </ProjectLink>
            </li>
          ))}
        </ul>
      </div>
      <div data-foot className="t-label mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-paper/15 pt-5 text-paper/70">
        {site.links.map((l) =>
          l.href ? (
            <a key={l.label} href={l.href} className="link-u hover:text-paper" target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {l.label} ↗
            </a>
          ) : null,
        )}
      </div>
    </div>
  );
}
