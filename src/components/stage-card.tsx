import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The house numbered stage: the card every tool page is assembled from.
 *
 * Each tool had grown its own version of this — CapyStrip's three cards,
 * CapyCreator's three, CapyImagine's two, and `ChartCard` inside the CapyExpense
 * dashboard, whose docstring called itself "the house numbered stage card"
 * while living somewhere the other four could not reach. Same surface, same
 * eyebrow, four implementations, and they had already drifted: the same label
 * was clay on three of them and muted on the fourth.
 *
 * They are all this now. The eyebrow is `text-muted-foreground` because that is
 * what DESIGN.md's `eyebrow-label` says and because clay is meant to be the
 * rare accent; the numbered stages had quietly made it the common one.
 *
 * Deliberately free of `next/*`, `motion` and storage: the CapyExpense
 * dashboard renders inside the desktop app's own Vite bundle too, and
 * `tests/capyexpense-boundaries.test.ts` fails the build if that changes.
 */
export function StageCard({
  id,
  index,
  title,
  caption,
  chips,
  marks = false,
  actions,
  footer,
  span = 1,
  ariaLive,
  className,
  children,
}: {
  /** Anchor for the scroll-into-view a tool does when a stage appears. */
  id?: string;
  /** "01" — the stage number. Omit both this and `title` for no eyebrow. */
  index?: string;
  /** "The drop" — the stage name. */
  title?: string;
  /** A sentence under the eyebrow, when the stage needs one. */
  caption?: ReactNode;
  /** Chips beside the eyebrow — state badges, counts. */
  chips?: ReactNode;
  /** Send the landing's plate crop marks down the card's corners. */
  marks?: boolean;
  /** Right-hand side of the eyebrow row: switches, buttons. */
  actions?: ReactNode;
  /** Trailing block under the body, e.g. a `<details>` table. */
  footer?: ReactNode;
  /** 1 = one cell; 2 = two on a wide grid. */
  span?: 1 | 2;
  /** Set on a stage whose contents change without a navigation. */
  ariaLive?: "polite" | "off";
  className?: string;
  children: ReactNode;
}) {
  const eyebrow = index && title ? `${index} · ${title}` : title ?? index;
  const hasHeader = Boolean(eyebrow || chips || actions);

  return (
    <section
      id={id}
      aria-live={ariaLive}
      className={cn(
        "relative flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm",
        span === 2 && "lg:col-span-2",
        id && "scroll-mt-24",
        className,
      )}
    >
      {marks ? (
        <>
          <span aria-hidden className="lp-corner lp-corner-tl" />
          <span aria-hidden className="lp-corner lp-corner-tr" />
          <span aria-hidden className="lp-corner lp-corner-bl" />
          <span aria-hidden className="lp-corner lp-corner-br" />
        </>
      ) : null}

      {hasHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {eyebrow}
              </span>
            ) : null}
            {chips}
          </div>
          {actions}
        </div>
      ) : null}

      {caption ? <p className="mt-2 text-sm text-muted-foreground">{caption}</p> : null}

      <div className={cn("flex-1", hasHeader && "mt-5")}>{children}</div>

      {footer}
    </section>
  );
}

/** The chips that sit beside a stage eyebrow or under a heading. */
export function StageChip({
  children,
  tone = "plain",
  className,
}: {
  children: ReactNode;
  tone?: "plain" | "clay" | "sage";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]",
        tone === "clay" && "border-[var(--clay)]/30 bg-[var(--clay)]/10 text-[var(--clay)]",
        tone === "sage" && "border-primary/30 bg-primary/10 text-foreground",
        tone === "plain" && "border-border bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
