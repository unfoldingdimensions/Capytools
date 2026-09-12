"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import { ease, dur } from "@/lib/capytools/motion";

/**
 * Word-by-word reveal: each word rises out of a blur, staggered.
 *
 * Splitting on whitespace keeps whole words intact so the line still wraps
 * naturally and screen readers read one continuous string (the source text is
 * exposed via aria-label; the animated spans are hidden from the a11y tree).
 *
 * Under `prefers-reduced-motion` the words render as plain text inside the
 * same wrapper — no blur, no rise — so the head of every tool page is static
 * for a reader who asked for stillness. The markup shape is deliberately
 * identical either way, so the a11y contract does not change with the motion
 * preference.
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  stagger = 60,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  delay?: number;
  /** Gap between words, ms. */
  stagger?: number;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const reduced = useReducedMotion();
  const words = text.split(/(\s+)/); // keep separators so spacing survives

  if (reduced) {
    return (
      <Tag
        className={className}
        role={Tag === "span" ? "text" : undefined}
        aria-label={text}
      >
        <span aria-hidden>{text}</span>
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      role={Tag === "span" ? "text" : undefined}
      aria-label={text}
    >
      <span aria-hidden>
        {words.map((word, i) => {
          if (/^\s+$/.test(word)) return <Fragment key={i}>{word}</Fragment>;
          return (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: "0.35em", filter: "blur(6px)" }}
              animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
              transition={{
                duration: dur.heroReveal / 1000,
                delay: delay + (i * stagger) / 1000,
                ease: ease.slowOut,
              }}
            >
              {word}
            </motion.span>
          );
        })}
      </span>
    </Tag>
  );
}
