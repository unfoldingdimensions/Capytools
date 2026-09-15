"use client";

/**
 * Start-color stops — "start my palette from ___".
 *
 * One row per family, shown when that family's filter is active. Tapping a
 * stop writes its phrase ("warm orange") into the mood flow: the engine
 * detects stop phrases and pins the palette hue to the stop while keeping
 * every guardrail. Share URLs work unchanged since the phrase is the input.
 */

import { START_COLORS } from "@/lib/capytone/engine/startColors";
import type { FamilyFilter } from "@/lib/capytone/engine/families";

export function StartColors({
  family,
  onPick,
}: {
  family: Exclude<FamilyFilter, "all">;
  onPick: (phrase: string) => void;
}) {
  const group = START_COLORS[family];
  if (!group) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        start from
      </p>
      <div className="flex flex-wrap gap-2">
        {group.stops.map((stop) => (
          <button
            key={stop.id}
            type="button"
            onClick={() => onPick(stop.phrase)}
            title={`Generate a palette starting from ${stop.label.toLowerCase()}`}
            className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            <span
              aria-hidden
              className="size-3.5 rounded-full border border-border"
              style={{ backgroundColor: stop.hex }}
            />
            {stop.label}
          </button>
        ))}
      </div>
    </div>
  );
}
