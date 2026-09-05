"use client";

import type { NoSpendStats } from "@/lib/capyexpense/aggregate";
import { formatDay, formatMoney, pluralDays } from "@/lib/capyexpense/format";
import type { HeatDay } from "@/lib/capyexpense/geometry/heatmap";
import { HEAT, buildHeatmap, rampOpacity } from "@/lib/capyexpense/geometry/heatmap";
import { EmptyBody } from "./primitives";

const WEEKDAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function CalendarHeatmap({
  days,
  weekStart,
  noSpend,
  currency,
  locale,
}: {
  days: HeatDay[];
  weekStart: 0 | 1;
  noSpend: NoSpendStats;
  currency: string;
  locale?: string;
}) {
  const g = buildHeatmap(days, weekStart);

  if (g.cells.length === 0) {
    return (
      <EmptyBody
        title="no days to show yet."
        body="this fills in one square per day — the pale ones are days you spent nothing."
      />
    );
  }

  // Rotate the weekday labels so row 0 is whichever day starts the user's week.
  const labels = weekStart === 1 ? WEEKDAY_LABELS : ["sun", ...WEEKDAY_LABELS.slice(0, 6)];

  const summary =
    `${noSpend.days} no-spend ${noSpend.days === 1 ? "day" : "days"} out of ${noSpend.outOf}` +
    (noSpend.longestRun > 1 && noSpend.longestRunStart && noSpend.longestRunEnd
      ? `. longest quiet stretch ${pluralDays(noSpend.longestRun)}, ${formatDay(noSpend.longestRunStart)} to ${formatDay(noSpend.longestRunEnd)}`
      : "");

  return (
    <div>
      {/*
        Cells never shrink below HEAT.minCell — below that they are neither
        readable nor hoverable, and a "responsive" heatmap that does that is just
        a smaller unreadable heatmap. It scrolls instead.
      */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <svg
          viewBox={`0 0 ${g.width} ${g.height}`}
          width={g.width}
          height={g.height}
          role="img"
          aria-label={`daily spend. ${summary}.`}
          className="block"
          style={{ minWidth: g.width }}
        >
          {g.months.map((m) => (
            <text
              key={`${m.label}-${m.x}`}
              x={m.x}
              y={10}
              className="fill-[var(--muted-foreground)] font-mono text-[9px] uppercase tracking-[0.14em]"
            >
              {m.label}
            </text>
          ))}

          {/* Alternating rows only — seven labels at 11px is illegible. */}
          {labels.map((l, row) =>
            row % 2 === 0 ? (
              <text
                key={l}
                x={0}
                y={HEAT.padT + row * (HEAT.cell + HEAT.gap) + HEAT.cell - 2}
                className="fill-[var(--muted-foreground)] font-mono text-[8px] uppercase tracking-[0.1em]"
              >
                {l}
              </text>
            ) : null,
          )}

          {g.cells.map((c) => (
            <rect
              key={c.date}
              x={c.x}
              y={c.y}
              width={HEAT.cell}
              height={HEAT.cell}
              rx={HEAT.rx}
              // Weeks outside the selection are context, not the subject.
              opacity={c.inRange === false ? 0.4 : 1}
              // A known zero is muted WITH a border; a day that has not happened
              // is not drawn at all. Painting a quiet day pale sage would make
              // restraint look like a rounding error.
              fill={c.level === 0 ? "var(--muted)" : "var(--primary)"}
              fillOpacity={c.level === 0 ? 1 : rampOpacity(c.level, g.bands)}
              stroke={c.level === 0 ? "var(--border)" : "none"}
              strokeWidth={c.level === 0 ? 0.5 : 0}
            >
              <title>
                {c.level === 0
                  ? `${formatDay(c.date)} · no spend`
                  : `${formatDay(c.date)} · ${formatMoney(c.value, currency, locale)}`}
              </title>
            </rect>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-muted-foreground">{summary}.</p>
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>no spend</span>
          <span className="size-2.5 rounded-[2px] border border-border bg-[var(--muted)]" />
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="size-2.5 rounded-[2px] bg-[var(--primary)]"
              style={{ opacity: rampOpacity(level, 4) }}
            />
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  );
}
