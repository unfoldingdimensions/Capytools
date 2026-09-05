"use client";

import type { DashboardModel } from "@/lib/capyexpense/aggregate";
import { formatCompact, formatDay, formatMoney, pluralDays } from "@/lib/capyexpense/format";
import { BURN, buildBurn } from "@/lib/capyexpense/geometry/burn";
import { SPARK } from "@/lib/capytools/sparkline";
import { EmptyBody } from "./primitives";
import { useMeasuredWidth } from "./use-measured-width";

export function CumulativeBurn({
  model,
  previousLabel,
  width,
  height = 220,
}: {
  model: DashboardModel;
  /** What to call the earlier period, e.g. "February" or "2025". */
  previousLabel: string;
  width?: number;
  height?: number;
}) {
  const [ref, measured] = useMeasuredWidth();
  const w = width ?? measured;
  const { burn, currency, windows, range } = model;
  const locale = undefined;
  const money = (n: number) => formatMoney(n, currency, locale);

  /**
   * A previous window that holds no rows is not a comparison. Drawing it anyway
   * puts a flat zero line across the full width, which reads as an axis rule,
   * under a caption claiming a real £0 figure.
   */
  const comparable = Boolean(windows.previous) && burn.previousHasData;

  const g = buildBurn(
    burn.current,
    comparable ? burn.previous : [],
    { periodDays: burn.periodDays, elapsed: burn.elapsed, partial: windows.partial },
    w,
    height,
  );

  const spentSoFar = burn.current.length ? burn.current[burn.current.length - 1] : 0;
  const finished = burn.previousTotal;

  if (spentSoFar === 0 && !comparable) {
    return <EmptyBody title="Nothing spent in this period yet." />;
  }

  // The best state in the app: with nothing spent yet, the ghost alone carries
  // more information than the chart would.
  if (spentSoFar === 0 && comparable && finished !== null && finished > 0) {
    return (
      <EmptyBody
        title="Nothing yet this period."
        body={`By this day in ${previousLabel} you'd spent ${money(
          burn.previous[Math.max(0, burn.elapsed - 1)] ?? 0,
        )}.`}
      />
    );
  }

  const axisY = height - BURN.padBottom;

  return (
    <div ref={width ? undefined : ref}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={
          comparable
            ? `Cumulative spend. ${money(spentSoFar)} so far against ${money(
                model.spendDelta.previous ?? 0,
              )} by the same point in ${previousLabel}${
                finished !== null ? `. ${previousLabel} finished at ${money(finished)}` : ""
              }.`
            : `Cumulative spend, ${money(spentSoFar)} so far. No earlier period to compare against.`
        }
        className="block overflow-visible"
      >
        {/* Baseline. Drawn once, so a ghost series can never be mistaken for it. */}
        <line x1={0} y1={axisY} x2={w - BURN.padR} y2={axisY} stroke="var(--border)" strokeWidth={1} />

        {g.max > 0 ? (
          <text
            x={0}
            y={BURN.padTop - 8}
            className="fill-[var(--muted-foreground)] font-mono text-[9px]"
          >
            {formatCompact(g.max, currency, locale)}
          </text>
        ) : null}

        {g.todayX !== null ? (
          <line
            x1={g.todayX}
            y1={BURN.padTop - 4}
            x2={g.todayX}
            y2={axisY}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ) : null}

        {comparable ? (
          <>
            <path
              d={g.previousSolidPath}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={BURN.previousWidth}
              strokeOpacity={BURN.solidGhostOpacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={g.previousTailPath}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={BURN.previousWidth}
              strokeOpacity={BURN.tailGhostOpacity}
              strokeDasharray={BURN.ghostDash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}

        <path
          d={g.currentPath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={BURN.currentWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {g.end ? (
          <>
            <circle cx={g.end.x} cy={g.end.y} r={SPARK.halo} fill="var(--clay)" fillOpacity={SPARK.haloOpacity} />
            <circle cx={g.end.x} cy={g.end.y} r={SPARK.core} fill="var(--clay)" />
            <text
              x={Math.min(w - 2, g.end.x + 10)}
              y={g.end.y + 4}
              className="fill-[var(--foreground)] font-mono text-[10px]"
            >
              {money(spentSoFar)}
            </text>
          </>
        ) : null}

        {comparable && g.ghostEnd && g.previousTailPath && finished !== null ? (
          <text
            x={Math.min(w - 2, g.ghostEnd.x + 8)}
            y={g.ghostEnd.y + 4}
            className="fill-[var(--muted-foreground)] font-mono text-[9px]"
          >
            {money(finished)}
          </text>
        ) : null}

        {/* Dates, so a year-long line is anchored to something. */}
        <text x={0} y={height - 5} className="fill-[var(--muted-foreground)] font-mono text-[9px]">
          {formatDay(range.start)}
        </text>
        <text
          x={w - BURN.padR}
          y={height - 5}
          textAnchor="end"
          className="fill-[var(--muted-foreground)] font-mono text-[9px]"
        >
          {formatDay(range.end)}
        </text>
      </svg>

      <p className="mt-3 text-sm text-muted-foreground">
        {comparable ? (
          <>
            <span className="text-foreground">{money(spentSoFar)}</span> so far, against{" "}
            {money(model.spendDelta.previous ?? 0)} by the same point in {previousLabel}.
            {finished !== null && windows.partial ? ` ${previousLabel} finished at ${money(finished)}.` : ""}
            {burn.previousPeriodDays > 0 && burn.previousPeriodDays < burn.periodDays
              ? ` ${previousLabel} was ${pluralDays(burn.previousPeriodDays)}.`
              : ""}
          </>
        ) : (
          <>
            <span className="text-foreground">{money(spentSoFar)}</span> so far. There&rsquo;s no
            earlier data to compare against yet — this becomes a comparison once the workbook covers
            an earlier period.
          </>
        )}
      </p>
    </div>
  );
}
