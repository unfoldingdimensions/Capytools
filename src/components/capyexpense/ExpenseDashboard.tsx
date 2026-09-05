"use client";

import type { ReactNode } from "react";
import type { DashboardModel } from "@/lib/capyexpense/aggregate";
import type { RangeState } from "@/lib/capyexpense/bucket";
import {
  formatCount,
  formatDay,
  formatMoney,
  formatRange,
  pluralDays,
  previousPeriodLabel,
} from "@/lib/capyexpense/format";
import type { LoadProblem } from "@/lib/capyexpense/types";
import { CalendarHeatmap } from "./CalendarHeatmap";
import { CategoryRibbon } from "./CategoryRibbon";
import { CumulativeBurn } from "./CumulativeBurn";
import { RangeBar } from "./RangeBar";
import { SpendBars } from "./SpendBars";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { ChartCard, ChartDetails, EmptyBody, StatTile } from "./primitives";

/**
 * The whole dashboard, as a pure function of one `DashboardModel`.
 *
 * It receives a model and callbacks and nothing else — no source, no file
 * handles, no clock. That is what lets the identical component render against
 * the Tauri app's real workbook and against seeded demo data on the marketing
 * page, and what makes it testable with `renderToStaticMarkup`.
 */

export type Greeting = "good morning" | "good afternoon" | "good evening";

export function ExpenseDashboard({
  model,
  state,
  greeting,
  name,
  weekStart,
  today,
  locale,
  workbookLabel,
  problems = [],
  onRangeChange,
  refreshSlot,
  banner,
}: {
  model: DashboardModel;
  state: RangeState;
  /** Passed in, never derived from the clock — the demo server-renders. */
  greeting: Greeting;
  name: string;
  weekStart: 0 | 1;
  today: string;
  locale?: string;
  workbookLabel?: string;
  problems?: LoadProblem[];
  onRangeChange: (next: RangeState) => void;
  refreshSlot?: ReactNode;
  banner?: ReactNode;
}) {
  const { currency, totals, range } = model;
  const money = (n: number) => formatMoney(n, currency, locale);

  const topCategory = model.categories.find((c) => c.value > 0);
  const topType = model.types.find((t) => t.value > 0);
  const previousLabel = previousPeriodLabel(model.windows);

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          CapyExpense · tool no. 5
        </p>
        <h1 className="mt-4 font-display text-4xl font-light leading-[1.06] tracking-tight text-foreground sm:text-5xl">
          {greeting}, <em className="italic">{name}</em>.
        </h1>
        {workbookLabel ? (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{workbookLabel}</p>
        ) : null}
      </header>

      {banner}

      <RangeBar
        state={state}
        range={range}
        weekStart={weekStart}
        today={today}
        onChange={onRangeChange}
        trailing={refreshSlot}
      />

      {/*
        ONE live region for the whole dashboard. Per-tile aria-live would fire a
        dozen announcements on every range change and make the page unusable
        with a screen reader.
      */}
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {formatRange(range)} · {money(totals.spend)} across {formatCount(totals.count, locale)}{" "}
        {totals.count === 1 ? "entry" : "entries"}
      </p>

      {problems.length > 0 ? <ProblemsWell problems={problems} /> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          index="01"
          label="Total spend"
          value={money(totals.spend)}
          sub={
            model.windows.elapsedDays > 0
              ? `${money(model.perDay)} a day across ${pluralDays(model.windows.elapsedDays)} elapsed`
              : "Nothing has happened in this window yet"
          }
          delta={model.spendDelta}
          locale={locale}
        />
        <StatTile
          index="02"
          label="Top category"
          value={topCategory ? topCategory.label : "—"}
          sub={
            topCategory
              ? `${money(topCategory.value)} · ${Math.round(topCategory.share * 100)}% of the period`
              : "Nothing categorised yet"
          }
        />
        <StatTile
          index="03"
          label="Top type"
          value={topType ? topType.label : "—"}
          sub={topType ? `${money(topType.value)} · ${Math.round(topType.share * 100)}%` : undefined}
        />
        <StatTile
          index="04"
          label="No-spend days"
          value={String(model.noSpend.days)}
          sub={
            model.noSpend.longestRun > 1
              ? `Longest quiet stretch: ${pluralDays(model.noSpend.longestRun)}`
              : `Out of ${pluralDays(model.noSpend.outOf)} so far`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          index="01"
          title="This period against last"
          caption="Running totals, compared day for day, so a half-finished period never loses to a whole one."
          span={2}
        >
          <CumulativeBurn model={model} previousLabel={previousLabel} />
        </ChartCard>

        <ChartCard index="02" title="When it went">
          <SpendBars
            points={model.series}
            currency={currency}
            locale={locale}
            label={formatRange(range)}
          />
        </ChartCard>

        <ChartCard index="03" title="Where it went">
          <CategoryRibbon slices={model.categories} currency={currency} locale={locale} />
        </ChartCard>

        <ChartCard
          index="04"
          title="The quiet days"
          caption="One square per day. The pale ones are days you spent nothing."
          span={2}
          details={
            <ChartDetails
              label="The biggest days"
              rows={model.biggest.map((t) => [
                `${formatDay(t.date)} · ${t.category}${t.note ? ` · ${t.note}` : ""}`,
                money(t.amount),
              ])}
            />
          }
        >
          <CalendarHeatmap
            days={model.daily}
            weekStart={weekStart}
            noSpend={model.noSpend}
            currency={currency}
            locale={locale}
          />
        </ChartCard>

        <ChartCard
          index="05"
          title="What repeats"
          caption="Everything marked as a subscription, annualised."
          span={2}
        >
          <SubscriptionPanel subs={model.subs} now={today} currency={currency} locale={locale} />
        </ChartCard>
      </div>

      {model.empty ? (
        <EmptyBody
          title="Nothing in this window."
          body="Try a wider range, or add a few rows to the workbook and refresh."
        />
      ) : null}
    </div>
  );
}

/**
 * Rows we could not read. Never fails the whole load — the other nine hundred
 * rows still render, and this says exactly which ones to go and look at, by the
 * row number Excel shows.
 */
function ProblemsWell({ problems }: { problems: LoadProblem[] }) {
  const shown = problems.slice(0, 4);
  return (
    <div className="rounded-2xl border border-[var(--clay)]/30 bg-[var(--clay)]/10 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)]">
        {problems.length} {problems.length === 1 ? "row" : "rows"} skipped
      </p>
      <ul className="mt-2.5 space-y-1 text-sm text-foreground">
        {shown.map((p, i) => (
          <li key={`${p.file}-${p.row}-${i}`}>
            {p.sheet && p.row ? (
              <span className="font-mono text-xs text-muted-foreground">
                {p.sheet} row {p.row} ·{" "}
              </span>
            ) : null}
            {p.message}
          </li>
        ))}
      </ul>
      {problems.length > shown.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          And {problems.length - shown.length} more.
        </p>
      ) : null}
    </div>
  );
}
