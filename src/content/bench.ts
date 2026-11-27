import { projects, type Project, type ProjectSlug } from "./projects";

/**
 * WHERE EACH PROJECT SITS ON THE BENCH, AND WHICH CHIPS FIND IT.
 *
 * Positions are in bench units (the table is 12 wide, x -6…6, and 7 deep, z -3.5…3.5, the front
 * edge at z = +3.5 nearest the camera). The middle of the front edge stays clear: his card stands
 * there. `turn` is the object's rotation about the vertical axis, in degrees.
 *
 * The objects are illustrations built in code, never models of real hardware: each is an
 * iconic shape (a laptop, a board, a bag) carrying the project's one accent colour.
 */
export const BENCH: Record<ProjectSlug, { x: number; z: number; turn: number }> = {
  "simplein-school": { x: -4.1, z: -1.5, turn: 8 },
  "raya-assistant": { x: -0.7, z: -1.75, turn: -4 },
  "infinos-website": { x: 3.5, z: -1.5, turn: -14 },
  "esp32-home-automation": { x: -3.4, z: 1.0, turn: 12 },
  "infinos-app": { x: 0.9, z: 0.55, turn: -8 },
  nocturne: { x: 4.5, z: 1.05, turn: -18 },
  "brain-matrix": { x: -2.4, z: 2.55, turn: 6 },
  "ai-3d-studio": { x: 2.7, z: 2.5, turn: -10 },
};

/**
 * The chips. Every membership follows from the project's own data in projects.ts (its category,
 * stack and links), so a chip never claims more than the project page does.
 */
export const CHIPS: { id: string; label: string; test: (p: Project) => boolean }[] = [
  // Physical hardware in the build: an ESP32, the smart bag's sensors, an EEG headset over Bluetooth LE.
  { id: "hardware", label: "Hardware", test: (p) => ["esp32-home-automation", "infinos-app", "brain-matrix"].includes(p.slug) },
  // AI is the product: the assistant, and the image-to-3D studio's local AI generation.
  { id: "ai", label: "AI", test: (p) => ["raya-assistant", "ai-3d-studio"].includes(p.slug) },
  // Both a front end and a server of his own in the stack (Express, FastAPI, Supabase).
  { id: "fullstack", label: "Full-stack", test: (p) => ["infinos-app", "simplein-school", "brain-matrix", "ai-3d-studio"].includes(p.slug) },
  // Something you can open in a browser right now (the project has a live link).
  { id: "live", label: "Live now", test: (p) => p.links.some((l) => l.kind === "live") },
];

export const chipSlugs = (id: string) => {
  const chip = CHIPS.find((c) => c.id === id);
  return chip ? projects.filter(chip.test).map((p) => p.slug) : [];
};
