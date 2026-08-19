"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ease, dur } from "@/lib/capytools/motion";

/** Slow-out reveal helper — the calm entrance used across the landing hero. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
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
