import { byBucket } from "@/lib/capyexpense/aggregate";
import type { DateRange } from "@/lib/capyexpense/bucket";
import { addMonths, startOfMonth } from "@/lib/capyexpense/dates";
import { DEFAULT_LOCALE, formatCompact } from "@/lib/capyexpense/format";
import { SAMPLE_CURRENCY, SAMPLE_NOW, SAMPLE_TRANSACTIONS } from "@/lib/capyexpense/sample";

/**
 * The landing page's one authored moment: a year of spending drawing itself in.
 *
 * Built from the SAME seeded data the live demo uses, so the teaser is not a
 * prettier lie than the product. Animated in CSS rather than with a motion
 * library — this is the first thing painted and must not wait on hydration.
 */

const W = 760;
const H = 268;
const PAD_TOP = 34;
const PAD_BOTTOM = 34;
const PAD_X = 6;

/**
 * The TRAILING twelve months, not the calendar year. A calendar year ending in
 * September leaves three empty slots on the right, so the teaser reads as a
 * chart that ran out of data.
 */
const WINDOW: DateRange = {
  start: startOfMonth(addMonths(SAMPLE_NOW, -11)),
  end: SAMPLE_NOW,
  preset: "custom",
  anchor: SAMPLE_NOW,
  grain: "month",
};
const MONTHS = byBucket(SAMPLE_TRANSACTIONS, WINDOW, 1);

const TOTAL = MONTHS.reduce((s, m) => s + m.value, 0);
const MAX = Math.max(1, ...MONTHS.map((m) => m.value));
const PLOT = H - PAD_TOP - PAD_BOTTOM;
const SLOT = (W - 2 * PAD_X) / MONTHS.length;
const BAR_W = SLOT * 0.5;
const BASELINE = H - PAD_BOTTOM;

const barHeight = (v: number) => (v <= 0 ? 0 : Math.max(2, (v / MAX) * PLOT));

/**
 * The line rides the TOPS OF THE BARS rather than plotting a cumulative total.
 *
 * A running total only ever climbs, so it crosses the bars as a diagonal and
 * says nothing the bars have not already said. Tracing the monthly values gives
 * the line the same crests and troughs the bars have, and turns it into an
 * outline of the year's shape rather than a second, unrelated series.
 */
const POINTS = MONTHS.map((m, i) => ({
  x: PAD_X + i * SLOT + SLOT / 2,
  y: BASELINE - barHeight(m.value),
}));

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Catmull-Rom, with control points held inside the plot band. */
function smooth(points: readonly { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${r2(points[0].x)},${r2(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6, PAD_TOP, BASELINE);
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6, PAD_TOP, BASELINE);
    d += ` C${r2(p1.x + (p2.x - p1.x) / 3)},${r2(c1y)} ${r2(p2.x - (p2.x - p1.x) / 3)},${r2(c2y)} ${r2(p2.x)},${r2(p2.y)}`;
  }
  return d;
}

const LINE_PATH = smooth(POINTS);
const PEAK = POINTS.reduce((best, p, i) => (MONTHS[i].value > MONTHS[best].value ? i : best), 0);

/** Bars finish staggered; the line is timed to finish with the last of them. */
const BAR_MS = 620;
const BAR_STAGGER = 62;
const LINE_START = 240;
const LINE_MS = MONTHS.length * BAR_STAGGER + BAR_MS - LINE_START;

export function CapyExpenseHeroChart() {
  return (
    <figure className="w-full">
      {/*
        THE RESTING STATE IS THE FINISHED CHART. The animation is layered on only
        inside the no-preference query, and nothing outside it hides anything.
        Starting the bars at scaleY(0) with a `both` fill would make the chart
        invisible whenever the animation does not run — which is the same failure
        as content stuck at opacity 0 when requestAnimationFrame never fires.

        The line uses pathLength="1", so the dash animation is exact regardless
        of the curve's real length. Hardcoding a dasharray that overshoots is
        what makes a "drawing" line sit still and then snap into place at the end.
      */}
      <style>{`
        @keyframes capyexpense-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes capyexpense-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes capyexpense-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: no-preference) {
          .capyexpense-bar {
            transform-box: fill-box;
            transform-origin: bottom;
            animation: capyexpense-grow ${BAR_MS}ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
          }
          .capyexpense-line {
            stroke-dasharray: 1;
            animation: capyexpense-draw ${LINE_MS}ms cubic-bezier(0.33, 0, 0.25, 1) ${LINE_START}ms backwards;
          }
          .capyexpense-peak {
            transform-box: fill-box;
            transform-origin: center;
            animation: capyexpense-pop 420ms cubic-bezier(0.16, 1, 0.3, 1) ${LINE_START + LINE_MS - 120}ms backwards;
          }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Twelve months of spending, ${formatCompact(TOTAL, SAMPLE_CURRENCY, DEFAULT_LOCALE)} in total, peaking in ${MONTHS[PEAK].label}.`}
        className="block overflow-visible"
      >
        <line x1={0} y1={BASELINE} x2={W} y2={BASELINE} stroke="var(--border)" strokeWidth={1} />

        {MONTHS.map((m, i) => {
          const h = barHeight(m.value);
          return (
            <rect
              key={m.key}
              className="capyexpense-bar"
              x={PAD_X + i * SLOT + (SLOT - BAR_W) / 2}
              y={BASELINE - h}
              width={BAR_W}
              height={h}
              rx={3}
              fill="var(--chart-1)"
              fillOpacity={0.4}
              style={{ animationDelay: `${i * BAR_STAGGER}ms` }}
            />
          );
        })}

        <path
          className="capyexpense-line"
          pathLength={1}
          d={LINE_PATH}
          fill="none"
          stroke="var(--water)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <g className="capyexpense-peak">
          <circle cx={POINTS[PEAK].x} cy={POINTS[PEAK].y} r={7} fill="var(--clay)" fillOpacity={0.18} />
          <circle cx={POINTS[PEAK].x} cy={POINTS[PEAK].y} r={3.5} fill="var(--clay)" />
        </g>

        {MONTHS.map((m, i) => (
          <text
            key={`${m.key}-label`}
            x={PAD_X + i * SLOT + SLOT / 2}
            y={H - 12}
            textAnchor="middle"
            className="fill-[var(--muted-foreground)] text-[10px]"
          >
            {m.label.charAt(0) + m.label.slice(1).toLowerCase()}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export const HERO_CHART_TOTAL = formatCompact(TOTAL, SAMPLE_CURRENCY, DEFAULT_LOCALE);
export const HERO_CHART_PEAK_MONTH = MONTHS[PEAK].label;
