"use client";

import { motion } from "motion/react";
import { Fragment } from "react";
import { ease, dur } from "@/lib/capytools/motion";

/**
 * Word-by-word reveal: each word rises out of a blur, staggered.
 *
 * Splitting on whitespace keeps whole words intact so the line still wraps
 * naturally and screen readers read one continuous string (the source text is
 * exposed via aria-label; the animated spans are hidden from the a11y tree).
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
  const words = text.split(/(\s+)/); // keep separators so spacing survives

  return (
    <Tag className={className} aria-label={text}>
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
