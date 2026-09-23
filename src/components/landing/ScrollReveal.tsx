"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ease } from "@/lib/capytools/motion";

/**
 * Scroll-triggered entrance for the editorial landing's below-fold content.
 * Mirrors the OpenDesign export's data-reveal system (900ms expo-out settle,
 * direction variants, per-element delays for stagger) on the house motion
 * library — the landing needs in-view triggers, which the mount-triggered
 * `Reveal` can't do on a nine-section page.
 *
 * Under prefers-reduced-motion the content renders static and visible — by
 * the `[data-reveal]` rule in globals.css, not by rendering a different tree:
 * the server always ships the motion markup, and swapping it for a plain
 * <div> on the client kept the server's inline opacity:0 forever.
 */

const EASE = ease.slowOut;

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
  // Tool pages wrap their progressive cards in this reveal; when the wrapped
  // child is still conditional (`false`), an empty wrapper must not leave a
  // flex-gap hole behind.
  if (!children) {
    return null;
  }

  return (
    <motion.div
      className={className}
      // Server markup ships this at opacity 0; `data-reveal` is what the
      // no-script rule in globals.css keys on to show it anyway.
      data-reveal=""
      initial={HIDDEN[direction]}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      // No negative bottom margin: it shrank the viewport by 8%, so anything
      // shorter than that at the very end of a page could never reach 12%
      // visible — the footer's "Quiet by default." stayed at opacity 0 on
      // every phone.
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
