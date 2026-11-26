"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { holdForNavigation } from "@/lib/scroll";

type LinkProps = ComponentProps<typeof Link>;

/** A plain left click that will navigate in this tab (not a new-tab or download click). */
const plainClick = (e: MouseEvent<HTMLAnchorElement>) => !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * Remember where the visitor clicked: the new page's sheet pivots from that x position and
 * starts tilted toward it (a card picked up from the left leans left).
 */
export function markOrigin(xPx: number) {
  const f = Math.min(1, Math.max(0, xPx / window.innerWidth));
  const s = document.documentElement.style;
  s.setProperty("--ap-x", `${(f * 100).toFixed(2)}%`);
  s.setProperty("--ap-tilt", `${((f - 0.5) * -6).toFixed(2)}deg`);
}

/**
 * Opens a project page: the old page drops away onto the orange ground, the new one slaps up from
 * below like a chunky card (rounded top, ink edge) and settles flat, while the project's preview
 * and title morph across (see "View transitions" in globals.css).
 */
export function ProjectLink({ onClick, ...rest }: LinkProps) {
  return (
    <Link
      {...rest}
      transitionTypes={["open-project"]}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        markOrigin(e.clientX || r.left + r.width / 2);
        onClick?.(e);
        if (plainClick(e)) holdForNavigation();
      }}
    />
  );
}

/** Top-level navigation (Home, Projects, About, Contact): a quiet crossfade. */
export function PageLink({ onClick, ...rest }: LinkProps) {
  return (
    <Link
      {...rest}
      transitionTypes={["page"]}
      onClick={(e) => {
        onClick?.(e);
        if (plainClick(e)) holdForNavigation();
      }}
    />
  );
}
