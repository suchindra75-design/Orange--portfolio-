/**
 * Identity & contact — the single source of truth for who this site is about.
 * Sourced from the owner's résumé and GitHub profile. Anything still `null`
 * renders as "pending" (never as a working link).
 */

export type ContactLink = {
  label: string;
  /** Full URL (mailto:, https:). `null` renders a non-interactive "pending" row. */
  href: string | null;
  /** What the visitor sees, e.g. a handle or address. */
  display: string | null;
};

const links: ContactLink[] = [
  { label: "Email", href: "mailto:suchindra75@gmail.com", display: "suchindra75@gmail.com" },
  { label: "GitHub", href: "https://github.com/suchindra75-design", display: "suchindra75-design" },
  { label: "LinkedIn", href: "https://linkedin.com/in/lakshminarayan", display: "in/lakshminarayan" },
];

export const site = {
  /** Display name used across the UI. */
  name: "Suchindra Denduluri",
  fullName: "Lakshmi Narayana Suchindra Denduluri",
  initials: "SD",
  role: "Full Stack Developer",
  location: "Hyderabad, India",
  current: { company: "INFINOS Tech", role: "Full Stack Developer" },
  previous: [{ company: "SIMPLEIN SOLUTIONS", role: "Full Stack Developer" }],
  education: {
    degree: "B.E. Electrical & Electronics Engineering",
    short: "B.E. EEE",
    school: "Chaitanya Bharathi Institute of Technology (CBIT)",
    schoolShort: "CBIT, Hyderabad",
    years: "2023–2027",
  },
  /** PLACEHOLDER — the deployed URL (used for canonical links, sitemap, OG). */
  url: "https://example.com",
  description:
    "Suchindra Denduluri builds software products, AI assistants, automation and hardware-connected apps: a voice assistant that acts on his computer, telemetry platforms, an EEG workstation and a multi-tenant school ERP.",
  /** AI-assisted development tools in daily use. */
  aiTools: ["Claude", "ChatGPT", "Antigravity", "OpenCode"],
  github: "https://github.com/suchindra75-design",
  links,
  /** Primary navigation. */
  nav: [
    { href: "/projects", label: "Projects" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
} as const;
