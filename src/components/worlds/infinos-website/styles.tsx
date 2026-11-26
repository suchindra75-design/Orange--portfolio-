/** World styles, injected once (React hoists and de-duplicates <style href>). All classes are prefixed iw-. */
const CSS = `/* INFINOS world: a bright product studio. Bone ground, a soft key light, the bag's red as accent. */

.iw-studio {
  container-type: size;
  background:
    radial-gradient(58% 62% at 64% 40%, #f8f2e9 0%, color-mix(in oklab, #f8f2e9 40%, #f2e9dd) 38%, transparent 72%),
    linear-gradient(to bottom, #f2e9dd 0%, #f2e9dd 58%, #ebdfcf 100%);
}

/* The frame box: a 16:10 box that holds one transparent render frame (poster image + canvas).
   Positioned so the bag sits where the composition wants it; the frame edges are transparent. */
.iw-frame {
  position: absolute;
  height: var(--bh);
  width: calc(var(--bh) * 1.6);
  left: calc(var(--cx) - var(--bh) * 1.6 * var(--fx));
  top: calc(var(--cy) - var(--bh) * var(--fy));
}
.iw-frame canvas,
.iw-frame img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Hero: bag top-right, the bottom-left calm for the title. */
.iw-hero {
  --bh: min(76cqh, 58cqw);
  --cx: 68cqw;
  --cy: 40cqh;
  --fx: 0.6;
  --fy: 0.52;
}
@container (orientation: portrait) {
  .iw-hero {
    --bh: min(44cqh, 112cqw);
    --cx: 58cqw;
    --cy: 27cqh;
  }
}

/* Mini: the bag centred, slightly right, on the studio ground. */
.iw-mini {
  --bh: min(104cqh, 118cqw);
  --cx: 56cqw;
  --cy: 50cqh;
  --fx: 0.58;
  --fy: 0.52;
}

/* Poster art direction: phone vs desktop frames, and the rest frame under reduced motion. */
.iw-posterD,
.iw-posterRestD,
.iw-posterRestM {
  display: none;
}
.iw-posterM {
  display: block;
}
@media (min-width: 768px) {
  .iw-posterM {
    display: none;
  }
  .iw-posterD {
    display: block;
  }
}
@media (prefers-reduced-motion: reduce) {
  .iw-posterM,
  .iw-posterD {
    display: none !important;
  }
  .iw-posterRestM {
    display: block;
  }
  @media (min-width: 768px) {
    .iw-posterRestM {
      display: none;
    }
    .iw-posterRestD {
      display: block;
    }
  }
}

/* Vertical credit along the hero's right edge. */
.iw-credit {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

/* Validation diptych: a quiet mount around each print. */
.iw-mount {
  background: color-mix(in oklab, #d8c7b0 34%, #f2e9dd);
}
.iw-fadeIn {
  animation: iw-fade 0.7s var(--ease-out-expo) both;
}
@keyframes iw-fade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

/* Opening sequence: soft edges where the frame meets the copy. */
.iw-openShade {
  background:
    linear-gradient(to bottom, #f2e9dd 0%, color-mix(in oklab, #f2e9dd 80%, transparent) 6%, transparent 16%),
    linear-gradient(to right, #f2e9dd 0%, #f2e9dd 29%, color-mix(in oklab, #f2e9dd 60%, transparent) 35%, transparent 42%);
}
@media (orientation: portrait) {
  .iw-openShade {
    display: none;
  }
}
/* Portrait: the copy blocks above and below the frame band feather its cut edges. */
@media (orientation: portrait) {
  .iw-featherDown,
  .iw-featherUp {
    position: relative;
    /* Full-bleed bone behind the block (out to the screen edges, past the gutters). */
    border-image: linear-gradient(#f2e9dd, #f2e9dd) fill 0 / 0 / 0 100vw;
  }
  .iw-featherDown::after,
  .iw-featherUp::before {
    content: "";
    position: absolute;
    left: calc(var(--gutter) * -1);
    right: calc(var(--gutter) * -1);
    height: 2.5rem;
    pointer-events: none;
  }
  .iw-featherDown::after {
    top: 100%;
    background: linear-gradient(to bottom, #f2e9dd, transparent);
  }
  .iw-featherUp::before {
    bottom: 100%;
    background: linear-gradient(to top, #f2e9dd, transparent);
  }
}

.iw-beat {
  transition:
    opacity 0.5s var(--ease-out-expo),
    transform 0.7s var(--ease-out-expo);
}
.iw-beat[data-on="false"] {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
}
`;

export function IWStyles() {
  return (
    <style href="iw-infinos-website" precedence="medium">
      {CSS}
    </style>
  );
}

export const s = {
  studio: "iw-studio",
  frame: "iw-frame",
  hero: "iw-hero",
  mini: "iw-mini",
  posterD: "iw-posterD",
  posterRestD: "iw-posterRestD",
  posterRestM: "iw-posterRestM",
  posterM: "iw-posterM",
  credit: "iw-credit",
  mount: "iw-mount",
  fadeIn: "iw-fadeIn",
  openShade: "iw-openShade",
  featherDown: "iw-featherDown",
  featherUp: "iw-featherUp",
  beat: "iw-beat",
} as const;
