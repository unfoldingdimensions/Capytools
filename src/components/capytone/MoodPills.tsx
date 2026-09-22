"use client";

/**
 * Mood pills — the whole lexicon as tappable chips under family filters.
 *
 * Filter row: All + the six families. Pills below carry a 5-dot mini-swatch
 * of their anchor's blessed colors so users browse by look, not by name.
 * Membership is dual: hue-family filters and tag filters (Popping/Soft/Dusk)
 * overlap, so e.g. Diwali appears under Warm AND Popping.
 *
 * Filter state is LIFTED: the page owns it so the start-color row can react
 * to hue-family selections. `onFilterChange` is optional for standalone use.
 */

import { useMemo, useState } from "react";

import {
  anchorsForFilter,
  assignmentOf,
  FILTER_GROUPS,
  phraseOf,
  type FamilyFilter,
} from "@/lib/capytone/engine/families";
import { BOOTSTRAP_LEXICON } from "@/lib/capytone/engine/lexicon";

const ALL: FamilyFilter = "all";
export function MoodPills({
  onPick,
  filter: filterProp,
  onFilterChange,
}: {
  onPick: (mood: string) => void;
  filter?: FamilyFilter;
  onFilterChange?: (f: FamilyFilter) => void;
}) {
  const [internal, setInternal] = useState<FamilyFilter>(ALL);
  const filter = filterProp ?? internal;

  const setFilter = (f: FamilyFilter) => {
    setInternal(f);
    onFilterChange?.(f);
  };

  const ids = useMemo(() => anchorsForFilter(filter), [filter]);
  const counts = useMemo(() => {
    const map = new Map<FamilyFilter, number>();
    for (const g of [{ id: ALL }, ...FILTER_GROUPS] as { id: FamilyFilter }[]) {
      map.set(g.id, anchorsForFilter(g.id).length);
    }
    return map;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter row */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Mood families">
        <FilterPill
          active={filter === ALL}
          label="All"
          count={counts.get(ALL) ?? 0}
          onClick={() => setFilter(ALL)}
        />
        {FILTER_GROUPS.map((g) => (
          <FilterPill
            key={g.id}
            active={filter === g.id}
            label={g.label}
            blurb={g.blurb}
            range={g.range}
            count={counts.get(g.id) ?? 0}
            onClick={() => setFilter(filter === g.id ? ALL : g.id)}
          />
        ))}
      </div>

      {/* Mood pills for the selected filter */}
      <div className="flex flex-wrap gap-2" role="tabpanel" aria-label={`${filter} moods`}>
        {ids.map((id) => (
          <MoodPill key={id} id={id} onPick={onPick} />
        ))}
        {ids.length === 0 && <p className="text-sm text-muted-foreground">nothing here yet</p>}
      </div>
    </div>
  );
}


function FilterPill({
  active,
  label,
  blurb,
  range,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  blurb?: string;
  range?: [string, string];
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      title={blurb}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground"
      }`}
    >
      {range && (
        <span
          aria-hidden
          className="size-3 rounded-full border border-border"
          style={{ background: `linear-gradient(135deg, ${range[0]}, ${range[1]})` }}
        />
      )}
      {label}
      <span className={`font-mono text-[10px] ${active ? "opacity-70" : "opacity-50"}`}>
        {count}
      </span>
    </button>
  );
}

function MoodPill({ id, onPick }: { id: string; onPick: (mood: string) => void }) {
  const entry = BOOTSTRAP_LEXICON.anchors[id];
  const tags = assignmentOf(id);
  const phrase = phraseOf(id);
  return (
    <button
      type="button"
      onClick={() => onPick(phrase)}
      title={`${tags.hueFamily}${tags.tags.length ? ` · ${tags.tags.join(", ")}` : ""}`}
      className="group flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
    >
      <span aria-hidden className="flex -space-x-1">
        {entry.blessed.slice(0, 5).map((hex, i) => (
          <span
            key={i}
            className="size-3 rounded-full border border-background/60"
            style={{ backgroundColor: hex }}
          />
        ))}
      </span>
      {phrase}
    </button>
  );
}
