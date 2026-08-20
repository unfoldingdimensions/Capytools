/**
 * Capybara artwork, as pure path data.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 * Everything here is plain strings so the same art can be drawn three ways:
 * inline <svg> in the app (themeable via currentColor, animatable), a data-URI
 * <img> for the card (Satori cannot parse inline <svg>), and a flat PNG export.
 * Keep it free of JSX and of React.
 *
 * ── Replacing the pose art ─────────────────────────────────────────────────
 * `CAPY_POSE` below is PLACEHOLDER line art. To drop in traced SVGs, export
 * each layer from the reference illustration and paste its `d` string here. The
 * rig (components/mascot/CapyScene.tsx) animates whole layers by transform and
 * opacity, so it does not care what the paths contain — only that:
 *
 *   • the coordinate space is the POSE_VIEWBOX below (120 × 80 user units);
 *   • `water` sits at the bottom, waterline around y = 62;
 *   • `body` is one silhouette including the legs, drawn ON the waterline;
 *   • `head` is a SEPARATE layer whose neck meets the body near (40, 40) — the
 *     rig rotates it about HEAD_PIVOT, so that point must be the hinge;
 *   • `eyeOpen` / `eyeClosed` occupy the same spot inside the head layer, since
 *     they cross-fade for the blink and the nap;
 *   • `bird` is drawn already perched (the rig fades and hops it into place);
 *   • `steam` rises from the left of the body.
 *
 * Nothing else needs to change — no timings, no component code.
 */

/** Head-only mark: the app logo. */
export const HEAD_VIEWBOX = "0 0 64 48";

/** Full-body scene: the three-pose rig. */
export const POSE_VIEWBOX = "0 0 120 80";

/** Hinge the head rotates about in the nap pose, in POSE_VIEWBOX units. */
export const HEAD_PIVOT = { x: 40, y: 40 } as const;

/**
 * The main logo — head only. Flat-topped head, small pointed ears, resting
 * (closed) eyes, soft muzzle. Stroke-only so it inherits currentColor.
 */
export const CAPY_HEAD = {
  /** Wider than tall (38 × 32) with a flattened crown — a capybara head is a
      broad block, not the circle a smaller ratio would read as. */
  contour:
    "M13 25 C13 14 20 10 32 10 C44 10 51 14 51 25 C51 35 43 42 32 42 C21 42 13 35 13 25 Z",
  /** Small rounded ears set out near the corners, barely clearing the crown. */
  leftEar: "M18.5 14 Q18 7.5 24.5 10.5",
  rightEar: "M45.5 14 Q46 7.5 39.5 10.5",
  /** Resting eyes — a gentle downward arc each, wide-set and high. */
  leftEye: "M21 22 Q25.5 24.8 30 22",
  rightEye: "M34 22 Q38.5 24.8 43 22",
  /** Nose as one continuous "m", which holds together better when scaled down
      than two separate nostril arcs. */
  nose: "M29 30 Q30.5 28 32 30 Q33.5 28 35 30",
  /** Philtrum down to a wide, shallow smile. */
  mouth: "M32 30 V33.8 M27.5 35 Q32 38.2 36.5 35",
} as const;

/**
 * PLACEHOLDER pose art — see the replacement notes at the top of this file.
 * Deliberately minimal: enough for the rig to read correctly, not a substitute
 * for the hand-drawn reference.
 */
export const CAPY_POSE = {
  /** Waterline ripples. */
  water:
    "M22 63 Q60 69 98 63 M32 68 Q60 73 88 68 M14 66 Q22 68 30 66 M90 66 Q98 68 106 66",
  /** Loaf silhouette: back, rump, and the feet meeting the waterline. */
  body:
    "M40 42 C44 30 60 26 74 29 C88 32 96 42 96 51 C96 58 90 63 82 63 L46 63 C40 63 36 58 36 51 Z",
  /** Head layer — its neck meets the body at HEAD_PIVOT. */
  head:
    "M40 40 C30 40 22 45 22 51 C22 57 28 61 36 61 C44 61 50 56 50 49 C50 44 46 40 40 40 Z",
  headEar: "M40 41 L41 35 L45 39",
  eyeOpen: "M30 48 h5",
  eyeClosed: "M29.5 49 Q32 51 35 49",
  /** Cheek/muzzle detail that reads at any size. */
  muzzle: "M24 52 Q26 55 29 54",
  /** Perched bird, already in position on the back. */
  bird:
    "M66 22 C64 20 64 16 68 15 C72 14 75 16 75 19 L80 21 L75 22 C74 25 70 25 68 23 Z M66 22 L60 27 M75 15 Q77 12 79 14",
  /** Two steam curls rising at the left. */
  steam: "M16 44 Q12 40 16 36 Q20 32 16 28 M24 42 Q21 39 24 36",
} as const;
