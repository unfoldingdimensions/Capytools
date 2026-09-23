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
 * Under `prefers-reduced-motion` the words settle at once — no blur, no rise
 * — so the head of every tool page is static for a reader who asked for
 * stillness. The server cannot know the motion preference, so it always renders the
 * starting state; rendering different markup for reduced motion on the client
 * is a hydration mismatch React does not patch (it stranded the landing at
 * opacity 0). One tree for everyone: reduced motion only zeroes the transition
 * here, and the `[data-reveal]` rule in globals.css shows the finished state.
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
              data-reveal=""
              // Blur and rise, no fade — see Reveal.tsx. A blurred word still
              // counts as painted; a transparent one does not, and this is the
              // h1 that LCP was waiting on.
              initial={{ y: "0.35em", filter: "blur(6px)" }}
              animate={{ y: "0em", filter: "blur(0px)" }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      duration: dur.heroReveal / 1000,
                      delay: delay + (i * stagger) / 1000,
                      ease: ease.slowOut,
                    }
              }
            >
              {word}
            </motion.span>
          );
        })}
      </span>
    </Tag>
  );
}
