"use client";

import type { ReactNode } from "react";
import type { DateRange, RangePreset, RangeState } from "@/lib/capyexpense/bucket";
import { stepRange } from "@/lib/capyexpense/bucket";
import { formatRange } from "@/lib/capyexpense/format";
import { cn } from "@/lib/utils";

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

const STEPPABLE: RangePreset[] = ["day", "week", "month", "year"];

export function RangeBar({
  state,
  range,
  weekStart,
  today,
  onChange,
  trailing,
}: {
  state: RangeState;
  range: DateRange;
  weekStart: 0 | 1;
  today: string;
  onChange: (next: RangeState) => void;
  trailing?: ReactNode;
}) {
  const steppable = STEPPABLE.includes(state.preset);
  // Nothing has happened after today, so stepping forward past it is a walk
  // into empty charts. Stop at the period that contains today.
  const atPresent = range.end >= today;

  const setPreset = (preset: RangePreset) =>
    onChange({
      ...state,
      preset,
      custom:
        preset === "custom"
          ? (state.custom ?? { start: range.start, end: range.end })
          : state.custom,
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/*
        aria-pressed buttons, NOT a tablist. A tablist promises separate panels
        you can arrow between; this is a filter over one panel.
      */}
      <div role="group" aria-label="date range" className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const active = state.preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={active}
              onClick={() => setPreset(p.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                active
                  ? // Dark ink on sage, never white — WCAG invariant.
                    "bg-primary text-[var(--primary-foreground)]"
                  : "border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {steppable ? (
        <div className="ml-1 flex items-center gap-1">
          <button
            type="button"
            aria-label={`previous ${state.preset}`}
            onClick={() => onChange(stepRange(state, -1, weekStart))}
            className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            ←
          </button>
          <span className="min-w-[14ch] text-center font-mono text-[11px] text-foreground">
            {formatRange(range)}
          </span>
          <button
            type="button"
            aria-label={`next ${state.preset}`}
            disabled={atPresent}
            onClick={() => onChange(stepRange(state, 1, weekStart))}
            className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      ) : null}

      {state.preset === "custom" ? (
        // Native date inputs. The platform ships a keyboard-accessible,
        // localised picker; a dependency for this would be pure cost.
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="capyexpense-from" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            From
          </label>
          <input
            id="capyexpense-from"
            type="date"
            value={state.custom?.start ?? range.start}
            max={state.custom?.end ?? range.end}
            onChange={(e) =>
              onChange({
                ...state,
                custom: { start: e.target.value, end: state.custom?.end ?? range.end },
              })
            }
            className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-foreground"
          />
          <label htmlFor="capyexpense-to" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            To
          </label>
          <input
            id="capyexpense-to"
            type="date"
            value={state.custom?.end ?? range.end}
            min={state.custom?.start ?? range.start}
            onChange={(e) =>
              onChange({
                ...state,
                custom: { start: state.custom?.start ?? range.start, end: e.target.value },
              })
            }
            className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-foreground"
          />
        </div>
      ) : null}

      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  );
}
