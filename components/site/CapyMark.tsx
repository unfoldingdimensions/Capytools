/**
 * CapyMark — minimal line-art capybara head (placeholder seed of the Phase-7
 * mascot). Flat-top head, squint-eyelid lines, tiny ears, ripple baseline.
 * Strokes use `currentColor` so it themes with its container. Phase 7 expands
 * this into the full character set (mark + pal + steam + blink/breath loops).
 */
export function CapyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden className={className}>
      {/* head + body contour */}
      <path
        d="M15 25 C15 13 22 7 32 7 C42 7 49 13 49 25 C49 34 42 40 32 40 C24 40 15 34 15 25 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* squint eyes — one eyelid line each */}
      <path d="M23 20 h7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M34 20 h7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      {/* tiny ears */}
      <path d="M22 8.5 Q24 3 28 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M42 8.5 Q40 3 36 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* ripple baseline */}
      <path
        d="M18 41 q5 3 10 0 M36 41 q5 3 10 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
