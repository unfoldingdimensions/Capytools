import { byBucket } from "@/lib/capyexpense/aggregate";
import type { DateRange } from "@/lib/capyexpense/bucket";
import { addMonths, startOfMonth } from "@/lib/capyexpense/dates";
import { formatCompact } from "@/lib/capyexpense/format";
import { DEFAULT_LOCALE } from "@/lib/capyexpense/format";
import { SAMPLE_CURRENCY, SAMPLE_NOW, SAMPLE_TRANSACTIONS } from "@/lib/capyexpense/sample";

/**
 * The landing page's opening move: a year of spending drawing itself in.
 *
 * Built from the SAME seeded data the live demo uses, so the teaser is not a
 * prettier lie than the product. Animated with CSS keyframes rather than a
 * motion library: this is the first thing painted, it must not wait on
 * hydration, and it degrades to the finished chart when JavaScript never runs.
 */

const W = 760;
const H = 260;
const PAD_TOP = 28;
const PAD_BOTTOM = 34;
const PAD_X = 4;

/**
 * The TRAILING twelve months, not the calendar year.
 *
 * A calendar year ending in September leaves three empty slots on the right,
 * so the teaser reads as a chart that ran out of data. Twelve months back from
 * today fills every bar and is exactly as true.
 */
const WINDOW: DateRange = {
  start: startOfMonth(addMonths(SAMPLE_NOW, -11)),
  end: SAMPLE_NOW,
  preset: "custom",
  anchor: SAMPLE_NOW,
  grain: "month",
};
const MONTHS = byBucket(SAMPLE_TRANSACTIONS, WINDOW, 1);

const MAX = Math.max(1, ...MONTHS.map((m) => m.value));
const PLOT = H - PAD_TOP - PAD_BOTTOM;
const SLOT = (W - 2 * PAD_X) / MONTHS.length;
const BAR_W = SLOT * 0.58;

/** Cumulative line over the same buckets — the shape the dashboard's burn chart draws. */
const CUMULATIVE = MONTHS.reduce<number[]>((acc, m, i) => {
  acc.push((acc[i - 1] ?? 0) + m.value);
  return acc;
}, []);
const CUM_MAX = Math.max(1, CUMULATIVE[CUMULATIVE.length - 1]);

const linePoints = CUMULATIVE.map((v, i) => ({
  x: PAD_X + i * SLOT + SLOT / 2,
  y: PAD_TOP + PLOT - (v / CUM_MAX) * PLOT,
}));
const LINE_PATH = linePoints
  .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  .join(" ");

export function CapyExpenseHeroChart() {
  const baselineY = H - PAD_BOTTOM;

  return (
    <figure className="w-full">
      {/*
        THE RESTING STATE IS THE FINISHED CHART. The animation is layered on
        only inside the no-preference query, and nothing outside it hides
        anything.

        The obvious way round — bars at scaleY(0) with `both` fill, animating up
        — means the chart is INVISIBLE unless the animation actually runs. That
        is not hypothetical: animations are throttled in a background tab, and
        it is the same failure the site's Reveal has, where content sits at
        opacity 0 whenever requestAnimationFrame never fires. A chart that needs
        an animation to be seen is a chart that is sometimes not seen.
      */}
      <style>{`
        @keyframes capyexpense-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes capyexpense-draw { from { stroke-dashoffset: 2400; } to { stroke-dashoffset: 0; } }
        @keyframes capyexpense-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) {
          .capyexpense-bar {
            transform-box: fill-box;
            transform-origin: bottom;
            animation: capyexpense-grow 700ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
          }
          .capyexpense-line {
            stroke-dasharray: 2400;
            animation: capyexpense-draw 2200ms cubic-bezier(0.16, 1, 0.3, 1) 700ms backwards;
          }
          .capyexpense-late {
            animation: capyexpense-fade 500ms ease 2600ms backwards;
          }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`A year of spending: twelve monthly bars rising to ${formatCompact(
          CUM_MAX,
          SAMPLE_CURRENCY,
          DEFAULT_LOCALE,
        )} in total.`}
        className="block overflow-visible"
      >
        <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="var(--border)" strokeWidth={1} />

        {MONTHS.map((m, i) => {
          const h = m.value <= 0 ? 0 : Math.max(2, (m.value / MAX) * PLOT);
          return (
            <rect
              key={m.key}
              className="capyexpense-bar"
              x={PAD_X + i * SLOT + (SLOT - BAR_W) / 2}
              y={baselineY - h}
              width={BAR_W}
              height={h}
              rx={3}
              fill="var(--chart-1)"
              fillOpacity={0.55}
              style={{ animationDelay: `${i * 70}ms` }}
            />
          );
        })}

        <path
          className="capyexpense-line"
          d={LINE_PATH}
          fill="none"
          stroke="var(--water)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <g className="capyexpense-late">
          <circle cx={linePoints[linePoints.length - 1].x} cy={linePoints[linePoints.length - 1].y} r={7} fill="var(--clay)" fillOpacity={0.18} />
          <circle cx={linePoints[linePoints.length - 1].x} cy={linePoints[linePoints.length - 1].y} r={4} fill="var(--clay)" />
          <text
            x={linePoints[linePoints.length - 1].x - 6}
            y={linePoints[linePoints.length - 1].y - 12}
            textAnchor="end"
            className="fill-[var(--foreground)] font-mono text-[11px]"
          >
            {formatCompact(CUM_MAX, SAMPLE_CURRENCY, DEFAULT_LOCALE)} for the year
          </text>
        </g>

        {MONTHS.map((m, i) => (
          <text
            key={`${m.key}-label`}
            x={PAD_X + i * SLOT + SLOT / 2}
            y={H - 12}
            textAnchor="middle"
            className="fill-[var(--muted-foreground)] font-mono text-[9px] uppercase tracking-[0.12em]"
          >
            {m.label}
          </text>
        ))}
      </svg>

      <figcaption className="mt-3 text-center text-sm text-muted-foreground">
        Twelve months of spending, and the running total across them — drawn from a spreadsheet, on
        your own machine.
      </figcaption>
    </figure>
  );
}
