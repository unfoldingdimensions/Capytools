/**
 * Capytools — "slow and deliberate" motion language.
 *
 * The measured half of this (the curves, in CSS string form) lives in
 * src/app/tokens.css as `--ease-*` and `--dur-*`, because the stylesheets need
 * them and cannot read TypeScript. The two files are mirrors:
 * tests/motion-tokens.test.ts fails if they drift apart.
 *
 * The feeling: everything has already arrived, it's just settling in.
 */
export const ease = {
  /** expo-out — all entrances/reveals. Decelerates to a near-stop. */
  slowOut: [0.16, 1, 0.3, 1] as const,
  /** hovers, small moves, colour fades. */
  gentle: [0.33, 1, 0.68, 1] as const,
  /** infinite loops: float, breathe, steam, ripple. */
  drift: [0.45, 0, 0.55, 1] as const,
} as const;

/**
 * The same three curves as CSS strings, for the places a curve has to go into a
 * `style` attribute, a Web Animation, or an inline `style` block — where a
 * tuple is no use. Names match the `--ease-*` tokens, and the values are
 * asserted equal in tests/motion-tokens.test.ts.
 */
export const cssEase = {
  entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  ui: "cubic-bezier(0.33, 1, 0.68, 1)",
  drift: "cubic-bezier(0.45, 0, 0.55, 1)",
} as const;

export const dur = {
  /** colour, border, opacity — `--dur-fade`. */
  fade: 250,
  /** translate, scale — `--dur-move`. */
  move: 350,
  /** cards, panels, modals (500–800ms) — `--dur-entrance`. */
  entrance: 600,
  /** landing hero, the big numeral (700–1200ms) */
  heroReveal: 900,
  /** @deprecated use `move`. Kept so older call sites keep compiling. */
  hover: 350,
  /** stagger gap between related elements — never 50ms, that's snappy */
  staggerGap: 100,
  /** mascot blink close — 180ms close, ~120ms hold, 6–9s cycle */
  blinkClose: 180,
} as const;
