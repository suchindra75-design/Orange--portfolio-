import type { NextConfig } from "next";
import { legacySlugs } from "./src/content/projects";

const nextConfig: NextConfig = {
  // QA builds can write to their own folder (e.g. NEXT_DIST_DIR=.next-qa-raya) so several
  // checks can run side by side without touching the dev server's .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  cacheComponents: true,
  // Case studies moved from /work/:slug to /projects/:slug; old links keep working.
  async redirects() {
    return [
      ...Object.entries(legacySlugs).map(([from, to]) => ({ source: `/work/${from}`, destination: `/projects/${to}`, permanent: true })),
      { source: "/work", destination: "/projects", permanent: true },
      // "RAYA Home" became the ESP32 Home Automation System (owner's decision, DECISIONS.md).
      { source: "/projects/raya-smart-home", destination: "/projects/esp32-home-automation", permanent: true },
      { source: "/work/raya-smart-home", destination: "/projects/esp32-home-automation", permanent: true },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
