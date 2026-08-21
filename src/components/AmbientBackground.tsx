/**
 * The ambient layer — three soft colour washes drifting behind the page, plus a
 * static grain. It is the "background life" tier of the motion design: nothing
 * here is ever the thing you look at, it just stops the page reading as flat.
 *
 * Two deliberate choices:
 *
 * 1. Each wash is a `radial-gradient(closest-side, colour, transparent)` on a
 *    big element, NOT a solid with `filter: blur()`. A blur of this radius has
 *    to re-sample its backdrop every frame while the element moves; a gradient
 *    is painted once and then only transformed, so the whole layer stays on the
 *    compositor.
 * 2. The loops `alternate` rather than restarting, so there is no seam — the
 *    keyframe end state is also the start of the way back. Negative delays put
 *    the three out of phase, otherwise they breathe in unison and read as one
 *    pulsing blob.
 *
 * No hooks: pure CSS, so this renders on the server and costs nothing at
 * hydration. The reduced-motion guard in globals.css @layer base zeroes every
 * duration, which leaves the washes exactly where they started — still pretty,
 * just still.
 */

/** feTurbulence grain. Inline so it costs no request, static so it never distracts. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="ambient-wash ambient-wash-a"
        style={{
          background: "radial-gradient(closest-side, var(--sage-mid), transparent)",
        }}
      />
      <div
        className="ambient-wash ambient-wash-b"
        style={{
          background: "radial-gradient(closest-side, var(--water), transparent)",
        }}
      />
      <div
        className="ambient-wash ambient-wash-c"
        style={{
          background: "radial-gradient(closest-side, var(--sage-tan), transparent)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.022] dark:opacity-[0.03]"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
