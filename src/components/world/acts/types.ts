import type * as THREE from "three";

export type ActId = "arrival" | "atrium" | "raya" | "infinos" | "simplein" | "making" | "threshold";

/** Where the camera should be for a given progress, in the act's LOCAL space. */
export type CamOut = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };

export type ActCtx = {
  mobile: boolean;
  aspect: number;
  /** Smoothed pointer, −1…1 on both axes (0 on touch devices). */
  pointer: { x: number; y: number };
  /** Arrival entrance progress 0…1 (time-based, once per page load). */
  intro: number;
};

export type ActDef = {
  id: ActId;
  /** World-space origin of the act's space. The Scene is rendered there. */
  origin: [number, number, number];
  atmosphere: {
    background: string;
    /** Linear fog: colour, near, far. */
    fog: [string, number, number];
    /** Renderer tone-mapping exposure for this space. */
    exposure?: number;
  };
  /** Colour of the cut INTO this act. */
  cut: "void" | "apricot";
  /** Fill `out` for scroll progress p (0…1 across the act's section). */
  camera: (p: number, out: CamOut, ctx: ActCtx) => void;
};
