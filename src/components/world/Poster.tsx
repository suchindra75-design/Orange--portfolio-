/**
 * A stage's poster: a still render of its scene at the first camera position, for desktop and for
 * phones. It holds the stage's place while three.js loads and stays under the canvas until the
 * first frames are drawn, so the 3D never appears as an empty box (no visible load). Kept out of
 * Stage.tsx so the loading placeholder doesn't pull three.js into the page's first chunk.
 */
export type StagePoster = { desktop: string; mobile: string };

/** Same breakpoint as the Stage's quality switch (phones and coarse pointers get the phone render). */
const PHONE = "(max-width: 767px), (pointer: coarse)";

export function PosterImage({ poster }: { poster: StagePoster }) {
  return (
    <picture className="stage__poster">
      <source media={PHONE} srcSet={poster.mobile} />
      {/* A decorative still behind a canvas: fixed files, so a plain img (no resizing wanted). */}
      <img src={poster.desktop} alt="" decoding="async" />
    </picture>
  );
}

/** The loading placeholder: the same sticky box a Stage uses, holding the poster. */
export function PosterStage({ poster, background }: { poster: StagePoster; background: string }) {
  return (
    <div className="stage" aria-hidden="true">
      <div className="stage__view" style={{ background }}>
        <PosterImage poster={poster} />
      </div>
    </div>
  );
}
