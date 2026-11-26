import type { Project } from "@/content/projects";

/**
 * The audited numbers, read from the project's own data (src/content/projects.ts) so the page
 * can never drift from it. A number that isn't found there is simply not shown.
 */
export function factsOf(project: Project) {
  const text = [project.oneLine, project.hook, ...project.built].join(" ");
  const m = (re: RegExp) => text.match(re)?.[1];
  return {
    operations: m(/(\d+) (?:API )?operations/),
    tables: m(/(\d+) tables/),
    policies: m(/(\d+) policies/),
    tests: [
      { name: "Unit", value: m(/unit (\d+\/\d+)/) },
      { name: "Integration", value: m(/integration (\d+\/\d+)/) },
      { name: "pgTAP", value: m(/pgTAP (\d+\/\d+)/) },
      { name: "Smoke crawl", value: m(/smoke crawl of (\d+\/\d+)/) },
    ].filter((t): t is { name: string; value: string } => !!t.value),
  };
}
