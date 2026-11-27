import type { ProjectSlug } from "./projects";

/**
 * TAKE IT APART: each project's system, layer by layer, for the "Explode & probe" section
 * (project/Stack.tsx). Layers run from where the signal enters (bottom) to where it ends up (top).
 *
 * Every line restates a fact already on the project's page (projects.ts: built, features, hook,
 * notes, stack). Nothing here is new information, and nothing is a spec that the page doesn't
 * already make. The pulse that runs through the layers is a picture of the flow, badged as one.
 *
 *   trace     the shape the signal draws on each layer as it passes (voice, EEG, readings…)
 *   gate      a layer where the pulse stops and waits for the visitor (RAYA's approval card)
 */
export type Layer = { title: string; what: string; gate?: boolean };
export type Trace = "voice" | "eeg" | "steps" | "square" | "mesh" | "ink" | "rows" | "frames";
export type SystemStack = { trace: Trace; signal: string; layers: Layer[] };

export const STACKS: Record<ProjectSlug, SystemStack> = {
  "raya-assistant": {
    trace: "voice",
    signal: "a spoken request",
    layers: [
      { title: "Your voice", what: "Microphone audio through a new engine: echo cancellation, noise suppression, speech-gated gain and voice-activity detection." },
      { title: "Voice gate", what: "Local speaker verification decides whether the utterance is yours before anything reaches the model. A TV or another person in the room can’t command it." },
      { title: "One live session", what: "A single Gemini Live session hears you, reasons, calls tools and answers out loud. Typed instructions go into the same session." },
      { title: "Tools", what: "About twenty: apps, system settings, keyboard and mouse, the browser through Playwright, files, reminders and messages. Text it reads is treated as data, not instructions." },
      { title: "Approval", what: "Risky actions (sending messages, writing or deleting files, running code, shutting down) appear as an Allow / Deny card. If nobody answers, the action doesn’t run.", gate: true },
      { title: "Action on the Mac", what: "The approved tool runs and RAYA answers out loud. Deletes go to the Trash." },
    ],
  },
  "esp32-home-automation": {
    trace: "square",
    signal: "one sentence",
    layers: [
      { title: "Plain language", what: "“Turn on the lights”, “switch off the fan”, “turn everything off”: one sentence, spoken or typed." },
      { title: "Interpretation", what: "The instruction becomes a device and a state, for example { device: lights, state: on }. This language layer is a concept." },
      { title: "Control signal", what: "A control instruction travels to the ESP-based microcontroller." },
      { title: "ESP32 controller", what: "An ESP32 with a two-channel relay, written in Embedded C." },
      { title: "Appliance", what: "Relays switch the connected lights or fan. Several devices can change from one instruction." },
    ],
  },
  "infinos-website": {
    trace: "frames",
    signal: "a frame of the story",
    layers: [
      { title: "Blender Python generator", what: "One script produces both the 3D model and the render frames, validated side by side against the product photographs." },
      { title: "Cycles frame sequences", what: "Pre-rendered photoreal sequences carry eight scroll chapters." },
      { title: "The live model", what: "A React Three Fiber model of the bag you can drag, open and explode into labelled layers, with a 360° viewer and preset views." },
      { title: "Phone compositions", what: "Every chapter has its own phone composition, plus performance work for phones." },
      { title: "Fact-status system", what: "Unconfirmed product claims stay off the page, and the site says which capabilities still await validation." },
    ],
  },
  "infinos-app": {
    trace: "steps",
    signal: "a temperature reading",
    layers: [
      { title: "Sensors in the bag", what: "An ESP32 with digital temperature sensors and an onboard display: his contribution to the bag’s electronics (the firmware isn’t in these repositories)." },
      { title: "ThingSpeak channel", what: "The sensors publish each reading to the bag’s ThingSpeak channel." },
      { title: "Sync worker", what: "The Express backend pulls every registered bag’s channel on a schedule and keeps the history in PostgreSQL. Field labels are discovered and shown as they are." },
      { title: "Alerts", what: "Readings are checked against each bag’s thresholds: warning and critical, auto-resolve, manual resolve and an offline timeout." },
      { title: "Dashboard and app", what: "A React dashboard and a Flutter app, both served by the same backend, with CSV and PDF audit exports. The phone never talks to ThingSpeak directly." },
    ],
  },
  "brain-matrix": {
    trace: "eeg",
    signal: "a burst of EEG samples",
    layers: [
      { title: "The mask", what: "Six channels: EEG, EOG, eye movements, EEG artefacts, sample count and recording time." },
      { title: "Bluetooth LE", what: "Streams over the Nordic UART service, read by a fragment-safe parser that survives split packets." },
      { title: "Ring buffer", what: "Thirty seconds at a nominal 256 Hz, with gap detection and a measured receive rate." },
      { title: "Live oscilloscope", what: "Switches between the cloud channel and Bluetooth, in 5, 10 and 30-second windows. Min-max decimation keeps every spike visible." },
      { title: "Reports", what: "PDF, CSV and a custom CSB archive, with timestamps in UTC and real gaps left visible. Research use only." },
    ],
  },
  "simplein-school": {
    trace: "rows",
    signal: "a request",
    layers: [
      { title: "The session", what: "The API takes the school only from the signed-in session, never from the request." },
      { title: "Versioned API", what: "129 operations under /api/v1, with a generated OpenAPI spec." },
      { title: "Row-level security", what: "35 tables with row-level security on every one, and 121 policies. No school ever sees another." },
      { title: "Modules", what: "Attendance, exams and report cards, timetable, homework, notices, and fees with maker-checker verification." },
      { title: "Four portals", what: "School admin, teacher, parent and student: a teacher sees their sections, a parent sees their children." },
    ],
  },
  "ai-3d-studio": {
    trace: "mesh",
    signal: "a photo",
    layers: [
      { title: "Photos", what: "One photo or a full photo set of a real object, with per-photo quality analysis and a capture assistant." },
      { title: "Jobs with consent", what: "A generation pipeline with jobs, live progress and consent." },
      { title: "Reconstruction", what: "Local photogrammetry with COLMAP, or an optional local TripoSR engine, on your own machine." },
      { title: "3D workspace", what: "Viewer, inspection, transforms, materials, undo / redo and versions." },
      { title: "Verified export", what: "Exports are verified. A FastAPI backend serves both a Next.js web app and a Tauri desktop app." },
    ],
  },
  nocturne: {
    trace: "ink",
    signal: "a frame",
    layers: [
      { title: "Art in code", what: "Illustrations generated as SVG in TypeScript and rasterised to GPU textures on demand." },
      { title: "DOM box → quad", what: "Every plate is a WebGL quad that copies its DOM box each frame: layout stays in CSS, shaders only draw." },
      { title: "Shaders", what: "Ink, screentone, melt transitions, pointer smears and pouring liquid." },
      { title: "Post pass", what: "One final pass over the whole frame." },
      { title: "Play and sound", what: "Hold-and-move interactions, a flavour picker that recolours the story and a 3D bottle carousel. Sound is synthesised with Web Audio." },
    ],
  },
};
