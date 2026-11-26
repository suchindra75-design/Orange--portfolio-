/**
 * Experience, skills and recognition, drawn from the owner's résumé (used on /about).
 * Nothing here is embellished. Project pages carry the detailed, code-backed claims.
 */

export type BomGroup = "Programming" | "AI" | "Software & 3D" | "Embedded & IoT";

/**
 * Skills as a bill of materials. Parts are exactly the résumé's skills (plus
 * the AI tools named by the owner); `usedIn` points at where each shows up in
 * the projects above, so every line has evidence.
 */
export const bom: { part: string; group: BomGroup; usedIn: string }[] = [
  { part: "Python", group: "Programming", usedIn: "RAYA · AI 3D Studio · PMSM fault detection" },
  { part: "JavaScript", group: "Programming", usedIn: "INFINOS website · SIMPLEIN School · Brain Matrix" },
  { part: "C", group: "Programming", usedIn: "ESP32 home automation" },
  { part: "LLM API integration", group: "AI", usedIn: "RAYA (Gemini Live) · AI 3D Studio" },
  { part: "Prompt engineering", group: "AI", usedIn: "RAYA" },
  { part: "AI tool integration", group: "AI", usedIn: "AI 3D Studio (TripoSR, Tripo, Meshy)" },
  { part: "Desktop automation", group: "AI", usedIn: "RAYA" },
  { part: "Antigravity", group: "AI", usedIn: "Day-to-day development" },
  { part: "OpenCode", group: "AI", usedIn: "Day-to-day development" },
  { part: "FastAPI", group: "Software & 3D", usedIn: "AI 3D Studio backend" },
  { part: "REST APIs", group: "Software & 3D", usedIn: "SIMPLEIN School (/api/v1)" },
  { part: "Blender", group: "Software & 3D", usedIn: "INFINOS website renders · AI 3D Studio" },
  { part: "Three.js", group: "Software & 3D", usedIn: "INFINOS website · Nocturne" },
  { part: "ESP32", group: "Embedded & IoT", usedIn: "INFINOS bag · home automation" },
  { part: "Arduino", group: "Embedded & IoT", usedIn: "Embedded prototyping" },
  { part: "Digital sensors", group: "Embedded & IoT", usedIn: "INFINOS bag temperature sensing" },
  { part: "Relay modules", group: "Embedded & IoT", usedIn: "ESP32 home automation" },
  { part: "Bluetooth", group: "Embedded & IoT", usedIn: "Brain Matrix (BLE sleeping mask)" },
  { part: "ThingSpeak", group: "Embedded & IoT", usedIn: "INFINOS Telemetry · Brain Matrix" },
];

export type Role = {
  company: string;
  role: string;
  current: boolean;
  period: string | null;
  notes: string[];
};

export const experience: Role[] = [
  {
    company: "INFINOS Tech",
    role: "Full Stack Developer",
    current: true,
    period: "Present",
    notes: [
      "Developed Brain Matrix, a mobile app that connects to a Bluetooth-enabled sleeping mask, receives its sensor readings wirelessly and displays the data.",
      "Developed the complete mobile app for a medical temperature-monitoring transport bag, retrieving sensor readings sent through ESP32 and ThingSpeak.",
      "Designed and developed the company website.",
      "Contributed to the electronics and circuit design of the two-compartment transport bag: ESP32, digital temperature sensors and an onboard display.",
    ],
  },
  {
    company: "SIMPLEIN SOLUTIONS",
    role: "Full Stack Developer",
    current: false,
    period: null,
    notes: ["Independently developed SIMPLEIN School, a multi-tenant school ERP portal, now in review and refinement before launch."],
  },
  {
    company: "BSNL",
    role: "Engineering Intern — Regional Telecom Training Centre, Hyderabad",
    current: false,
    period: "June 2025",
    notes: [
      "Studied FTTH deployment, DWDM multiplexing, signal attenuation and SDH/PDH transmission systems.",
      "Hands-on exposure to fibre-splice testing, OTDR fault localisation, broadband routers and network monitoring.",
    ],
  },
];

export const recognition: { title: string; org: string; period: string; note?: string }[] = [
  { title: "Vice President — Technical & Logistics", org: "Chaitanya Samskruthi, CBIT", period: "2026–Present" },
  { title: "Team Head — Events & Planning", org: "Chaitanya Samskruthi, CBIT", period: "2025–2026", note: "Led a team of 15+ across 5+ large-scale events." },
  { title: "3rd Prize — Hacktoberfest", org: "CBIT Open Source Community", period: "2024" },
];
