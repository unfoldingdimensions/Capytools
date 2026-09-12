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

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur.entrance / 1000, delay, ease: ease.slowOut }}
    >
      {children}
    </motion.div>
  );
}
