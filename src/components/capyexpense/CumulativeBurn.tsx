"use client";

import type { DashboardModel } from "@/lib/capyexpense/aggregate";
import { formatMoney, pluralDays } from "@/lib/capyexpense/format";
import { BURN, buildBurn } from "@/lib/capyexpense/geometry/burn";
import { SPARK } from "@/lib/capytools/sparkline";
import { EmptyBody } from "./primitives";
import { useMeasuredWidth } from "./use-measured-width";

export function CumulativeBurn({
  model,
  previousLabel,
  width,
  height = 200,
}: {
  model: DashboardModel;
  /** What to call the earlier period, e.g. "february". */
  previousLabel: string;
  width?: number;
  height?: number;
}) {
  const [ref, measured] = useMeasuredWidth();
  const w = width ?? measured;
  const { burn, currency, windows } = model;
  const locale = undefined;

  const g = buildBurn(
    burn.current,
    burn.previous,
    { periodDays: burn.periodDays, elapsed: burn.elapsed, partial: windows.partial },
    w,
    height,
  );

  const spentSoFar = burn.current.length ? burn.current[burn.current.length - 1] : 0;
  const finished = burn.previousTotal;

  // The best state in the app: with nothing spent yet, the ghost alone carries
  // more information than the chart would.
  if (spentSoFar === 0 && finished !== null && finished > 0) {
    return (
      <EmptyBody
        title="nothing yet this period."
        body={`by this day in ${previousLabel} you'd spent ${formatMoney(
          burn.previous[Math.max(0, burn.elapsed - 1)] ?? 0,
          currency,
          locale,
        )}.`}
      />
    );
  }

  if (!windows.previous) {
    return (
      <div ref={width ? undefined : ref}>
        <SingleLine g={g} w={w} height={height} model={model} />
        <p className="mt-3 text-sm text-muted-foreground">
          no earlier period to compare — this becomes a comparison next time.
        </p>
      </div>
    );
  }

  const shortTail =
    burn.previousPeriodDays > 0 && burn.previousPeriodDays < burn.periodDays
      ? `${previousLabel} was ${pluralDays(burn.previousPeriodDays)}.`
      : "";

  return (
    <div ref={width ? undefined : ref}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`cumulative spend. ${formatMoney(spentSoFar, currency, locale)} so far against ${formatMoney(
          model.spendDelta.previous ?? 0,
          currency,
          locale,
        )} by the same point in ${previousLabel}${
          finished !== null ? `. ${previousLabel} finished at ${formatMoney(finished, currency, locale)}` : ""
        }.`}
        className="block overflow-visible"
      >
        {g.todayX !== null ? (
          <line
            x1={g.todayX}
            y1={BURN.padTop - 8}
            x2={g.todayX}
            y2={height - BURN.padBottom}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ) : null}

        {/* Last period, over the same elapsed days — the like-for-like part. */}
        <path
          d={g.previousSolidPath}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={BURN.previousWidth}
          strokeOpacity={BURN.solidGhostOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Beyond today: where last period actually landed. Dashed, so it reads
            as context rather than as a claim about this one. */}
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

        <path
          d={g.currentPath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={BURN.currentWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End node reuses the sparkline's ink exactly — same visual grammar as
            CapyWrapped, no new idea needed. */}
        {g.end ? (
          <>
            <circle cx={g.end.x} cy={g.end.y} r={SPARK.halo} fill="var(--clay)" fillOpacity={SPARK.haloOpacity} />
            <circle cx={g.end.x} cy={g.end.y} r={SPARK.core} fill="var(--clay)" />
            <text
              x={Math.min(w - 2, g.end.x + 10)}
              y={g.end.y + 4}
              className="fill-[var(--foreground)] font-mono text-[10px]"
            >
              {formatMoney(spentSoFar, currency, locale)}
            </text>
          </>
        ) : null}

        {g.ghostEnd && g.previousTailPath ? (
          <text
            x={Math.min(w - 2, g.ghostEnd.x + 8)}
            y={g.ghostEnd.y + 4}
            className="fill-[var(--muted-foreground)] font-mono text-[9px]"
          >
            {finished !== null ? formatMoney(finished, currency, locale) : ""}
          </text>
        ) : null}
      </svg>

      <p className="mt-3 text-sm text-muted-foreground">
        <span className="text-foreground">{formatMoney(spentSoFar, currency, locale)}</span> so far
        {model.spendDelta.previous !== null ? (
          <> against {formatMoney(model.spendDelta.previous, currency, locale)} by the same point in {previousLabel}</>
        ) : null}
        . {finished !== null && windows.partial ? `${previousLabel} finished ${formatMoney(finished, currency, locale)}. ` : ""}
        {shortTail}
      </p>
    </div>
  );
}

function SingleLine({
  g,
  w,
  height,
  model,
}: {
  g: ReturnType<typeof buildBurn>;
  w: number;
  height: number;
  model: DashboardModel;
}) {
  const spent = model.burn.current.length ? model.burn.current[model.burn.current.length - 1] : 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={`cumulative spend, ${formatMoney(spent, model.currency)} so far.`}
      className="block overflow-visible"
    >
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
        </>
      ) : null}
    </svg>
  );
}
