/**
 * PROJECTS — the single source of truth for every project page, the home
 * "Six worlds" index and the /projects collection.
 *
 * Every claim here traces to the owner's code, repositories, live sites or
 * résumé (audited 2026-11-25). Rules:
 *   • Never invent features, numbers, specs or links. Unverified → leave out.
 *   • Simulations and replays are labelled where they are shown.
 *   • `links` are optional: add a repo or live URL only when it is confirmed.
 *
 * To add a project: append an entry (and, for a bespoke world, a folder in
 * src/components/worlds/). Projects without a bespoke world use the generic one.
 */

export type ProjectSlug =
  | "raya-assistant"
  | "raya-smart-home"
  | "infinos-website"
  | "infinos-app"
  | "brain-matrix"
  | "simplein-school"
  | "ai-3d-studio"
  | "nocturne";

export type Tone = "live" | "dev" | "concept" | "prelaunch" | "built";

export type Screen = {
  src: string;
  alt: string;
  /** Shown under the image. Say what it is and that it is real. */
  caption: string;
  width: number;
  height: number;
  kind: "screenshot" | "render" | "photo" | "report";
};

export type ProjectLink = { kind: "repo" | "live"; url: string; label: string };

export type World = {
  /** Page ground, ink, muted ink, accent, secondary accent. Must stay inside DESIGN.md's palette family (no blue). */
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  /** Dark or light ground — drives the nav colour and image treatments. */
  ground: "dark" | "light";
};

export type Project = {
  slug: ProjectSlug;
  /** Two-digit index used in the "Six worlds" index. */
  index: string;
  tier: "main" | "also";
  /** Display title, and a short name for navigation ("next project"). */
  title: string;
  subtitle: string;
  family?: "RAYA" | "INFINOS";
  category: string;
  status: { label: string; tone: Tone };
  role: string;
  /** One sentence — the plate and the hero. */
  oneLine: string;
  /** What makes it interesting, in one short line. */
  hook: string;
  /** The problem or idea behind it. */
  idea: string;
  /** What the owner personally built. */
  built: string[];
  /** Important features and functionality (of the system). */
  features: { title: string; body: string }[];
  screens: Screen[];
  stack: string[];
  links: ProjectLink[];
  /** Credits and honesty notes, shown near the end of the page. */
  notes: string[];
  /** "In 8 seconds": the four answers a reviewer looks for first (status comes from `status`). */
  eight: { what: string; did: string; hard: string; changed: string };
  /** Up to three headline numbers, each verifiable from the project's own sources. */
  numbers?: { value: string; label: string }[];
  /** Image used where a still is needed (OG, /projects fallback, no-JS). */
  cover: { src: string; focus: number } | null;
  world: World;
};

const GH = "https://github.com/suchindra75-design";

export const projects: Project[] = [
  {
    slug: "raya-assistant",
    index: "01",
    tier: "main",
    title: "RAYA",
    subtitle: "Personal AI assistant",
    family: "RAYA",
    category: "AI assistant · computer control",
    status: { label: "Personal build · in active development", tone: "dev" },
    role: "Design & development (AI-assisted)",
    oneLine:
      "A voice-first personal assistant in the spirit of J.A.R.V.I.S. It doesn’t just answer: it opens apps, changes settings, drives the browser and manages files on my Mac.",
    hook: "Only my voice can command it, and anything risky waits for my Allow.",
    idea:
      "Most AI assistants live in a chat box. I wanted one that lives on the computer: you talk to it like a person and it does the work. An assistant that can click and type for you also has to know when to stop and ask, so safety had to be part of the design, not an afterthought.",
    built: [
      "An approval gate: risky actions (sending messages, writing or deleting files, running code, shutting down) appear as an on-screen Allow / Deny card, and if nobody answers, the action doesn’t run.",
      "A personal voice gate: local speaker verification decides whether an utterance is mine before anything reaches the model, so a TV or another person in the room can’t command it.",
      "A new audio engine with echo cancellation, noise suppression, speech-gated gain and voice-activity detection, benchmarked under background noise.",
      "A hardened phone remote: HTTPS on the local network, QR pairing and encrypted commands.",
      "A complete interface redesign (“Graphite & Silver”): a central voice ribbon driven by real audio levels, a conversation panel with live tool rows, and a settings sheet. Tests and benchmarks came with it.",
    ],
    features: [
      { title: "A real-time voice conversation", body: "One Gemini Live session hears you, reasons, calls tools and answers out loud. Typed instructions go into the same session." },
      { title: "It acts on the computer", body: "About twenty tools: open apps; system settings such as volume, brightness, windows, dark mode and Wi-Fi; keyboard and mouse, including a click guided by what’s on screen; and the browser through Playwright." },
      { title: "Files, reminders, messages", body: "Lists, moves, renames and organises files (deletes go to the Trash), schedules native reminders, sends messages and searches the web." },
      { title: "It can see", body: "Screen and webcam vision let it answer questions about what’s in front of you." },
      { title: "Reading is not obeying", body: "Text it reads from web pages and files is treated as data, not instructions: a guardrail against prompt injection." },
    ],
    screens: [
      {
        src: "/work/raya.jpg",
        alt: "The redesigned assistant window with its Settings sheet open on General",
        caption: "Real screenshot: the redesigned app, Settings sheet. The app’s default name is still JARVIS while the rename to RAYA is in progress.",
        width: 1600,
        height: 1000,
        kind: "screenshot",
      },
    ],
    stack: ["Python", "PyQt6", "Gemini Live API", "WebRTC audio processing", "sherpa-onnx (speaker verification)", "Playwright", "pyautogui", "FastAPI"],
    links: [{ kind: "repo", url: `${GH}/RAYA`, label: "Source on GitHub" }],
    notes: [
      "Built on MARK XLIX, the open-source assistant by FatihMakes (CC BY-NC 4.0). The tool modules and the Gemini Live loop come from that project. My own work is listed under “What I built”.",
      "Approval covers the risky actions listed above. Opening apps and plain keyboard or mouse input run without a prompt.",
      "The public repository still opens with the upstream README, and the rename to RAYA is in progress. Built with Claude as a coding partner.",
    ],
    eight: { what: "A personal assistant that acts on my Mac: apps, settings, keyboard and mouse, browser, files.", did: "The approval gate, the voice gate, the audio engine, the phone-remote hardening and the UI redesign.", hard: "Letting an AI click and type for you, safely: risky actions have to stop and ask.", changed: "Only my voice reaches the model, and nothing risky runs without my Allow." },
    numbers: [{ value: "~20", label: "Tools on the computer" }, { value: "2", label: "Safety gates" }, { value: "1", label: "Voice it obeys" }],
    cover: { src: "/work/raya.jpg", focus: 0.4 },
    world: { bg: "#17151A", ink: "#ECE8EE", muted: "#9C97A2", accent: "#FFB26B", accent2: "#C9C6CC", ground: "dark" },
  },
  {
    slug: "raya-smart-home",
    index: "02",
    tier: "main",
    title: "RAYA Home",
    subtitle: "Smart-home automation",
    family: "RAYA",
    category: "Home automation · ESP32",
    status: { label: "In development · concept demo", tone: "concept" },
    role: "Design & development",
    oneLine: "The RAYA idea pointed at the room: say “turn on the lights” and an ESP-based controller switches the appliance.",
    hook: "One sentence instead of one app per device.",
    idea:
      "Switching a light, a fan or a TV shouldn’t need a different app for each. A plain instruction, spoken or typed, should be enough: RAYA interprets it and sends a control signal to a microcontroller wired to the appliance.",
    built: [
      "The instruction → interpretation → control signal → ESP controller → appliance flow that this page demonstrates.",
      "An ESP32 home-automation controller with a two-channel relay, written in Embedded C (a résumé project).",
      "The link between the RAYA assistant and that controller is in development. The room on this page is an in-browser demonstration of the intended flow.",
    ],
    features: [
      { title: "Plain language in", body: "“Turn on the lights”, “switch off the fan”, “turn everything off”: one sentence, spoken or typed." },
      { title: "Interpretation", body: "The instruction becomes a device and a state, for example { device: lights, state: on }." },
      { title: "A signal to the controller", body: "A control instruction travels to an ESP-based microcontroller." },
      { title: "The appliance responds", body: "Relays switch the connected appliance. Several devices can change from one instruction." },
    ],
    screens: [],
    stack: ["ESP32", "Embedded C", "Relay module", "RAYA (Python), link in development"],
    links: [],
    notes: [
      "No firmware or device code for this is public yet, so nothing on this page talks to real hardware. The demo runs entirely in your browser.",
      "The RAYA repository is the desktop assistant. It does not contain home-automation code.",
    ],
    eight: { what: "Plain-language control of lights, fans and TVs through an ESP-based controller.", did: "The instruction-to-appliance flow, and an ESP32 two-channel relay controller in Embedded C.", hard: "Turning loose language into a device and a state, reliably.", changed: "In development: the link between RAYA and the controller isn't public yet, so this page is a concept demo." },
    numbers: [{ value: "1", label: "Sentence per command" }, { value: "2", label: "Relay channels (ESP32 build)" }],
    cover: null,
    world: { bg: "#1E1117", ink: "#F2E9DD", muted: "#A8968C", accent: "#FFD9A0", accent2: "#5FB8A0", ground: "dark" },
  },
  {
    slug: "infinos-website",
    index: "03",
    tier: "main",
    title: "INFINOS",
    subtitle: "Product website",
    family: "INFINOS",
    category: "Product website · 3D storytelling",
    status: { label: "Live", tone: "live" },
    role: "Design & development, INFINOS Tech",
    oneLine:
      "A scroll-driven product story for INFINOS Tech’s Pro Dual-Chamber Bag, with photoreal renders that hand over to a live, rotatable 3D model.",
    hook: "The only references were 13 photographs, so the bag was rebuilt procedurally in Blender and checked against them.",
    idea:
      "Explain a temperature-controlled transport bag before anyone has held one, beautifully, without claiming anything that hasn’t been tested yet.",
    built: [
      "Eight scroll chapters that combine Blender Cycles frame sequences with a live React Three Fiber model of the bag.",
      "A Blender Python generator that produces both the 3D model and the render frames, validated side by side against the product photographs.",
      "A 360° product viewer with preset views and full screen, plus a coolant showcase with an organic / inorganic / eutectic selector.",
      "Separate phone compositions for every chapter, plus performance work for phones.",
      "A fact-status system that keeps unverified product claims off the page.",
    ],
    features: [
      { title: "Renders that become a model", body: "Pre-rendered photoreal sequences cross-fade into a live model you can drag, open and explode into labelled layers." },
      { title: "Two zones, explained", body: "The story walks through the bag’s two temperature zones, its coolant and its sample racks, chapter by chapter." },
      { title: "Honest by construction", body: "Specs that aren’t confirmed stay unpublished. The site itself says which capabilities still await validation." },
    ],
    screens: [
      {
        src: "/work/infinos-website.jpg",
        alt: "The INFINOS website's 3D bag model with the 360° view control",
        caption: "Real screenshot: the live site’s 3D model view.",
        width: 1600,
        height: 1000,
        kind: "screenshot",
      },
    ],
    stack: ["Next.js 15", "React 19", "TypeScript", "three.js", "React Three Fiber", "GSAP", "Lenis", "Blender Python + Cycles", "gltf-transform", "Vercel"],
    links: [
      { kind: "live", url: "https://infinoswebsite.vercel.app", label: "Visit the live site" },
      { kind: "repo", url: `${GH}/INFINOS-WEBSITE`, label: "Source on GitHub" },
    ],
    notes: [
      "Product facts here are quoted from the live site. Specifications not published there (dimensions, hold times, certifications) are deliberately left out.",
      "The 3D model is a reconstruction from photographs, not manufacturer CAD. Product imagery © INFINOS Tech.",
    ],
    eight: { what: "A scroll-driven product story for INFINOS Tech’s Pro Dual-Chamber Bag.", did: "Design and development: Blender-rendered sequences, a live R3F model, the 360° viewer, phone compositions.", hard: "Building an accurate 3D bag from only 13 photographs, and keeping unverified specs off the page.", changed: "The bag can be explained, and turned in your hand, before anyone has held one." },
    numbers: [{ value: "13", label: "Reference photographs" }, { value: "8", label: "Scroll chapters" }, { value: "360°", label: "Product viewer" }],
    cover: { src: "/work/infinos-website.jpg", focus: 0.5 },
    world: { bg: "#F2E9DD", ink: "#1A1216", muted: "#6E625C", accent: "#B8322B", accent2: "#5FB8A0", ground: "light" },
  },
  {
    slug: "infinos-app",
    index: "04",
    tier: "main",
    title: "INFINOS Telemetry",
    subtitle: "Monitoring platform",
    family: "INFINOS",
    category: "Full-stack app · IoT telemetry",
    status: { label: "Built · hosted demo offline", tone: "built" },
    role: "Full Stack Developer, INFINOS Tech",
    oneLine:
      "The software behind the bag. Every compartment’s temperature is synced from the device’s cloud channel, stored, checked against thresholds and turned into audit reports, on the web and on a phone.",
    hook: "A background worker turns a stream of raw sensor fields into history, alerts and a PDF audit trail.",
    idea:
      "A temperature-controlled bag is only trustworthy if someone can see what happened inside it: per bag, over time, with an alert when a compartment drifts and a report that proves the journey.",
    built: [
      "An Express + Prisma / PostgreSQL backend whose worker syncs each registered bag’s ThingSpeak channel into the database.",
      "Field-agnostic telemetry: the app discovers each channel’s field labels and shows them as they are.",
      "Threshold alerts with warning and critical severity, auto-resolve and manual resolve, per-device thresholds and an offline timeout.",
      "CSV and PDF audit exports, roles (admin, operator, viewer) with JWT and rate-limited sign-in, and read keys stored encrypted.",
      "A React dashboard (Dashboard, Devices, Analytics, Alerts, claim-a-bag, 15-second refresh) with hand-built SVG charts.",
      "A Flutter app with Dashboard, Devices, Telemetry, Analytics and Alerts tabs and local alert notifications.",
      "Beyond the software, I contributed to the bag’s electronics and circuit design: ESP32, digital temperature sensors and an onboard display (from my résumé; the firmware isn’t in these repositories).",
    ],
    features: [
      { title: "Device → cloud → platform", body: "Sensors publish to a ThingSpeak channel. The backend pulls it on a schedule and keeps the history in Postgres." },
      { title: "Alerts that close themselves", body: "Readings are checked against each bag’s thresholds. Alerts escalate by severity and resolve when the compartment recovers." },
      { title: "Proof of the journey", body: "Every bag can export its readings as CSV or as a generated PDF audit report." },
      { title: "Web and phone", body: "The same backend serves the web dashboard and the Flutter app. The phone never talks to ThingSpeak directly." },
    ],
    screens: [
      {
        src: "/work/smart-bag.jpg",
        alt: "The INFINOS telemetry web dashboard showing a bag's live readings and alerts",
        caption: "Real screenshot: the web dashboard.",
        width: 1600,
        height: 1000,
        kind: "screenshot",
      },
    ],
    stack: ["TypeScript", "Node.js / Express", "Prisma", "PostgreSQL", "JWT", "Zod", "React 19", "Vite", "Tailwind CSS", "Flutter", "ThingSpeak API"],
    links: [{ kind: "repo", url: `${GH}/INFINOS-APP`, label: "Source on GitHub" }],
    notes: [
      "The bag’s data channel is private and the hosted demo’s database is offline, so nothing on this page is live. Any trace shown is replayed from data the app recorded, and is labelled as such.",
    ],
    eight: { what: "The monitoring platform behind the bag: per-bag history, threshold alerts and audit reports.", did: "The Express + Postgres backend and sync worker, the React dashboard and the Flutter app.", hard: "Turning a stream of raw, unlabelled sensor fields into trustworthy history and alerts.", changed: "Every journey can be proved with a CSV or a generated PDF audit report." },
    numbers: [{ value: "365", label: "Readings in one recorded report" }, { value: "3", label: "Roles: admin, operator, viewer" }],
    cover: { src: "/work/smart-bag.jpg", focus: 0.35 },
    world: { bg: "#120A0F", ink: "#F2E9DD", muted: "#A8968C", accent: "#5FB8A0", accent2: "#FFB26B", ground: "dark" },
  },
  {
    slug: "brain-matrix",
    index: "05",
    tier: "main",
    title: "Brain Matrix",
    subtitle: "EEG research workstation",
    category: "Biosignal app · Bluetooth LE",
    status: { label: "Live · research use", tone: "live" },
    role: "Full Stack Developer, INFINOS Tech",
    oneLine:
      "A workstation for a Bluetooth EEG sleep mask: live brain and eye-movement signals, the full cloud history and correctly timed reports, on the web and on Android.",
    hook: "The cloud sends a packet about every 20 seconds. Bluetooth streams about 250 samples a second. The app speaks both.",
    idea:
      "A sleep-monitoring mask records EEG and EOG, but its cloud telemetry only gives a slow summary. Researchers needed to see the signal live, check it, and share recordings with the gaps and timing preserved.",
    built: [
      "Bluetooth LE streaming from the mask over the Nordic UART service, with a fragment-safe parser that survives split packets.",
      "A 30-second ring buffer at a nominal 256 Hz, with gap detection and a measured receive rate.",
      "A Live EEG oscilloscope that switches between the cloud channel and Bluetooth, with 5, 10 and 30-second windows.",
      "An Express backend that pages through the full cloud history with caching and rate limiting.",
      "PDF reports, CSV and a custom CSB archive, with timestamps kept in UTC and real gaps left visible.",
      "An Android app through Capacitor, with export and share tested on a physical device.",
    ],
    features: [
      { title: "Six channels", body: "EEG, EOG, eye movements, EEG artefacts, sample count and recording time." },
      { title: "Live and historical", body: "Overview, Live EEG, History and Data Table views over the same recordings." },
      { title: "Readable at any length", body: "Min-max decimation and percentile scaling keep long recordings fast to draw without hiding spikes." },
      { title: "Reports you can trust", body: "Exports preserve timing and gaps, and every surface is marked research-use-only." },
    ],
    screens: [
      {
        src: "/work/brain-matrix.jpg",
        alt: "Brain Matrix's Live EEG view with stacked EEG, EOG and eye-movement traces",
        caption: "Real screenshot: the Live EEG view.",
        width: 1600,
        height: 1000,
        kind: "screenshot",
      },
    ],
    stack: ["React 19", "TypeScript", "Vite", "Tailwind CSS 4", "Express", "ThingSpeak API", "Capacitor 8", "Bluetooth LE", "jsPDF", "Canvas"],
    links: [
      { kind: "live", url: "https://dfghj-1.onrender.com", label: "Open the workstation" },
      { kind: "repo", url: `${GH}/Brain-matrix-App`, label: "Source on GitHub" },
    ],
    notes: [
      "Research use only: not a medical or diagnostic tool. The app does no sleep staging or spectral analysis.",
      "Bluetooth data feeds the live view. History and reports come from the cloud channel. The mask hardware isn’t my work; the app pairs with it.",
    ],
    eight: { what: "A research workstation for a Bluetooth EEG sleep mask, on the web and Android.", did: "BLE streaming and parsing, the ring buffer, the Live EEG view, the history backend and timed exports.", hard: "Two data paths at very different speeds: a cloud packet every ~20 s, Bluetooth at ~250 Hz.", changed: "Researchers can watch the signal live and share recordings with timing and gaps preserved." },
    numbers: [{ value: "~250 Hz", label: "Live Bluetooth stream" }, { value: "6", label: "Telemetry channels" }, { value: "30 s", label: "Ring buffer" }],
    cover: { src: "/work/brain-matrix.jpg", focus: 0.4 },
    world: { bg: "#EFE6D6", ink: "#1A1216", muted: "#6E625C", accent: "#7A2430", accent2: "#3F8F7C", ground: "light" },
  },
  {
    slug: "simplein-school",
    index: "06",
    tier: "main",
    title: "SIMPLEIN School",
    subtitle: "School ERP",
    category: "Multi-tenant SaaS · full stack",
    status: { label: "Pre-launch · demo live", tone: "prelaunch" },
    role: "Full Stack Developer, SIMPLEIN SOLUTIONS",
    oneLine: "One platform for many schools: four role portals, 129 API operations and a database that keeps every school’s data apart.",
    hook: "Tenant isolation is enforced in Postgres itself and tested with hundreds of pgTAP assertions.",
    idea:
      "Schools run on spreadsheets and paper. One shared platform should serve many of them, with each school’s data sealed off and each role seeing only what it should.",
    built: [
      "Multi-tenancy: every tenant table carries its school, row-level security enforces it, and the API takes the school only from the session.",
      "Four portals: school admin, teacher, parent and student.",
      "Modules: people with Excel import, attendance, exams, marks and grades, report cards with PDF, timetable, homework, notices and notifications, fee tracking with maker-checker verification, and a student portal with promotions and past papers.",
      "A versioned REST API: 129 operations under /api/v1 with a generated OpenAPI spec.",
      "35 tables with row-level security on every one and 121 policies, plus rate limiting and security headers.",
      "Tests: recorded runs passed unit 389/389, integration 49/49, pgTAP 288/288 and a smoke crawl of 80/80.",
    ],
    features: [
      { title: "Sealed schools", body: "A teacher sees their sections, a parent sees their children, a student sees themselves, and no school ever sees another." },
      { title: "Fees with a second pair of eyes", body: "Payments are recorded unverified and confirmed by a different admin. Nothing is deleted, and everything is audited." },
      { title: "Report cards", body: "Marks and grades roll up into generated PDF report cards." },
    ],
    screens: [
      {
        src: "/work/simplein-school.jpg",
        alt: "The demo school's public landing page with portals for each role",
        caption: "Real screenshot: the demo deployment’s public site (a fictional school).",
        width: 1600,
        height: 1000,
        kind: "screenshot",
      },
    ],
    stack: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS 4", "Supabase (Postgres, RLS, Auth, Storage)", "Zod", "Vitest", "pgTAP", "pdf-lib", "SheetJS", "Vercel"],
    links: [
      { kind: "live", url: "https://simplein-school-demo.vercel.app", label: "Open the demo" },
    ],
    notes: [
      "Pre-launch: the demo is a staging deployment with a fictional school. Production isn’t live, and no real school uses it yet.",
    ],
    eight: { what: "A multi-tenant school ERP: one platform for many schools, four role portals.", did: "Full stack: the tenancy model, the API, the modules, the row-level security and the tests.", hard: "Keeping every school’s data sealed apart, enforced in the database, not just the app.", changed: "Pre-launch: the staging demo runs end to end across all four roles." },
    numbers: [{ value: "129", label: "API operations" }, { value: "121", label: "Row-level security policies" }, { value: "288/288", label: "pgTAP assertions, recorded run" }],
    cover: { src: "/work/simplein-school.jpg", focus: 0.3 },
    world: { bg: "#E8DFD0", ink: "#1A1216", muted: "#6E625C", accent: "#B5573A", accent2: "#3F8F7C", ground: "light" },
  },
  {
    slug: "ai-3d-studio",
    index: "07",
    tier: "also",
    title: "AI 3D Studio",
    subtitle: "Image-to-3D studio",
    category: "Local-first 3D pipeline",
    status: { label: "Release candidate", tone: "built" },
    role: "Design & development",
    oneLine: "An open-source, local-first studio that turns one photo, or a full photo set of a real object, into an inspectable, exportable 3D model.",
    hook: "Photogrammetry and AI generation in one workspace, running on your own machine.",
    idea: "Most image-to-3D tools are cloud-only black boxes. This one runs on your own machine, with the AI providers you choose.",
    built: [
      "Projects, photo upload with per-photo quality analysis, and a capture assistant.",
      "A generation pipeline with jobs, live progress and consent, plus local photogrammetry with COLMAP and an optional local TripoSR engine.",
      "A 3D workspace: viewer, inspection, transforms, materials, undo / redo and versions, with verified exports.",
    ],
    features: [
      { title: "Web and desktop", body: "A FastAPI backend and local engine. A Next.js web app and a Tauri desktop app share the same UI packages." },
    ],
    screens: [
      { src: "/work/ai-3d-studio.jpg", alt: "AI 3D Studio's new-project screen", caption: "Real screenshot: the new-project screen.", width: 1600, height: 1000, kind: "screenshot" },
    ],
    stack: ["Python", "FastAPI", "Next.js", "Tauri", "COLMAP", "TripoSR", "Three.js", "Blender"],
    links: [{ kind: "repo", url: `${GH}/3d-ai-studio`, label: "Source on GitHub" }],
    notes: ["Cloud adapters exist but haven’t yet been run against the paid services. Desktop builds are unsigned."],
    eight: { what: "A local-first studio that turns photos of a real object into an exportable 3D model.", did: "Design and development: the pipeline, photogrammetry, local AI generation and the 3D workspace.", hard: "Making image-to-3D work on your own machine, not only in the cloud.", changed: "A release candidate: all seven roadmap phases implemented." },
    cover: { src: "/work/ai-3d-studio.jpg", focus: 0.3 },
    world: { bg: "#1A1216", ink: "#F2E9DD", muted: "#A8968C", accent: "#FFB26B", accent2: "#5FB8A0", ground: "dark" },
  },
  {
    slug: "nocturne",
    index: "08",
    tier: "also",
    title: "Nocturne",
    subtitle: "Interactive WebGL story",
    category: "Motion study",
    status: { label: "Live study", tone: "live" },
    role: "Design & development",
    oneLine: "A scroll-driven manga story for a fictional spirits brand, with code-drawn illustrations, custom shaders and synthesised sound.",
    hook: "Every plate is a WebGL quad that copies its DOM box each frame: layout stays in CSS, shaders only draw.",
    idea: "A study in web storytelling: the structure and motion language of a reference experience, rebuilt with entirely original art, copy and sound.",
    built: [
      "Illustrations generated as SVG in TypeScript and rasterised to GPU textures on demand.",
      "Shaders for ink, screentone, melt transitions, pointer smears, pouring liquid and a post pass.",
      "Hold-and-move interactions, a flavour picker that recolours the story, and a 3D bottle carousel.",
    ],
    features: [{ title: "No audio files", body: "Sound is synthesised with Web Audio." }],
    screens: [
      { src: "/work/nocturne.jpg", alt: "A Nocturne manga plate: a silhouetted figure before a red sun", caption: "Real screenshot: the live story.", width: 1600, height: 1000, kind: "screenshot" },
    ],
    stack: ["TypeScript", "Vite", "three.js", "GLSL", "GSAP", "Lenis", "Web Audio"],
    links: [
      { kind: "live", url: "https://anime-website-nu-nine.vercel.app", label: "Visit the story" },
      { kind: "repo", url: `${GH}/anime-website-`, label: "Source on GitHub" },
    ],
    notes: [],
    eight: { what: "A scroll-driven manga story for a fictional brand, as a WebGL motion study.", did: "Code-drawn illustrations, custom shaders and synthesised sound.", hard: "Keeping layout in CSS while shaders draw every plate.", changed: "Live, at about 250 KB of gzipped JavaScript." },
    cover: { src: "/work/nocturne.jpg", focus: 0.5 },
    world: { bg: "#120A0F", ink: "#F2E9DD", muted: "#A8968C", accent: "#F0A868", accent2: "#B5573A", ground: "dark" },
  },
];

export const mainProjects = projects.filter((p) => p.tier === "main");
export const alsoBuilt = projects.filter((p) => p.tier === "also");
export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);

/** The next project in reading order (wraps around). */
export function nextProject(slug: ProjectSlug) {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
}

/** Old /work/:slug routes → new /projects/:slug (see next.config.ts redirects). */
export const legacySlugs: Record<string, ProjectSlug> = {
  raya: "raya-assistant",
  "infinos-smart-bag": "infinos-app",
  "infinos-website": "infinos-website",
  "brain-matrix": "brain-matrix",
  "simplein-school": "simplein-school",
  "ai-3d-studio": "ai-3d-studio",
  nocturne: "nocturne",
};
