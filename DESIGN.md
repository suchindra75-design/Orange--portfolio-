# DESIGN.md (v8): BOLD COLOUR + THE BENCH, the contract for every page and every agent

**Identity:** loud, warm and hand-made. An orange page, his name enormous in cream, his own cartoon character on a photo-sticker card turning to look at you, and the work as chunky cards you want to pick up.

**The signature marks:**
- **The giant name:** `.t-name` (Bricolage Grotesque 800, tight tracking) for names and titles. SUCHINDRA is always whole, never split.
- **Stickers:** `.sticker` (cream chip, 2px ink border, hard ink shadow), `.hero-sticker` (tilted with `--rot`, wiggles on hover). On desktop with a mouse, the three hero stickers become real 3D vinyl stickers after the intro (`world/HeroStickers.tsx`): same face, an ink body, flat stepped shading, tilting toward the cursor and wobbling when touched. The HTML stickers stay underneath as the text and hit areas.
- **Chunky cards:** `.chunky` (white, 2px ink border, radius 22, `0 12px 0` ink shadow) with `.card-tilt` (`--tilt`, straightens and lifts on hover). Cards below the fold settle onto their tilt as they scroll in (`project/Settle.tsx`). Inside project worlds, `.chunky-w` takes the world's own colours.
- **Pills:** `.pill-ink` for actions, `.nav-pill` in the nav (ink on light grounds, cream over dark ones).
- **Marker:** `.hl`, an orange marker behind one word.
- **Photo cut-out:** `.sticker-cut` (cream outline drawn around a transparent PNG).
- **Hero card:** `.hero-card` (cream edge, 2px ink line, hard ink shadow), tilted -2°, sitting on the hero's bottom edge. It holds the character (below).
- **JetBrains Mono:** small uppercase labels (`.t-label`).

**Palette, Bold Colour:**

| Token | Value | Use |
|---|---|---|
| **pop** (`signal` is an alias) | #FF5A1F | The ground of the hero, /projects, How I build, the footer panorama; accents on cream and ink |
| cream (`paper`, `bone`) | #FFF3E8 | Content grounds, the name, stickers |
| ink (`carbon`, `void`) | #140F0B | Dark sections, borders, shadows, text |
| muted | #8A7A6C | Quiet text on cream |

Rhythm on the home page: orange hero → cream projects → ink intro → orange How I build → cream invitation → ink footer band → orange panorama. Sections overlap with a 40px rounded top edge. Every section sets `data-ground` ("light" for orange and cream, "dark" for ink) so the nav pills flip.

Bricolage has no italic: never use `italic` for emphasis; use weight or colour (`text-pop`, `.hl`).

The project worlds keep their own tints inside their pages (`project.world`); only the template's cards, pills and type follow this direction.

**The Spider-Man layer (subtle, never literal), kept from v6:**
- **Spider-sense:** `[data-sense="on"] .sense-lines`, a 0.6 s ink tingle beside his head in the hero, and around RAYA's approval card.
- **Easter eggs:** in the jump palette ("with great power"), typing "thwip" anywhere, the 404 page, and the tiny spider in the footer panorama with faint corner webs.
- **Never:** logos, masks, characters, comic halftones, red-and-blue colour blocking, webs as wallpaper, or permanent animation.

**The hero character (owner's decision, 26 Nov 2026):**
- The hero shows his own animated cartoon character, from the video he supplied (source kept privately in `art/character/character.mp4`). `home/HeroCharacter.tsx` plays it one real frame at a time on a canvas: he looks straight at you while the cursor is on his face and turns toward it the moment it leaves (the full-turn frame nearest its direction: the video only has in-between turns for "up" and "up-left"). Between poses he walks the real frames in the video's order, one per display frame (two when far behind), so he sweeps around rather than jumping; a big change of side goes through facing you. He blinks (the video's own blink) and now and then glances up when idle. Phones: he turns toward your finger while you touch the hero. Reduced motion: the still centre frame.
- Frames: `tools/character/extract.py` (private) cuts 64 direction frames + `center.webp` + 2 blink frames into `public/me/character/` and writes `src/content/character.ts` (angle and turn amount per frame). The frames are copied as they are, only cropped: **never** blend frames, invent poses, retouch the face, or move his head with CSS transforms. If the video changes, re-run the script.
- The video covers the full circle except a thin gap between up and upper-left; the player uses the nearest real frame there.
- Alt text says it is a cartoon, never a photograph.

**The bench (v8, owner's decision, 27 Nov 2026):** the home hero opens into a 3D workbench holding every project. Specs and research are kept privately in `docs/v2/`.
- **Who gets it:** desktop with a mouse, a screen at least 1024 × 600, motion allowed, no Save-Data, WebGL (`useBenchMode` in `home/Bench.tsx`). Everyone else keeps the v7 page exactly: hero, then the "Stuff I made" grid. Phones, tablets and reduced motion never download three.js on the home page.
- **The crane:** the hero pins for 130% of a screen. Scrolling cranes the camera from the hero's eye line up and over the bench, 1:1 with scroll (`MOTION.scrub`), never hijacked. The name and the stickers leave, the objects pop onto the table (back row first), and his card shrinks and stands on the bench's front edge (projected from 3D every frame). "See the work" plays the same move.
- **Objects:** one per project (`bench/objects.ts`, placed by `content/bench.ts`). They are illustrations built in code, never models of real hardware. Each has one accent from its own world palette, plus cream and ink. Screens show only real things: the project's real screenshot, or INFINOS Telemetry's recorded readings.
- **The material:** printed stickers, made solid (`bench/toon.ts`). Three flat shading steps (lit, 82%, 35% toward ink), an ink inverted-hull outline, and a hard ink offset shadow on the table. **Never** gloss, environment maps, bloom, glow, glass, particles or gradients on objects.
- **Pick it up:** pointing at an object (or focusing its rail link) lifts it with a slap-and-settle spring and deepens its shadow. A DOM label appears (above, or below when there's no room), and **he turns to look at it** using real frames only (`bench.look` → `HeroCharacter`). Clicking flies the camera to it (640 ms), then the usual open-project View Transition plays. Modifier clicks open normally.
- **Ask the bench:** chips filter honestly (`CHIPS`: every membership follows from the project's own data). Objects that are filtered out step back and dim; the rail mutes them; a live region announces the result. "Show me in 60 s" tours the main projects (6.5 s each, one line each, with an Open button). Any wheel, click, Escape or Tab stops it.
- **The DOM owns words and clicks:** the index rail is the real list of links (keyboard and screen readers use only it). The per-object hit areas are mouse-only and `aria-hidden`, sized every frame to the object's box on screen. No text lives in the canvas.
- **One clock:** the bench canvas is `frameloop="never"` and draws inside GSAP's ticker, after Lenis and ScrollTrigger, so the crane, the card and the page agree on every frame. It draws only when asked and never while the hero is off screen. The three hero stickers are drawn in the same canvas, on top, with their own pixel camera (one WebGL context).

**The owner's photograph:**
- **Hero (until 26 Nov 2026):** `/me/hero.png` with `.sticker-cut`, kept in the repo in case he wants it back.
- **Footer:** an ink line-engraving print, from `/me/footer-ink.png`, with `.sticker-cut`.
- **Never** generate or alter his face. His photos are waist-up: never invent a body.

## 1. Structure

| Route | Source |
|---|---|
| `/` | `app/page.tsx`: Hero (`home/Hero.tsx`; on desktop it cranes into the bench, `home/Bench.tsx` + `bench/*`), Worlds ("Stuff I made", `project/CardGrid.tsx`; hidden where the bench shows), Intro, HowIBuild, Invitation |
| `/projects` | `project/Collection.tsx` |
| `/projects/[slug]` | `project/ProjectPage.tsx` (the one template) plus the project's **world** (`components/worlds/<slug>/`) |
| `/about`, `/contact` | `app/about/page.tsx`, `app/contact/page.tsx` |
| `/work/:slug` | Permanent redirect to `/projects/:slug` (`next.config.ts`) |
| The nav and the footer | `chrome/Nav.tsx`, `home/Footer.tsx` + `home/Crowd.tsx`, both in the layout (on every page) |

**Data:** all project facts live in `src/content/projects.ts`; worlds read `project` from props. Never hard-code facts that belong in the data.

## 2. (legacy) Palette: "Dusk & Verdigris" (now the world palette only) (no blue, no purple, no neon)

| Token | Value |
|---|---|
| void | #120A0F |
| dusk | #2B1620 |
| oxblood | #5A1E24 |
| terracotta | #B5573A |
| travertine | #D8C7B0 |
| bone | #F2E9DD |
| ink | #1A1216 |
| **apricot** (key light, the human, imagination) | #FFB26B |
| gold | #FFD9A0 |
| **verdigris** (signal, system, data, "it works") | #5FB8A0 |

- **Per-project tints:** each world has its own ground and accent in `project.world`, exposed on the page as CSS vars `--w-bg`, `--w-ink`, `--w-muted`, `--w-accent` and `--w-accent2`. Use those vars, not new colours.
- **Small extra tints:** you may add 1–2 shades inside the same family (for example graphite #17151A or silver #C9C6CC for RAYA, or the bag red #B8322B for INFINOS).
- **Never:** pure #000 or #fff backgrounds, blue/purple gradients, glowing borders, glassmorphism, particle fields, or generic sci-fi HUD chrome.

## 3. Type

- **Bricolage Grotesque:** display and body (variable, with the optical-size axis). Display 800, body 400–600. No italics.
- **JetBrains Mono:** small uppercase labels (`.t-label`).
- **Only these two fonts load** (both SIL Open Font License 1.1, via `next/font/google`). Don't add a font without checking its licence; never ship a trial or demo font. Canvas and 3D text uses the same two (read from `--font-bricolage` / `--font-jetbrains`).
- **Utilities:** `t-mega`, `t-hero`, `t-display`, `t-h2`, `t-h3`, `t-lead`, `t-body`, `t-italic`, `t-label`, `btn`, `btn-ghost`, `pill`, `sim`, `sim-light`, `link-u`.
- **Section headings in worlds:** reuse `Label` from `project/ProjectPage.tsx` (`<Label n="04">The demo</Label>`).

## 4. Motion

- **Signature motion: slap and settle.** Letters drop in with a back-ease, stickers pop on, cards sit tilted and straighten when you reach for them.
- **Opening a project** is a View Transition in the slap-and-settle language: the old page drops away onto the orange ground, and the new page slaps up from below like a chunky card (rounded 40px top, 2px ink edge, a hard ink lip), tilted toward where you clicked (`ProjectLink` sets `--ap-x`/`--ap-tilt`), overshoots a hair and lands flat. The card's preview and title morph into the project page on top. Top-level pages crossfade. Smooth scroll holds still while a transition plays (`holdForNavigation` in `lib/scroll.ts`).
- **Morph names:** shared-element morphs use `visual-<slug>` (the Mini or HeroVisual wrapper) and `title-<slug>`. They are set by the template, so **never** set these names yourself.
- **Easing:** `--ease-cine` and `--ease-out-expo`. Intros last no more than 1.2 s and never block reading or input. Tailwind's `transition-*` utilities default to `--ease-out-expo` (`--default-transition-timing-function`), and every hand-written transition names an ease: never the browser default.
- **One set of motion values:** `MOTION` in `lib/gsap.ts` (scrub lag, settle and rise eases, the "arrived" line). Use it instead of new numbers.
- **Lenis + ScrollTrigger:** one GSAP ticker drives Lenis, and Lenis feeds `ScrollTrigger.update` (`chrome/SmoothScroll.tsx`). Never add a second rAF scroll loop.
- **Scroll:** pins are short (no section above about 300 svh), and navigation never depends on scrolling.
- **Reduced motion:** a calm static composition, with demos still fully usable.

## 5. Performance (target: Intel i7 + Radeon Pro 5300M; phones)

- **Rendering:** nothing animates off screen. Gate every rAF and canvas loop with an IntersectionObserver.
- **Canvas:** 2D canvases cap DPR at 1.5 and redraw only what changes. The hero character draws only when its frame changes and sleeps between blinks.
- **Hero character frames:** the centre frame loads with the page (about 8 KB) and the two blink frames follow it. The 64 direction frames (about 680 KB) load all at once with a mouse, on the first mouse move or 0.9 s after the centre frame, and decode off the main thread; until a direction arrives he turns to the nearest one that has. Phones fetch them on the first touch of the hero; reduced motion fetches nothing but the centre frame.
- **WebGL:** only through a `Stage` (`world/Stage.tsx` via `world/stages.tsx`), or on the home hero through `bench/BenchCanvas.tsx` (the bench + the stickers, desktop) or `world/HeroStickers.tsx` (the stickers alone, tablets with a mouse). All render on demand, stop off screen and dispose on unmount. At most one per page.
- **The bench's budget:** ≤ 1% of home scroll frames over 33 ms (measured 27 Nov 2026: 1 of ~608, baseline 2 of ~633); a steady 60 fps while hovering the bench at DPR 2; the home page ≤ 1.6 MB on desktop before interaction (measured 1.47 MB). Objects merge their parts by colour (about 4 draw calls each). Screenshots come through `/_next/image` at 640 px. three.js loads after the intro on idle, or on the first scroll.
- **No visible load:** a Stage shows its poster (`world/Poster.tsx`, a still render of the scene at its first camera position, desktop and phone WebP in `public/work/<slug>/`) while three.js loads, and the canvas fades in over it. If a scene changes, re-render its posters.
- **Hero stickers 3D** load only after the intro, on idle, and only with a mouse, a screen ≥ 768px wide, motion allowed and no Save-Data. Phones never download three.js on the home page. That canvas covers the whole hero, so it is capped at DPR 1.5 like every canvas (at 2× it cost scroll frames on the target GPU); the sticker faces are textures painted at 2–4×, so their text stays sharp.
- **Big SVG drawings that move on scroll** must move as composited layers, never by changing what's inside one SVG (the footer crowd draws each person as its own small SVG for this reason). Write each mover's own `transform` from JS; never animate a CSS variable on a big parent (it restyles every shape below it on every frame). Promote layers (`will-change`) only while the drawing is on screen (`.crowd[data-live]`), and use 2D transforms so nothing becomes a layer by accident.
- **Decorative loops pause while the page scrolls:** canvas loops check `isScrolling()` (`lib/scroll.ts`) and skip their redraws, then pick up when the page settles.
- **Image sequences on canvas** are decoded off the main thread (`fetch` → `createImageBitmap`, sized to the canvas when they are bigger than it). Never draw a full-size `<img>` frame on a canvas mid-scroll: that decodes on the main thread and stalls scrolling.
- **Finished CSS entrance animations** use `backwards`, not `both`, where the end state is the resting style, so they drop their compositor layers when done.
- **Lifetime:** clean up everything on unmount (pages unmount on navigation). Module-level timers and streams must stop.
- **Images:** `next/image` with `sizes`. Sequences are WebP, and a desktop/mobile pair if heavy. Lazy-load anything below the fold.
- **No new npm dependencies.**
- **No CSS modules:** the Turbopack `*.css` rule in `next.config.ts` routes every CSS file through Tailwind, so `*.module.css` class maps come back empty. Use Tailwind classes, `globals.css`, or a scoped `<style>` in the world folder.

## 6. Honesty (non-negotiable)

- **Sources:** claims come from `projects.ts` or from evidence you can cite in the owner's code or live sites.
- **Labels:**
  - Simulations carry `.sim` (or `.sim .sim-light` on light grounds) with a plain label, for example "Simulation · nothing on your computer is touched".
  - Replays of recorded data say "Recorded data · replayed".
  - Real screenshots are captioned as real.
- **Never** present AI-generated images, mock UIs or invented numbers as real.
- **RAYA:** credit MARK XLIX by FatihMakes.
- **Brain Matrix:** research use only.
- **SIMPLEIN:** pre-launch.
- **ESP32 Home Automation System** (was "RAYA Home"): concept demo, separate from RAYA (never a RAYA module).
- **Privacy:** never publish phone numbers, emails other than the owner's public one, keys, real people's data, or identifiable bystanders.

## 7. World contract (`src/components/worlds/<slug>/index.tsx` exports `world: WorldParts`)

| Part | What it is |
|---|---|
| `Mini` | A live miniature that fills `absolute inset-0` of its box (16:10-ish, also shown at about 11rem wide). 2D only, aria-hidden, animates only while visible, static under reduced motion. It must read at a glance as *this* project. |
| `HeroVisual` | The hero art behind the title. It fills `absolute inset-0` of a 100 svh section. The title, subtitle, one-line and buttons sit bottom-left over a scrim, so keep the interest top and right and the bottom-left calm. It plays the world's intro (≤ 1.2 s), then rests or idles cheaply. |
| `Demo` (optional) | A full `<section>` (with `data-ground`) holding the interactive or animated demonstration, badged honestly. |
| `Extra` (optional) | Bespoke section(s) placed after "What I built". |

The template provides: hero, The idea, What I built, How it works (features), Real screens, Demo, Built with, notes, and Next project.

**File ownership:**
- A world agent owns its folder and its public assets folder (`public/work/<slug>/`), plus any legacy files it is explicitly given.
- Shared files are the lead's: `content/*`, `globals.css`, `chrome/*`, `project/*`, `home/*`, `world/Stage.tsx`, `world/stages.tsx`, `world/system/*`, `world/director.ts`, `worlds/registry.ts`, `worlds/types.ts`, `worlds/generic/*`, `app/*` and `next.config.ts`. Ask for changes in `leadRequests`.
