/**
 * Capytools — "slow and deliberate" motion language.
 * The feeling: everything has already arrived, it's just settling in.
 */
export const ease = {
  /** expo-out — all entrances/reveals. Decelerates to a near-stop. */
  slowOut: [0.16, 1, 0.3, 1] as const,
  /** hovers, small moves, color fades. */
  gentle: [0.33, 1, 0.68, 1] as const,
  /** infinite loops: float, breathe, steam, ripple. */
  drift: [0.45, 0, 0.55, 1] as const,
} as const;

export const dur = {
  /** cards, panels, modals (500–800ms) */
  entrance: 600,
  /** landing hero, the big numeral (700–1200ms) */
  heroReveal: 900,
  /** lift, color, underline (300–400ms) */
  hover: 350,
  /** stagger gap between related elements — never 50ms, that's snappy */
  staggerGap: 100,
  /** text/border fades (200–300ms) */
  fade: 250,
  /** mascot blink close — 180ms close, ~120ms hold, 6–9s cycle */
  blinkClose: 180,
} as const;
