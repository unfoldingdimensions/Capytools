"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * The app-wide reduced-motion contract.
 *
 * motion's own default is `reducedMotion: "never"` — see
 * node_modules/framer-motion/dist/es/context/MotionConfigContext.mjs — so
 * without this wrapper every `motion.*` animation in the app ignores the
 * reader's `prefers-reduced-motion`. The CSS guard in globals.css only zeroes
 * CSS animations and transitions; it cannot touch a JS-driven animation.
 *
 * That gap is why the landing's Hero and ScrollReveal guarded themselves by
 * hand while the tool pages' `Reveal`, `TextReveal` and `TerminalLoader` did
 * not — so the promise on /design ("Every motion dies under
 * prefers-reduced-motion") held on the landing and broke on every tool page.
 *
 * `"user"` = respect the OS setting: transform and layout animations are
 * dropped, opacity/colour fades still run. Anything that must be fully static
 * (a word rising out of a blur, an infinitely pulsing dot) still guards itself
 * with `useReducedMotion()`, which is belt-and-braces on purpose: this is a
 * promise the site makes in writing.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
