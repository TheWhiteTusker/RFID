// The idle performance: camera choreography plus finish cycling.
//
// A constant auto-rotate reads cheap. Instead the camera moves between hero
// angles and rests, which reads like a product film. model-viewer eases between
// camera-orbit values on its own (interpolation-decay), so setting the target
// is all we do — no animation loop.

import { markFinish } from "./view.js";
import { apply as applyFinish } from "./finish.js";

// theta climbs by 90deg each step so rotation always travels one way and never
// swings back; phi and radius vary to give height changes and slow push-ins.
const PHI = [68, 60, 76, 58];
// 100% is model-viewer's framing distance, but its framing is not tight enough
// to hold every orientation on a viewport-wide canvas — the model still spilled
// off the edges at 104%. 130% is the closest that stays inside (and is a fifth
// smaller on screen); it matches min-camera-orbit in index.html, which clamps
// anything nearer anyway. Push-ins live in the 130-140 band.
const RADIUS = ["140%", "132%", "136%", "130%"];
const STEP_MS = 4500;
const RESUME_MS = 12000;   // how long to leave the camera alone after a drag
const CYCLE_FINISH = false; // idle finish cycling — off for now, flip back to restore

export function createShowcase(mv, ctx) {
  let step = 0, timer = null, idle = null, held = false;

  function frame() {
    if (held) return;
    const theta = -30 + step * 90;
    mv.cameraOrbit = `${theta}deg ${PHI[step % PHI.length]}deg ${RADIUS[step % RADIUS.length]}`;
  }

  function tick() {
    step++;
    frame();

    // cycle the finish so all three get seen without anyone touching the screen
    if (CYCLE_FINISH) {
      const names = ctx.product().finishes.map((f) => f[0]);
      ctx.setFinish(names[step % names.length]);
      markFinish(ctx.finish());
      applyFinish(mv, ctx.finish());
    }

    // with no product pinned by a tag, browse the catalogue unattended
    if (step % 5 === 0 && !ctx.pinned()) ctx.next();
  }

  // Don't fight someone who is dragging the model; back off, then resume.
  mv.addEventListener("camera-change", (e) => {
    if (e.detail.source !== "user-interaction") return;
    held = true;
    clearTimeout(idle);
    idle = setTimeout(() => { held = false; frame(); }, RESUME_MS);
  });

  return {
    start() {
      clearInterval(timer);
      step = 0;
      frame();
      timer = setInterval(tick, STEP_MS);
    },
    stop() {
      clearInterval(timer);
    },
  };
}
