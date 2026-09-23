"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ease, dur } from "@/lib/capytools/motion";

/**
 * A panel that appears in place, after a click.
 *
 * The suite had two entrances — `Reveal` (900ms, the hero's timing) and
 * `ScrollReveal` (waits for the viewport) — and neither suits a card that
 * mounts where the reader is already looking. So those surfaces simply popped
 * into existence: the Creator's Polish Settings panel was the clearest example,
 * in a codebase where a hairline progress bar gets an easing curve.
 *
 * Compositor-only (opacity and a 0.99 scale, never height), shorter than a page
 * entrance, and static under `prefers-reduced-motion` — the same contract as
 * the rest of the motion layer.
 *
 * The server cannot know the motion preference, so it always renders the
 * starting state; rendering different markup for reduced motion on the client
 * is a hydration mismatch React does not patch (it stranded the landing at
 * opacity 0). One tree for everyone: reduced motion only zeroes the transition
 * here, and the `[data-reveal]` rule in globals.css shows the finished state.
 */
export function MountReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      // Scale only — see Reveal.tsx for why the fade went.
      data-reveal=""
      initial={{ scale: 0.99 }}
      animate={{ scale: 1 }}
      transition={reduced ? { duration: 0 } : { duration: dur.entrance / 1000, delay, ease: ease.slowOut }}
    >
      {children}
    </motion.div>
  );
}
