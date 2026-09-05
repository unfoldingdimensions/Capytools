"use client";

import { useMemo, useState } from "react";
import { buildDashboard } from "@/lib/capyexpense/aggregate";
import type { RangeState } from "@/lib/capyexpense/bucket";
import { dataSpanOf, resolveRange } from "@/lib/capyexpense/bucket";
import { DEFAULT_LOCALE } from "@/lib/capyexpense/format";
import { SAMPLE_CURRENCY, SAMPLE_NOW, SAMPLE_TRANSACTIONS } from "@/lib/capyexpense/sample";
import { ExpenseDashboard } from "@/components/capyexpense/ExpenseDashboard";

/**
 * The live demo on the marketing page.
 *
 * EVERYTHING HERE IS FIXED, not derived from the environment: the date, the
 * name, the greeting, the locale. This component server-renders and then
 * hydrates, and any value read from the clock or the visitor's locale would
 * differ between those two passes and throw a hydration mismatch.
 *
 * It is also the honest advert: these are the same components the desktop app
 * runs, on invented numbers.
 */

const WEEK_START = 1 as const;

export function CapyExpenseDemo() {
  const [state, setState] = useState<RangeState>({ preset: "month", anchor: SAMPLE_NOW });

  const span = useMemo(() => dataSpanOf(SAMPLE_TRANSACTIONS), []);
  const model = useMemo(() => {
    const range = resolveRange(state, { weekStart: WEEK_START, dataSpan: span });
    return buildDashboard(SAMPLE_TRANSACTIONS, range, {
      now: SAMPLE_NOW,
      weekStart: WEEK_START,
      currency: SAMPLE_CURRENCY,
    });
  }, [state, span]);

  return (
    <ExpenseDashboard
      model={model}
      state={state}
      greeting="good evening"
      name="ada"
      weekStart={WEEK_START}
      today={SAMPLE_NOW}
      locale={DEFAULT_LOCALE}
      workbookLabel="CapyExpense-demo.xlsx · a made-up year"
      onRangeChange={setState}
      banner={
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
          <span className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            demo
          </span>
          <p className="text-sm text-muted-foreground">
            a made-up year, so you can poke at it. every control works. yours reads your own
            workbook.
          </p>
        </div>
      }
    />
  );
}
