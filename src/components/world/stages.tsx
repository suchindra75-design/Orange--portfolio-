"use client";

import dynamic from "next/dynamic";

/**
 * Lazily loaded 3D stages, one per act that still has a 3D space. Each loads three.js, the
 * shared system and only its own scene, client-side, after the page's HTML is on screen.
 * Place one inside a `relative` wrapper that also holds the act's section (see Stage.tsx).
 */

export const RayaStage = dynamic(
  () =>
    Promise.all([import("./Stage"), import("./acts/RayaScene")]).then(([s, m]) => {
      function RayaStageInner() {
        return <s.Stage def={m.raya} Scene={m.RayaScene} />;
      }
      return RayaStageInner;
    }),
  { ssr: false },
);

export const SimpleinStage = dynamic(
  () =>
    Promise.all([import("./Stage"), import("./acts/SimpleinScene")]).then(([s, m]) => {
      function SimpleinStageInner() {
        return <s.Stage def={m.simplein} Scene={m.SimpleinScene} />;
      }
      return SimpleinStageInner;
    }),
  { ssr: false },
);
