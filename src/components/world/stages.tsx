"use client";

import dynamic from "next/dynamic";
import { PosterStage, type StagePoster } from "./Poster";
import { P } from "./system/palette";

/**
 * Lazily loaded 3D stages, one per act that still has a 3D space. Each loads three.js, the
 * shared system and only its own scene, client-side, after the page's HTML is on screen.
 * Place one inside a `relative` wrapper that also holds the act's section (see Stage.tsx).
 *
 * While the chunk loads, the stage's place shows a still render of the scene (its poster), and
 * the live canvas fades in over it: the Active Theory rule, no visible load.
 */

const RAYA_POSTER: StagePoster = { desktop: "/work/esp32-home-automation/stage-poster.webp", mobile: "/work/esp32-home-automation/stage-poster-mobile.webp" };
const SIMPLEIN_POSTER: StagePoster = { desktop: "/work/simplein-school/stage-poster.webp", mobile: "/work/simplein-school/stage-poster-mobile.webp" };

export const RayaStage = dynamic(
  () =>
    Promise.all([import("./Stage"), import("./acts/RayaScene")]).then(([s, m]) => {
      function RayaStageInner() {
        return <s.Stage def={m.raya} Scene={m.RayaScene} poster={RAYA_POSTER} />;
      }
      return RayaStageInner;
    }),
  { ssr: false, loading: () => <PosterStage poster={RAYA_POSTER} background={P.void} /> },
);

export const SimpleinStage = dynamic(
  () =>
    Promise.all([import("./Stage"), import("./acts/SimpleinScene")]).then(([s, m]) => {
      function SimpleinStageInner() {
        return <s.Stage def={m.simplein} Scene={m.SimpleinScene} poster={SIMPLEIN_POSTER} />;
      }
      return SimpleinStageInner;
    }),
  { ssr: false, loading: () => <PosterStage poster={SIMPLEIN_POSTER} background={P.bone} /> },
);
