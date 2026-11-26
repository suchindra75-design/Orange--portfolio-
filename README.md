# Suchindra Denduluri: portfolio (v7, Bold Colour)

A multi-page portfolio in **Bold Colour**: an orange page, the name enormous in cream, my real photograph cut out like a sticker, and the projects as chunky cards. A subtle Spider-Man layer (spider-sense and a few hidden easter eggs) carries over. The design contract is `DESIGN.md`. The art direction, the reference study and the design history are kept outside this repository.

```bash
npm install
npm run dev                    # http://localhost:3000 (restart after editing globals.css)
npm run build && npm start     # judge performance on the production build
```

## Pages

| Route | What it is |
|---|---|
| `/` | **The sticker hero**: SUCHINDRA in giant cream letters on orange, my photograph cut out in front, and three stickers saying what I build (spider-sense tingles near my head). Then **Stuff I made** (chunky tilted cards with live previews), a hello, How I build, and an invitation |
| `/projects` | The same cards on orange, plus "Also built" |
| `/projects/raya-assistant` | RAYA, the personal AI assistant. **Command console** (simulation) with the real tool calls, the voice gate and the Allow / Deny approval gate |
| `/projects/raya-smart-home` | RAYA Home. The 3D living room: instruction → RAYA → signal → ESP controller → appliance (**concept demo**) |
| `/projects/infinos-website` | The INFINOS product website. The real Blender reveal and scroll-scrubbed opening sequences, plus model validation |
| `/projects/infinos-app` | INFINOS Telemetry. The signal path from sensor to audit report, and a **replay of recorded data** from the app's own export |
| `/projects/brain-matrix` | Brain Matrix. Two data paths, and a cloud-vs-Bluetooth signal monitor (**simulated signal**) |
| `/projects/simplein-school` | SIMPLEIN School. A 3D architectural plan walkthrough, the tenant-isolation demo (**reconstruction**) and the audited numbers |
| `/projects/ai-3d-studio`, `/projects/nocturne` | Also built (generic world) |
| `/about`, `/contact` | Editorial portrait, approach, résumé facts; contact |
| `/work/:slug` | 308 redirect to `/projects/:slug` |

The footer on every page is the final scene: an ink band, then an orange panorama. My actual photograph, printed as an ink line-engraving and cut out like a sticker, stands a head taller at the centre of an illustrated crowd, with SUCHINDRA enormous in cream behind it. The crowd flows outward on scroll, and a tiny spider hangs from one strand. Navigation is a row of pills: Projects · About · Contact, plus **Jump to** (⌘K / Ctrl K / "/").

## Architecture

- **Data:** `src/content/projects.ts` is the single source of project facts, screens, links, notes and each world's colours. `site.ts` and `profile.ts` (from the résumé) hold the rest.
- **One template:** `src/components/project/ProjectPage.tsx`. Each project's look and demo come from its **world**, `src/components/worlds/<slug>/` (`Mini`, `HeroVisual`, optional `Demo` / `Extra`; see `worlds/types.ts`). Adding a project means one entry in `projects.ts`, plus optionally a world folder registered in `worlds/registry.ts`.
- **Transitions:**
  - React `<ViewTransition>` (Next 16.4, no config). `ProjectLink` opens a project: the old page recedes, the new one opens through a slit of light from where you clicked, and the project's visual and title morph across.
  - `PageLink` crossfades between top-level pages.
- **3D:** only where it earns its place (the RAYA Home room and the SIMPLEIN plan). `world/Stage.tsx` mounts one lazily loaded canvas inside its own section. It renders on demand, stops when off screen, and its state is reset on unmount.
- **Everything else** is 2D canvas, SVG or CSS. Every loop is gated by visibility, with DPR at most 1.5 and cleanup on unmount.
- **Contract:** `DESIGN.md` covers palette, type, motion, performance, honesty and file ownership.

Earlier versions (Signal Path, Sketched → Built, The Other Side of Imagination, Worlds v5 and THE CARET v6) are archived outside this repository.

## Honesty

- Real screenshots are captioned as real.
- Every simulation or replay carries a visible label.
- Claims trace to the code, the live sites or the résumé.

**Still open:**
- The deployed URL (`site.url` is a placeholder).
- The RAYA smart-home firmware (not public, so that page is a concept demo).
- New screenshots of the RAYA window, which still says JARVIS.
