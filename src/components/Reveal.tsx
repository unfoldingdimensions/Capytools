"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ease, dur } from "@/lib/capytools/motion";

/**
 * Slow-out reveal helper — the calm entrance used across the landing hero.
 *
 * The server cannot know the motion preference, so it always renders the
 * starting state; rendering different markup for reduced motion on the client
 * is a hydration mismatch React does not patch (it stranded the landing at
 * opacity 0). One tree for everyone: reduced motion only zeroes the transition
 * here, and the `[data-reveal]` rule in globals.css shows the finished state.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      // No opacity here: LCP ignores an element at opacity 0, so fading the
      // above-fold content in gated the metric on hydration. The rise still
      // animates and the element paints on the first frame.
      data-reveal=""
      initial={{ y: 18 }}
      animate={{ y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: dur.heroReveal / 1000, delay, ease: ease.slowOut }}
    >
      {children}
    </motion.div>
  );
}
