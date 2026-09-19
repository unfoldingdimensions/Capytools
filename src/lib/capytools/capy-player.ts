/**
 * The animated mascot's player, ported from the animation team's
 * `capy-player.js` handover (brand/CAPY-LOTTIE-HANDOVER.md).
 *
 * The `.lottie` carries TWO things:
 *   1. a state machine "capy states" — owns awake <-> asleep on click
 *   2. six named markers — awake, asleep-enter, asleep, wake-enter, poke, yuzu
 *
 * `poke` and `yuzu` are deliberately NOT in the state machine (their decision
 * C13): what counts as "a poke" or "a completed tool action" is a code
 * decision, so the web layer plays them by name. They are not dead frames.
 *
 * Both one-shots ASSUME THE CAPY IS ASLEEP when they start — their first
 * frames (780 and 960) hard-snap the eyes shut, so firing either while the
 * machine is `awake` visibly slams them. Hence the gate in playOneShot.
 */

import type { DotLottie } from "@lottiefiles/dotlottie-web";

const SM_ID = "capy states";

/**
 * Both one-shots end with the capy asleep, so the machine is put back there
 * rather than restarting at its initial state (`awake`), which would pop the
 * eyes open. `stateMachineStart()` takes no starting state — override instead.
 */
const ONE_SHOT_END_STATE = "asleep";

export type CapyHandle = {
  poke: () => boolean;
  yuzu: () => boolean;
  isAsleep: () => boolean;
  destroy: () => void;
};

export function attachCapy(dl: DotLottie, canvas: HTMLCanvasElement, animate: boolean): CapyHandle {
  let busy = false;

  dl.addEventListener("load", () => {
    dl.stateMachineLoad(SM_ID);
    // Reduced motion: the handover is explicit that the capy must NOT be
    // hidden — it is the brand mark. Frame 0 of `awake`, held, is the
    // still version of it.
    if (!animate) return;
    dl.stateMachineStart();
  });

  // Click drives awake <-> asleep through the machine. Coordinates must be in
  // CANVAS space, not CSS space — they differ whenever the canvas is scaled,
  // and raw clientX/clientY simply miss.
  const onPointerDown = (e: PointerEvent) => {
    if (busy || !animate) return;
    const r = canvas.getBoundingClientRect();
    dl.stateMachinePostClickEvent(
      (e.clientX - r.left) * (canvas.width / r.width),
      (e.clientY - r.top) * (canvas.height / r.height),
    );
  };
  canvas.addEventListener("pointerdown", onPointerDown);

  function playOneShot(marker: string): boolean {
    if (busy || !animate) return false;
    if (dl.stateMachineGetCurrentState() !== "asleep") return false;

    busy = true;
    dl.stateMachineStop();
    dl.setMode("forward"); // `wake-enter` leaves the machine in reverse
    dl.setLoop(false); // so `complete` actually fires
    dl.setMarker(marker);
    dl.play();

    const done = () => {
      dl.removeEventListener("complete", done);
      dl.stateMachineStart();
      dl.stateMachineOverrideState(ONE_SHOT_END_STATE, true);
      busy = false;
    };
    dl.addEventListener("complete", done);
    return true;
  }

  return {
    poke: () => playOneShot("poke"),
    yuzu: () => playOneShot("yuzu"),
    isAsleep: () => dl.stateMachineGetCurrentState() === "asleep",
    destroy: () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      dl.destroy();
    },
  };
}
