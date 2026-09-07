// The delivered clip, on demand. A model either ships one animation or it ships
// none; the button appears only in the first case.
//
// The clip tells its own story and ends where it started (see docs/MODEL-SPEC.md),
// so there is nothing to pause at and nothing to put back — play it once, let
// model-viewer's "finished" event hand the stage back to the idle showcase.

export function createAnimator(mv, showcase) {
  const btn = document.getElementById("animate");
  let busy = false;

  const clip = () => (mv.availableAnimations || [])[0];

  btn.onclick = () => {
    const name = clip();
    if (busy || !name) return;
    busy = true;
    showcase.stop();                      // no camera moves mid-reveal
    document.body.classList.add("cine");
    mv.animationName = name;
    mv.play({ repetitions: 1 });
    mv.currentTime = 0;
  };

  mv.addEventListener("finished", () => {
    if (!busy) return;                    // not our playback — leave the stage alone
    mv.pause();
    mv.currentTime = 0;
    document.body.classList.remove("cine");
    busy = false;
    showcase.start();
  });

  return {
    /** Offer it only when this model actually carries a clip. */
    refresh() {
      btn.hidden = !clip();
    },
    /** Changing product must never strand the page in cinematic mode. */
    reset() {
      document.body.classList.remove("cine");
      busy = false;
    },
  };
}
