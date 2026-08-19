"use client";

import { motion } from "motion/react";
import type { WrappedStats } from "@/lib/github/types";
import { formatNumber } from "@/lib/capytools/demo";
import { ease, dur } from "@/lib/capytools/motion";
import { Sparkline } from "@/components/card/Sparkline";
import { LanguageBars } from "@/components/card/LanguageBars";
import { CapyMark } from "@/components/mascot/CapyMark";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: dur.staggerGap / 1000 } },
};

const settle = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.slowOut } },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <motion.div variants={settle} className="min-w-0">
      <div className="font-display text-2xl font-medium leading-none tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-1.5 truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
    </motion.div>
  );
}

/**
 * The Cappy Wrapped share card — the heart of Capytools. Masthead / numeral /
 * sparkline / stat grid / language bars / watermark. On-page responsive
 * preview (the fixed 1200×630 + 1:1 export canvas lands in Phase 4).
 */
export function CardComposer({ stats }: { stats: WrappedStats }) {
  const year = new Date().getFullYear();
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="relative w-full overflow-hidden rounded-[20px] border border-border bg-card px-6 py-7 text-card-foreground shadow-[0_1px_2px_rgba(26,26,26,0.04),0_18px_50px_-24px_rgba(26,26,26,0.35)] sm:px-8 sm:py-8"
    >
      {/* masthead */}
      <motion.div
        variants={settle}
        className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        <span>Cappy Wrapped · {year}</span>
        <span>@{stats.username}</span>
      </motion.div>
      <motion.div variants={settle} className="mt-3 h-px w-full bg-border" />

      {/* numeral */}
      <motion.div variants={settle} className="mt-7">
        <div className="font-display text-6xl font-light leading-none tracking-tight text-foreground sm:text-[84px]">
          {formatNumber(stats.totalStars)}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          stars earned across {formatNumber(stats.totalRepos)} repos, all time
        </p>
      </motion.div>

      {/* sparkline */}
      <motion.div variants={settle} className="mt-7 h-16">
        <Sparkline data={stats.activity.dailySeries} className="h-full w-full" />
      </motion.div>

      {/* stat grid */}
      <motion.div
        variants={settle}
        className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-4"
      >
        <Stat label="Stars" value={formatNumber(stats.totalStars)} />
        <Stat label="Repos" value={formatNumber(stats.totalRepos)} />
        <Stat label="Years" value={String(stats.yearsActive)} />
        <Stat label="Activity · 90d" value={formatNumber(stats.activity.count)} />
      </motion.div>

      {/* language bars + watermark */}
      <motion.div
        variants={settle}
        className="mt-7 flex items-end justify-between gap-6 border-t border-border pt-5"
      >
        <LanguageBars languages={stats.topLanguages} className="flex-1" />
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <CapyMark className="w-8 text-foreground/45" />
          <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            made with Capytools · @Ubendev
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
