"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type LinkProps = ComponentProps<typeof Link>;

/** Remember where the visitor clicked: the aperture transition opens from that x position. */
function markAperture(e: MouseEvent<HTMLAnchorElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX || r.left + r.width / 2;
  document.documentElement.style.setProperty("--ap-x", `${((x / window.innerWidth) * 100).toFixed(2)}%`);
}

/**
 * Opens a project page through the aperture: the old page recedes, the new one opens through a
 * widening slit of light, and the project's named visual and title morph across (see globals.css).
 */
export function ProjectLink({ onClick, ...rest }: LinkProps) {
  return (
    <Link
      {...rest}
      transitionTypes={["open-project"]}
      onClick={(e) => {
        markAperture(e);
        onClick?.(e);
      }}
    />
  );
}

/** Top-level navigation (Home, Projects, About, Contact): a quiet crossfade. */
export function PageLink(props: LinkProps) {
  return <Link {...props} transitionTypes={["page"]} />;
}
