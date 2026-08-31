// Cinematic explode. The clip runs rest -> apart (1.3s) -> holds -> back to rest
// (ends 4.0s). Pausing at 1.4 leaves it apart indefinitely; resuming from 2.7
// reassembles it. Both ends of the clip are the same rest pose, so repeated
// cycles can never drift.
//
// Timings match docs/MODEL-SPEC.md — change them together.

const APART = 1.4, REJOIN = 2.7, BEAT = 1400;
const CLIP = "Explode";

export function createExplode(mv, showcase) {
  const btn = document.getElementById("explode");
  const back = document.getElementById("reassemble");
  let busy = false;

  btn.onclick = () => {
    if (busy || !hasClip()) return;
    busy = true;
    showcase.stop();                       // no finish-cycling mid-reveal
    document.body.classList.add("cine");
    mv.animationName = CLIP;
    mv.play({ repetitions: 1 });
    mv.currentTime = 0;
    setTimeout(() => {
      mv.pause();
      mv.currentTime = APART;              // pin the pose regardless of drift
      back.hidden = false;
      busy = false;
    }, BEAT);
  };

  back.onclick = () => {
    if (busy) return;
    busy = true;
    back.hidden = true;
    mv.play({ repetitions: 1 });
    mv.currentTime = REJOIN;
    setTimeout(() => {
      mv.pause();
      mv.currentTime = 0;
      document.body.classList.remove("cine");
      busy = false;
      showcase.start();
    }, BEAT);
  };

  const hasClip = () => (mv.availableAnimations || []).includes(CLIP);

  return {
    /** Offer the reveal only when this model actually carries the clip. */
    refresh() {
      btn.hidden = !hasClip();
    },
    /** Changing product must never strand the page in cinematic mode. */
    reset() {
      document.body.classList.remove("cine");
      back.hidden = true;
      busy = false;
    },
  };
}
