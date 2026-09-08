"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll-triggered entrance for the editorial landing's below-fold content.
 * Mirrors the OpenDesign export's data-reveal system (900ms expo-out settle,
 * direction variants, per-element delays for stagger) on the house motion
 * library — the landing needs in-view triggers, which the mount-triggered
 * `Reveal` can't do on a nine-section page.
 *
 * Under prefers-reduced-motion the content renders static and visible.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Direction = "up" | "left" | "right" | "scale" | "rise-lg";

const HIDDEN: Record<
  Direction,
  { opacity: number; x?: number; y?: number; scale?: number }
> = {
  up: { opacity: 0, y: 28 },
  left: { opacity: 0, x: -36 },
  right: { opacity: 0, x: 36 },
  scale: { opacity: 0, scale: 0.96 },
  "rise-lg": { opacity: 0, y: 64, scale: 0.985 },
};

export function ScrollReveal({
  children,
  className,
  direction = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  /** Seconds — the export's stagger values (90ms cards, 110ms method…). */
  delay?: number;
}) {
  const reduced = useReducedMotion();

  // Tool pages wrap their progressive cards in this reveal; when the wrapped
  // child is still conditional (`false`), an empty wrapper must not leave a
  // flex-gap hole behind.
  if (!children) {
    return null;
  }

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={HIDDEN[direction]}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
