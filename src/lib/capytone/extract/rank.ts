/**
 * From raw colour occurrences to the palette the UI shows: count, cluster,
 * cap. Frequency decides the order; CIEDE2000 decides what "the same
 * colour" means — a page written as #fe0000, #fe0001 and red is one
 * colour to eyes and one cluster here. The cluster's leader is its most
 * frequent member, and only the top PALETTE_MAX clusters are returned
 * (the plan's "top 8–12" ceiling; a small site simply returns fewer).
 *
 * Deterministic: same occurrences in, same palette out, no Math.random().
 */

import { differenceCiede2000, parse } from "culori";

import { START_COLORS } from "@/lib/capytone/engine/startColors";

import type { ColourOccurrence } from "./parse";

/** ΔE00 under which two colours are one cluster — a shade over the JND. */
export const CLUSTER_DELTA_E = 2.5;

/** The response never carries more than this many palette entries. */
export const PALETTE_MAX = 12;

export interface RankedColour {
  hex: string;
  count: number;
  source: string;
}

const deltaE00 = differenceCiede2000();

export function rankPalette(entries: readonly ColourOccurrence[]): RankedColour[] {
  const counts = new Map<string, { count: number; source: string }>();
  for (const { hex, source } of entries) {
    const known = counts.get(hex);
    if (known) {
      known.count += 1;
    } else {
      counts.set(hex, { count: 1, source });
    }
  }
  return rankCounts(counts);
}

/**
 * The clustering half of `rankPalette`, for callers that already hold counts
 * (the image mode counts pixels in buckets, never as one entry per pixel).
 * `clusterDeltaE` defaults to CLUSTER_DELTA_E — the page palette's meaning of
 * "the same colour".
 */
export function rankCounts(
  counts: ReadonlyMap<string, { count: number; source: string }>,
  clusterDeltaE: number = CLUSTER_DELTA_E,
): RankedColour[] {
  // Most frequent first; ties break on hex so the order is total.
  const byCount = [...counts.entries()].sort(([hexA, a], [hexB, b]) =>
    b.count - a.count || (hexA < hexB ? -1 : hexA > hexB ? 1 : 0),
  );

  // Greedy leader clustering: each colour joins the first cluster whose
  // leader is within ΔE00, else founds its own. Leaders never change, so
  // the result is stable under input permutation (after the sort above).
  // Leaders are parsed once, here, not once per comparison.
  const clusters: RankedColour[] = [];
  const leaders: NonNullable<ReturnType<typeof parse>>[] = [];
  for (const [hex, { count, source }] of byCount) {
    const colour = parse(hex);
    if (!colour) continue; // unreachable — hexes are normalised upstream
    const home = leaders.findIndex((leader) => deltaE00(leader, colour) <= clusterDeltaE);
    if (home >= 0) {
      clusters[home].count += count;
    } else {
      clusters.push({ hex, count, source });
      leaders.push(colour);
    }
  }
  // Merging changes a cluster's weight, so rank again by the merged count
  // (Array.sort is stable: ties keep leader order).
  return clusters.sort((a, b) => b.count - a.count).slice(0, PALETTE_MAX);
}

/**
 * The bridge from an extracted hex to the Feel mode's stop-command flow:
 * the mood engine's "start from …" matches curated stop phrases only, so a
 * swatch deep-jumps by naming the visually nearest stop (CIEDE2000 over all
 * 30). The button says the stop's phrase, never the extracted hex, so the
 * palette that appears is the one the label promised.
 */
export function nearestStartStop(hex: string): { phrase: string; hex: string } | null {
  const colour = parse(hex);
  if (!colour) return null;
  let best: { phrase: string; hex: string } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const family of Object.values(START_COLORS)) {
    for (const stop of family.stops) {
      const stopColour = parse(stop.hex);
      if (!stopColour) continue;
      const distance = deltaE00(colour, stopColour);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { phrase: stop.phrase, hex: stop.hex };
      }
    }
  }
  return best;
}
