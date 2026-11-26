/**
 * The jump palette's index and its keyword matcher. Small and honest: no AI, no fuzzy guessing.
 * Every entry and every synonym comes from site.ts, projects.ts or profile.ts.
 */

import { site } from "@/content/site";
import { alsoBuilt, mainProjects, type Project, type ProjectSlug } from "@/content/projects";

export type JumpGroup = "Pages" | "Projects" | "Also built" | "Actions";

export type JumpItem = {
  id: string;
  group: JumpGroup;
  title: string;
  /** Second line: a project's subtitle, a page's purpose, or an action's destination. */
  detail: string;
  /** Mono mark at the start of the row (a project index, or a symbol). */
  mark: string;
  href: string;
  /** How the router opens it: project aperture, page crossfade, or out of the site. */
  kind: "project" | "page" | "external" | "mail";
  /** Lower-cased words this entry answers to. */
  words: { title: string[]; detail: string[]; keys: string[] };
};

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

/** Simple synonyms per project, each grounded in that project's own entry (or the résumé). */
const SYNONYMS: Record<ProjectSlug, string> = {
  "raya-assistant": "ai assistant voice jarvis gemini computer control desktop automation mac approval",
  "esp32-home-automation": "hardware esp esp32 iot home smart relay lights appliance embedded automation",
  "infinos-website": "website site web 3d threejs blender product landing company bag",
  "infinos-app": "telemetry iot monitoring esp esp32 thingspeak hardware bag temperature dashboard app mobile flutter",
  "brain-matrix": "eeg brain biosignal bluetooth ble sleep mask hardware research mobile app",
  "simplein-school": "school erp saas education multi tenant supabase portals",
  "ai-3d-studio": "ai 3d photogrammetry image model studio local",
  nocturne: "webgl story manga shader motion website animation",
};

const PAGE_KEYS: Record<string, string> = {
  "/": "home start index landing front top",
  "/projects": "projects work portfolio all collection worlds",
  "/about": "about resume cv experience skills education background bio cbit who",
  "/contact": "contact hire reach message talk email mail",
};

const PAGE_DETAIL: Record<string, string> = {
  "/": "The wall",
  "/projects": "All the work",
  "/about": "Experience, skills, résumé",
  "/contact": "Say hello",
};

const projectItem = (p: Project, group: JumpGroup): JumpItem => ({
  id: `p-${p.slug}`,
  group,
  title: p.title,
  detail: p.subtitle,
  mark: p.index,
  href: `/projects/${p.slug}`,
  kind: "project",
  words: {
    title: words(p.title),
    detail: words(`${p.subtitle} ${p.category}`),
    keys: words(`${SYNONYMS[p.slug]} ${p.family ?? ""} ${p.stack.join(" ")} project`),
  },
});

const pages: JumpItem[] = [{ href: "/", label: "Home" }, ...site.nav].map((n) => ({
  id: `g-${n.label.toLowerCase()}`,
  group: "Pages",
  title: n.label,
  detail: PAGE_DETAIL[n.href] ?? "",
  mark: "/",
  href: n.href,
  kind: "page",
  words: { title: words(n.label), detail: words(PAGE_DETAIL[n.href] ?? ""), keys: words(PAGE_KEYS[n.href] ?? "") },
}));

const first = site.name.split(" ")[0];
const ACTION_KEYS: Record<string, { title: string; keys: string }> = {
  Email: { title: `Email ${first}`, keys: "email mail contact hire write message reach" },
  GitHub: { title: "GitHub", keys: "github code repo repos source git" },
  LinkedIn: { title: "LinkedIn", keys: "linkedin profile network connect" },
};

const actions: JumpItem[] = site.links.flatMap((l) => {
  const a = ACTION_KEYS[l.label];
  if (!l.href || !a) return [];
  const mail = l.href.startsWith("mailto:");
  return [
    {
      id: `a-${l.label.toLowerCase()}`,
      group: "Actions" as const,
      title: a.title,
      detail: l.display ?? "",
      mark: mail ? "@" : "↗",
      href: l.href,
      kind: mail ? ("mail" as const) : ("external" as const),
      words: { title: words(a.title), detail: words(l.display ?? ""), keys: words(a.keys) },
    },
  ];
});

export const ALL: JumpItem[] = [
  ...pages,
  ...mainProjects.map((p) => projectItem(p, "Projects")),
  ...alsoBuilt.map((p) => projectItem(p, "Also built")),
  ...actions,
];

/** The hidden one. */
export const GREAT_POWER: JumpItem = {
  id: "egg-great-power",
  group: "Projects",
  title: "…comes an approval gate",
  detail: "RAYA · risky actions stop and ask",
  mark: "01",
  href: "/projects/raya-assistant",
  kind: "project",
  words: { title: [], detail: [], keys: [] },
};

/** Verbs and filler that a phrase like "open infinos" or "go to raya home" carries. */
const STOP = new Set(
  "a an the to go goto open opens show see view take me find jump navigate visit get let lets please i want would like can you your his him my for of on in at and with page section tab link".split(" "),
);

function tokenScore(t: string, item: JumpItem): number {
  const { title, detail, keys } = item.words;
  if (title.includes(t)) return 10;
  if (keys.includes(t)) return 7;
  if (detail.includes(t)) return 6;
  if (t.length === 1) return title.some((w) => w.startsWith(t)) ? 4 : 0;
  if (title.some((w) => w.startsWith(t))) return 8;
  if (detail.some((w) => w.startsWith(t)) || keys.some((w) => w.length > 2 && w.startsWith(t))) return 4;
  if (t.length >= 3 && title.join("").includes(t)) return 3;
  return 0;
}

/**
 * Every remaining word must match (title, subtitle, category, stack or a synonym). If nothing
 * matches all of them, the entries matching the most words come back instead.
 */
export function search(raw: string): { items: JumpItem[]; egg: boolean } {
  const q = words(raw);
  if (!q.length) return { items: ALL, egg: false };
  if (/\bgreat power\b/.test(q.join(" "))) return { items: [GREAT_POWER], egg: true };

  const tokens = q.filter((t) => !STOP.has(t));
  if (!tokens.length) return { items: ALL, egg: false };

  const scored = ALL.map((item, order) => {
    let hits = 0;
    let score = 0;
    for (const t of tokens) {
      const s = tokenScore(t, item);
      if (s) hits++;
      score += s;
    }
    return { item, order, hits, score };
  }).filter((r) => r.hits > 0);

  const all = scored.filter((r) => r.hits === tokens.length);
  const pool = all.length ? all : scored;
  pool.sort((a, b) => b.hits - a.hits || b.score - a.score || a.order - b.order);
  return { items: pool.map((r) => r.item), egg: false };
}
