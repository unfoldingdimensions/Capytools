/**
 * View-transition helpers for the theme spread.
 *
 * The effect works by wrapping a DOM change in `document.startViewTransition`,
 * then animating the incoming snapshot. CSS in globals.css keys off `data-vt`
 * on <html>, so the tag says which effect is running.
 *
 * There used to be a second effect — a page wipe on navigation — and
 * `TransitionLink` still exists as the single seam where it would be
 * reattached. The hand-rolled version was removed when it turned out that
 * `router.push()` inside the transition callback does not compose with the App
 * Router: the callback has to mutate the DOM synchronously, and the new route
 * renders after it returns. The supported replacement is React's
 * `<ViewTransition>` plus `<Link transitionTypes>` (see
 * `next/dist/docs/01-app/02-guides/view-transitions.md`), which needs the React
 * canary build — `ViewTransition` is not exported by react@19.x stable, which
 * is what this project pins. Until that dependency moves, navigation is a hard
 * cut and there is deliberately no half-implementation here.
 */

export type TransitionKind = "theme";

/** Circle geometry that grows from `box` until it clears the whole viewport. */
export function spreadFrom(
  box: { left: number; top: number; width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number; radius: number; from: string; to: string } {
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  // Distance to the furthest corner — anything less leaves a stale wedge behind.
  const radius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y),
  );
  return {
    x,
    y,
    radius,
    from: `circle(0px at ${x}px ${y}px)`,
    to: `circle(${radius}px at ${x}px ${y}px)`,
  };
}

/** True when the browser can run view transitions and the reader allows motion. */
export function canAnimateTransition(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Run `update` inside a view transition tagged as `kind`, then hand back the
 * transition so the caller can animate. Resolves to null when the transition is
 * unavailable or gets skipped, in which case `update` has still run.
 */
export async function startTaggedTransition(
  kind: TransitionKind,
  update: () => void,
): Promise<ViewTransition | null> {
  if (!canAnimateTransition()) {
    update();
    return null;
  }
  document.documentElement.dataset.vt = kind;
  const transition = document.startViewTransition(update);
  const clear = () => delete document.documentElement.dataset.vt;
  void transition.finished.then(clear, clear);
  try {
    await transition.ready;
    return transition;
  } catch {
    return null; // superseded or skipped; the DOM change already applied
  }
}
