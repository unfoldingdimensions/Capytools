"use client";

import { motion } from "motion/react";
import { ease, dur } from "@/lib/capytools/motion";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "done" | "failed";

export interface LoadStep {
  label: string;
  state: StepState;
  /** Filled in once known, e.g. "14 repos". */
  detail?: string;
}

/**
 * Loading state for the wrap, in the card's own mono register.
 *
 * Progress here is REAL — each line flips as its GitHub request resolves (see
 * WrappedFlow), so nothing advances on a cosmetic timer. That matters because
 * the four requests finish at very different speeds and a fake bar would lie
 * about which one is slow.
 */
export function TerminalLoader({ username, steps }: { username: string; steps: LoadStep[] }) {
  const done = steps.filter((s) => s.state === "done").length;

  return (
    <div
      className="w-full rounded-[20px] border border-border bg-card px-6 py-7 sm:px-8"
      role="status"
      aria-live="polite"
      aria-label={`Wrapping ${username}: ${done} of ${steps.length} steps complete`}
    >
      <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>wrapping @{username}</span>
        <span className="tabular-nums">
          {done}/{steps.length}
        </span>
      </div>


      <div className="mt-4 space-y-2 font-mono text-[13px]">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: dur.fade / 1000,
              delay: (i * dur.staggerGap) / 1000,
              ease: ease.slowOut,
            }}
            className="flex items-center gap-3"
          >
            <Glyph state={step.state} />
            <span
              className={cn(
                "transition-colors",
                step.state === "pending" ? "text-muted-foreground" : "text-foreground",
                step.state === "failed" && "text-destructive",
              )}
            >
              {step.label}
            </span>
            {step.detail && (
              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                {step.detail}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Determinate bar: width is the real completed fraction. */}
      <div className="mt-6 h-[3px] w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${(done / steps.length) * 100}%` }}
          transition={{ duration: dur.hover / 1000, ease: ease.gentle }}
        />
      </div>
    </div>
  );
}

function Glyph({ state }: { state: StepState }) {
  if (state === "done") return <span className="text-primary">✓</span>;
  if (state === "failed") return <span className="text-destructive">×</span>;
  return (
    <motion.span
      className="text-muted-foreground"
      animate={{ opacity: [1, 0.25, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: ease.drift }}
    >
      ·
    </motion.span>
  );
}
