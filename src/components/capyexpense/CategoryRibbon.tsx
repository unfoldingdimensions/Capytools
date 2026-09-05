"use client";

import type { Slice } from "@/lib/capyexpense/aggregate";
import { formatMoney, formatPct } from "@/lib/capyexpense/format";
import { OTHER_KEY, RIBBON, buildRibbon } from "@/lib/capyexpense/geometry/ribbon";
import { EmptyBody } from "./primitives";
import { useMeasuredWidth } from "./use-measured-width";

/** Categorical series only. `--gold` appears nowhere: nothing here is a milestone. */
const TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const toneOf = (tone: number) => (tone < 0 ? "var(--muted-foreground)" : TONES[tone % TONES.length]);

export function CategoryRibbon({
  slices,
  currency,
  locale,
  width,
}: {
  slices: Slice[];
  currency: string;
  locale?: string;
  width?: number;
}) {
  const [ref, measured] = useMeasuredWidth();
  const w = width ?? measured;
  const segments = buildRibbon(slices, w);

  if (segments.length === 0) {
    return (
      <EmptyBody
        title="Nothing to divide up yet."
        body="Once there are a few rows, this shows where the money actually went."
      />
    );
  }

  return (
    <div ref={width ? undefined : ref}>
      {/*
        The ribbon is decoration; the list below is the accessible representation
        and the better one — you can read exact numbers off it.
      */}
      <svg
        viewBox={`0 0 ${w} ${RIBBON.height}`}
        width="100%"
        height={RIBBON.height}
        aria-hidden
        className="block"
      >
        <defs>
          <clipPath id="capyexpense-ribbon-clip">
            <rect x="0" y="0" width={w} height={RIBBON.height} rx={RIBBON.radius} />
          </clipPath>
        </defs>
        {/*
          One clip path over plain rects. Per-segment rx would round the interior
          joins too, and the bar would read as a row of separate pills.
        */}
        <g clipPath="url(#capyexpense-ribbon-clip)">
          {segments.map((s) => (
            <rect
              key={s.key}
              x={s.x}
              y={0}
              width={s.width}
              height={RIBBON.height}
              fill={toneOf(s.tone)}
              fillOpacity={s.tone < 0 ? 0.35 : 1}
            />
          ))}
        </g>
      </svg>

      <dl className="mt-4 space-y-2.5">
        {segments.map((s) => (
          <div key={s.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: toneOf(s.tone), opacity: s.tone < 0 ? 0.35 : 1 }}
              aria-hidden
            />
            <dt className="truncate text-sm text-foreground">
              {s.key === OTHER_KEY ? "Everything else" : s.label}
            </dt>
            <dd className="flex items-baseline gap-2.5 font-mono text-xs tabular-nums">
              <span className="text-muted-foreground">{formatPct(s.share, locale)}</span>
              <span className="min-w-[5.5ch] text-right text-foreground">
                {formatMoney(s.value, currency, locale)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
