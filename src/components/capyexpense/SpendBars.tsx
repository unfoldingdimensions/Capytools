"use client";

import type { SeriesPoint } from "@/lib/capyexpense/aggregate";
import { formatDay, formatMoney } from "@/lib/capyexpense/format";
import { BARS, buildBars } from "@/lib/capyexpense/geometry/bars";
import { EmptyBody } from "./primitives";
import { useMeasuredWidth } from "./use-measured-width";

export function SpendBars({
  points,
  currency,
  locale,
  label,
  width,
  height = 200,
}: {
  points: SeriesPoint[];
  currency: string;
  locale?: string;
  /** What the x-axis covers, for the aria-label. */
  label: string;
  width?: number;
  height?: number;
}) {
  const [ref, measured] = useMeasuredWidth();
  const w = width ?? measured;
  const g = buildBars(points, w, height);

  if (points.length === 0) {
    return <EmptyBody title="Nothing in this window." />;
  }

  const total = points.reduce((s, p) => s + p.value, 0);
  const described =
    g.peak && g.max > 0
      ? `Spend by bucket, ${label}. Peak ${formatDay(g.peak.start)}, ${formatMoney(g.peak.value, currency, locale)}. Total ${formatMoney(total, currency, locale)}.`
      : `Spend by bucket, ${label}. Nothing spent.`;

  return (
    <div ref={width ? undefined : ref}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={described}
        className="block overflow-visible"
      >
        <line
          x1={0}
          y1={g.baselineY}
          x2={w}
          y2={g.baselineY}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {g.bars.map((b) =>
          b.height > 0 ? (
            <rect
              key={b.key}
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              rx={Math.min(BARS.maxRx, b.width / 2)}
              fill={b.isPeak ? "var(--clay)" : "var(--chart-1)"}
              fillOpacity={b.isPeak ? 1 : 0.85}
            >
              <title>{`${formatDay(b.start)} · ${formatMoney(b.value, currency, locale)}`}</title>
            </rect>
          ) : null,
        )}

        {/* Peak value, clamped so it cannot leave the box at either edge. */}
        {g.peak && g.max > 0 ? (
          <text
            x={Math.min(w - 4, Math.max(4, g.peak.x + g.peak.width / 2))}
            y={Math.max(10, g.peak.y - 6)}
            textAnchor={
              g.peak.x + g.peak.width / 2 < 30
                ? "start"
                : g.peak.x + g.peak.width / 2 > w - 30
                  ? "end"
                  : "middle"
            }
            className="fill-[var(--clay)] font-mono text-[10px]"
          >
            {formatMoney(g.peak.value, currency, locale)}
          </text>
        ) : null}

        {g.ticks.map((t, i) => (
          <text
            key={`${t.label}-${i}`}
            x={Math.min(w - 2, Math.max(2, t.x))}
            y={height - 6}
            textAnchor={i === 0 ? "start" : i === g.ticks.length - 1 ? "end" : "middle"}
            className="fill-[var(--muted-foreground)] font-mono text-[9px] uppercase tracking-[0.12em]"
          >
            {t.label}
          </text>
        ))}
      </svg>

      {g.max === 0 ? (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Nothing spent in this window.
        </p>
      ) : null}
    </div>
  );
}
