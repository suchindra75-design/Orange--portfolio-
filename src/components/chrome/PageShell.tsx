import { ViewTransition, type CSSProperties, type ReactNode } from "react";

/**
 * Wraps every page's content so route changes animate:
 *   • "open-project" (ProjectLink): the old page drops away, the new one slaps up as a sheet;
 *   • "page" (PageLink, top-level nav): a quiet crossfade;
 *   • anything else (browser Back/Forward): instant, though named pairs may still morph.
 */
export function PageShell({ children, ground = "dark", style, className = "" }: { children: ReactNode; ground?: "dark" | "light"; style?: CSSProperties; className?: string }) {
  return (
    <ViewTransition
      enter={{ "open-project": "sheet", page: "page-fade", default: "none" }}
      exit={{ "open-project": "drop", page: "page-fade", default: "none" }}
      default="none"
    >
      <main id="main" tabIndex={-1} data-ground={ground} style={style} className={`outline-none ${className}`}>
        {children}
      </main>
    </ViewTransition>
  );
}
