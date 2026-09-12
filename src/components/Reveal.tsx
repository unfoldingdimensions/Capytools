"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ease, dur } from "@/lib/capytools/motion";

/**
 * Slow-out reveal helper — the calm entrance used across the landing hero.
 *
 * Guards `prefers-reduced-motion` itself rather than leaning on
 * MotionProvider: the app-wide config drops transform moves, and this renders
 * the settled state outright so there is no fade-only shadow of the animation
 * left behind. Mirrors ScrollReveal, which has always done the same.
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

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.heroReveal / 1000, delay, ease: ease.slowOut }}
    >
      {children}
    </motion.div>
  );
}
