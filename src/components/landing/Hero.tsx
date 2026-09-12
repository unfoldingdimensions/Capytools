"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { HERO, HERO_PLATE } from "@/lib/capytools/landing";
import { ease } from "@/lib/capytools/motion";
import { ArrowUpRight } from "@/components/landing/icons";
import { TransitionLink } from "@/components/TransitionLink";

const EASE = ease.slowOut;

/**
 * The cover plate. Above the fold, so entrances are mount-triggered (the
 * whileInView machinery in ScrollReveal would fire immediately anyway);
 * headline segments rise word-group by word-group like the house TextReveal,
 * but segment-aware so the italic Fraunces words keep their styling.
 */
export function Hero() {
  const reduced = useReducedMotion();

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, ease: EASE, delay },
        };

  return (
    <section className="lp-section lp-hero" id="top">
      <div className="lp-container">
        <div className="lp-sec-rule">
          <span className="lp-roman">I.</span>
          <span className="lp-meta-grp">
            <span>Hero / Cover Plate</span>
            <span aria-hidden="true">•</span>
            <span>Capytools / Volume 01</span>
          </span>
          <span aria-hidden="true" />
        </div>
      </div>

      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <motion.span {...rise(0)}>
            <span className="lp-label">
              {HERO.label} <span className="lp-ix">{HERO.ix}</span>
            </span>
          </motion.span>

          <h1>
            {/* The emphasis words blur in with opacity+filter only — transform
                would need inline-block, which breaks the line around punctuation
                (a leading-comma orphan). */}
            {HERO.headline.map((seg, i) =>
              seg.em ? (
                <motion.em
                  key={i}
                  initial={reduced ? undefined : { opacity: 0, filter: "blur(6px)" }}
                  animate={reduced ? undefined : { opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.09 }}
                >
                  {seg.text}
                </motion.em>
              ) : (
                seg.text
              ),
            )}
            <span className="lp-dot">.</span>
          </h1>

          <motion.p className="lp-lead" {...rise(0.34)}>
            {HERO.lead}
          </motion.p>

          <motion.div className="lp-hero-actions" {...rise(0.42)}>
            <a className="lp-btn lp-btn-primary" href={HERO.primary.href}>
              {HERO.primary.label}
              <ArrowUpRight />
            </a>
            <TransitionLink className="lp-btn lp-btn-ghost" href={HERO.secondary.href}>
              {HERO.secondary.label}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 12h6M12 9v6" />
              </svg>
            </TransitionLink>
          </motion.div>

          <motion.div className="lp-hero-stats" {...rise(0.5)}>
            {HERO.stats.map((stat) => (
              <div className="lp-stat" key={stat.label}>
                <span
                  className={`lp-ring${stat.tone === "solid" ? " lp-ring-solid" : ""}${stat.tone === "clay" ? " lp-ring-clay" : ""}`}
                >
                  {stat.value}
                </span>
                <span className="lp-stat-label">
                  <b>{stat.label}</b>
                  {stat.sub}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div className="lp-hero-foot" {...rise(0.58)}>
            <span className="lp-meta">{HERO.meta}</span>
          </motion.div>
        </div>

        <motion.div
          className="lp-hero-art"
          initial={reduced ? undefined : { opacity: 0, scale: 0.96 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
        >
          <div className="lp-plate">
            <span className="lp-corner lp-corner-tl" aria-hidden="true" />
            <span className="lp-corner lp-corner-tr" aria-hidden="true" />
            <span className="lp-corner lp-corner-bl" aria-hidden="true" />
            <span className="lp-corner lp-corner-br" aria-hidden="true" />
            <Image
              src={HERO_PLATE.src}
              alt=""
              aria-hidden="true"
              width={HERO_PLATE.width}
              height={HERO_PLATE.height}
              priority
              sizes="(max-width: 880px) 100vw, 46vw"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
